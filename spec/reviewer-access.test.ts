import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";

const base = inject("baseUrl"), fixtures = inject("fixtureCookies");
const password = "Reviewer test separate passphrase!";
const ownerEmail = "fixture-student-1@anu.edu.au", ownerPassword = "Fixture-only password 2026!";
const sql = <T = Record<string, unknown>>(query: string, ...args: (string | number)[]) => {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try { return db.prepare(query).all(...args) as T[]; } finally { db.close(); }
};
const post = (path: string, fields: Record<string, string>, cookie = "", origin = base) =>
  fetch(new URL(path, base), { method: "POST", headers: { cookie, origin }, body: new URLSearchParams(fields), redirect: "manual" });
const get = (path: string, cookie = "") => fetch(new URL(path, base), { headers: { cookie }, redirect: "manual" });
const location = (r: Response) => r.headers.get("location") ?? "";
const msg = (r: Response) => new URL(location(r), base).searchParams;
const cookieOf = (r: Response) => r.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
const mailToken = (email: string) => {
  const file = createHash("sha256").update(email).digest("hex") + ".eml";
  return readFileSync(join(inject("mailDir"), file), "utf8").replace(/=\r?\n/g, "").replace(/=3D/g, "=")
    .match(/\/verify\/\?token=([a-f0-9]{64})/)![1];
};
const slot = (name: string) => String(sql("SELECT id FROM convenors WHERE name = ?", name)[0].id);
const invite = (email: string, name: string, cookie: string) => post("/api/reviewer-access", { action: "invite", email, convenorId: slot(name) }, cookie);
const session = async (email: string, pass = password) => cookieOf(await post("/api/auth/login", { email, password: pass }));
const records = (id: number) => ({
  transcript: sql("SELECT * FROM transcript WHERE student_id = ? ORDER BY id", id),
  plan: sql("SELECT * FROM study_plans WHERE student_id = ?", id),
  requests: sql("SELECT * FROM applications WHERE student_id = ? ORDER BY id", id),
  enrolments: sql("SELECT * FROM enrolments WHERE student_id = ? ORDER BY id", id),
});
const ownerName = String(sql("SELECT name FROM students WHERE id = 1")[0].name);
let owner = fixtures[ownerName];

it("keeps the invitation manager private and denies forged public role grants", async () => {
  expect(await (await get("/reviewer-access/")).text()).not.toContain("data-invitation-manager");
  expect(await (await get("/reviewer-access/", owner)).text()).toContain("data-invitation-manager");
  expect((await invite("forged@anu.edu.au", "Dual-role reviewer", "")).status).toBe(401);
  expect((await invite("forged@anu.edu.au", "Dual-role reviewer", fixtures["Tom Okoye"])).status).toBe(403);
  expect((await post("/api/auth/switch-role", { role: "reviewer", convenorId: "1" }, owner)).status).toBe(403);
  expect((await post("/api/reviewer-access", { action: "invite", email: ownerEmail, convenorId: slot("Dual-role reviewer") }, owner, "null")).status).toBe(403);
  expect(sql("SELECT * FROM reviewer_invitations WHERE invited_by IS NOT NULL")).toHaveLength(0);
});

it("adds a reviewer role to the owner's existing verified account without changing password or student data", async () => {
  const before = sql("SELECT * FROM accounts WHERE email = ?", ownerEmail)[0];
  const saved = records(Number(before.student_id));
  expect(msg(await invite(ownerEmail, "Dual-role reviewer", owner)).get("ok")).toContain("accepted");
  const token = mailToken(ownerEmail);
  expect(sql("SELECT convenor_id FROM accounts WHERE email = ?", ownerEmail)[0].convenor_id).toBeNull();
  expect((await post("/api/auth/switch-role", { role: "reviewer" }, owner)).status).toBe(403);
  const page = await get("/verify/?token=" + token);
  expect(page.headers.get("referrer-policy")).toBe("strict-origin");
  expect(new JSDOM(await page.text()).window.document.querySelector('input[name="password"]')).toBeNull();
  expect(msg(await post("/api/auth/verify", { token }, owner)).get("error")).toContain("Sign out");
  expect((await post("/api/auth/verify", { token }, "", "https://foreign.test")).status).toBe(403);
  expect(msg(await post("/api/auth/verify", { token, password: "Do not replace my saved password!" })).get("ok")).toContain("Reviewer access");
  const after = sql("SELECT * FROM accounts WHERE email = ?", ownerEmail)[0];
  expect(after).toMatchObject({ id: before.id, student_id: before.student_id, password_hash: before.password_hash, verified_at: before.verified_at });
  expect(after.convenor_id).toBe(Number(slot("Dual-role reviewer")));
  expect(records(Number(after.student_id))).toEqual(saved);
  expect((await get("/record/", owner)).status).toBe(303); // invitation rotated authority; old sessions are revoked
  expect(msg(await post("/api/auth/verify", { token })).get("error")).toContain("invalid");
  owner = await session(ownerEmail, ownerPassword);
  expect(await (await get("/record/", owner)).text()).toContain("Switch to reviewer view");
  const switched = await post("/api/auth/switch-role", { role: "reviewer" }, owner);
  expect(location(switched)).toBe("/applications/");
  const reviewer = cookieOf(switched);
  expect(reviewer).not.toBe(owner);
  expect((await get("/record/", owner)).status).toBe(303);
  expect(await (await get("/applications/", reviewer)).text()).toContain("Dual-role reviewer");
  expect(msg(await post("/api/enrol", { courseCode: "COMP6442", year: "2027", term: "S1" }, reviewer)).get("error")).toBeTruthy();
  // Active role is persisted in the session; a normal course URL cannot silently switch it.
  expect(await (await get("/courses/COMP6442/", reviewer)).text()).toContain("Switch to student view");
  owner = cookieOf(await post("/api/auth/switch-role", { role: "student" }, reviewer));
  expect(await (await get("/record/", owner)).text()).toContain(ownerName);
  expect(records(Number(after.student_id))).toEqual(saved);
});

it("supports reviewer-first accounts, resends to the same invitation, and creates one persistent student profile", async () => {
  const email = "reviewer-first@anu.edu.au";
  expect(msg(await invite(email, "Reviewer-first reviewer", owner)).get("ok")).toBeTruthy();
  const first = mailToken(email);
  const inviteId = sql("SELECT i.id FROM reviewer_invitations i JOIN accounts a ON a.id = i.account_id WHERE a.email = ?", email)[0].id;
  await post("/api/auth/resend", { email });
  const token = mailToken(email);
  expect(token).not.toBe(first);
  expect(sql("SELECT i.id FROM reviewer_invitations i JOIN accounts a ON a.id = i.account_id WHERE a.email = ?", email)).toEqual([{ id: inviteId }]);
  expect(await (await get("/verify/?token=" + token)).text()).toContain('name="password"');
  expect(msg(await post("/api/auth/verify", { token, password: "short" })).get("error")).toContain("15");
  expect(msg(await post("/api/auth/verify", { token, password })).get("ok")).toContain("Reviewer access");
  expect(msg(await post("/api/auth/verify", { token: first, password })).get("error")).toContain("invalid");
  let cookie = await session(email);
  expect(await (await get("/applications/", cookie)).text()).toContain("Create my student view");
  cookie = cookieOf(await post("/api/auth/switch-role", { role: "student" }, cookie));
  const account = sql("SELECT * FROM accounts WHERE email = ?", email)[0];
  const saved = records(Number(account.student_id));
  expect(saved.transcript).toHaveLength(10);
  expect(saved.plan).toHaveLength(1);
  expect(await (await get("/record/", cookie)).text()).toContain("Fictional academic results");
  cookie = cookieOf(await post("/api/auth/switch-role", { role: "reviewer" }, cookie));
  cookie = cookieOf(await post("/api/auth/switch-role", { role: "student" }, cookie));
  expect(records(Number(account.student_id))).toEqual(saved);
  expect((await post("/api/reviewer-access", { action: "cancel", invitationId: String(inviteId) }, cookie)).status).toBe(403);
});

it("reserves slots, cancels unused links, and recovers SMTP failure without granting access", async () => {
  const email = "cancelled-reviewer@anu.edu.au";
  await invite(email, "Cancelled reviewer", owner);
  const token = mailToken(email);
  expect(msg(await invite("slot-thief@anu.edu.au", "Cancelled reviewer", owner)).get("error")).toContain("pending invitation");
  expect(msg(await invite(email, "Failure reviewer", owner)).get("error")).toContain("Cancel");
  const id = String(sql("SELECT i.id FROM reviewer_invitations i JOIN accounts a ON a.id = i.account_id WHERE a.email = ?", email)[0].id);
  expect(msg(await post("/api/reviewer-access", { action: "cancel", invitationId: id }, owner)).get("ok")).toContain("cancelled");
  expect(msg(await post("/api/auth/verify", { token, password })).get("error")).toContain("invalid");
  expect(sql("SELECT convenor_id FROM accounts WHERE email = ?", email)[0].convenor_id).toBeNull();
  expect(msg(await invite("delivery-failure@anu.edu.au", "Failure reviewer", owner)).get("error")).toContain("could not be sent");
  expect(sql("SELECT convenor_id FROM accounts WHERE email = ?", "delivery-failure@anu.edu.au")[0].convenor_id).toBeNull();
  await post("/api/auth/resend", { email: "delivery-failure@anu.edu.au" });
  const fresh = mailToken("delivery-failure@anu.edu.au");
  expect(msg(await post("/api/auth/verify", { token: fresh, password })).get("ok")).toContain("Reviewer access");
});

async function demo(email: string) {
  const registered = await post("/api/auth/register", { mode: "demo", email, name: "Own demo reviewer", password });
  const inbox = cookieOf(registered);
  const token = (await (await get("/demo-inbox/", inbox)).text()).match(/\/verify\/\?token=([a-f0-9]{64})/)![1];
  return cookieOf(await post("/api/auth/verify", { token }, inbox));
}
async function request(cookie: string, code = "COMP8620") {
  const result = await post("/api/applications", { courseCode: code, year: "2027", term: "S2",
    reason: "exception", reviewMode: "convenor", statement: "Please review this fictional exception for my own demo." }, cookie);
  expect(location(result)).toMatch(/^\/applications\/\d+\/$/);
  return location(result).split("/")[2];
}
const decision = (cookie: string, requestId: string, approve = true, note = "Fictional evidence reviewed.", kind = "course") =>
  post("/api/reviewer-demo", { requestId, kind, decision: approve ? "approve" : "reject", note }, cookie);

it("lets a demo student decide only their own requests, labels the decision, and still requires enrolment confirmation", async () => {
  const own = await demo("own-reviewer@enrolment.test"), other = await demo("other-reviewer@enrolment.test");
  const id = await request(own), otherId = await request(other);
  const ownPage = await (await get("/reviewer-demo/", own)).text();
  expect(ownPage).toContain('data-demo-request="' + id + '"');
  expect(ownPage).not.toContain('data-demo-request="' + otherId + '"');
  expect((await decision(own, otherId)).status).toBe(404);
  expect((await decision(own, "1")).status).toBe(404); // seed request
  expect((await decision(owner, id)).status).toBe(403);
  expect((await decision("", id)).status).toBe(401);
  expect((await post("/api/reviewer-demo", { requestId: id, kind: "course", decision: "approve" }, own, "null")).status).toBe(403);
  expect((await post("/api/auth/switch-role", { role: "reviewer" }, own)).status).toBe(403);
  expect((await invite("demo-grant@anu.edu.au", "Cancelled reviewer", own)).status).toBe(403);
  expect(msg(await decision(own, id, false, "")).get("error")).toContain("Say why");
  expect(msg(await decision(own, id)).get("ok")).toContain("Demo decision saved");
  expect(sql("SELECT status, permission_code FROM applications WHERE id = ?", id)[0]).toMatchObject({ status: "approved", permission_code: expect.stringMatching(/^DEMO-REVIEW-/) });
  expect(sql("SELECT actor FROM application_events WHERE application_id = ? ORDER BY id DESC LIMIT 1", id)[0].actor).toBe("demo-reviewer");
  const enrolmentQuery = "SELECT e.id FROM enrolments e JOIN applications a ON e.student_id = a.student_id AND e.course_id = a.course_id AND e.year = a.year AND e.term = a.term WHERE a.id = ?";
  expect(sql(enrolmentQuery, id)).toHaveLength(0);
  expect(msg(await decision(own, id, false)).get("error")).toContain("already been decided");
  expect(msg(await post("/api/enrol", { courseCode: "COMP8620", year: "2027", term: "S2" }, own)).get("ok")).toBeTruthy();
  expect(sql(enrolmentQuery, id)).toHaveLength(1);
  expect(msg(await decision(other, otherId, false, "Missing fictional supporting evidence.")).get("ok")).toBeTruthy();
  expect(sql("SELECT status FROM applications WHERE id = ?", otherId)[0].status).toBe("rejected");
  // The same account's invited reviewer view sees only its assigned course queue.
  const reviewer = cookieOf(await post("/api/auth/switch-role", { role: "reviewer" }, owner));
  expect((await get("/applications/1/", reviewer)).status).toBe(404);
  owner = cookieOf(await post("/api/auth/switch-role", { role: "student" }, reviewer));
});

it("scopes demo overload review to its owner and preserves assessment, limits and explicit confirmation", async () => {
  const own = fixtures["Overload review student"], other = fixtures["Overload page student"];
  const fields = { courseCode: "COMP6442", year: "2027", term: "S1" };
  const submitted = await post("/api/overload/", { ...fields, reason: "standard", statement: "Review my fictional overload exception." }, own);
  const path = location(submitted), id = path.split("/")[2];
  expect(path).toMatch(/^\/overload\/\d+\/$/);
  const report = sql("SELECT assessment FROM overload_requests WHERE id = ?", id)[0].assessment;
  expect(msg(await decision(own, id, true, "Evidence reviewed.", "overload")).get("error")).toContain("no longer waiting");
  await post("/api" + path + "review", {}, own);
  expect((await decision(other, id, true, "Evidence reviewed.", "overload")).status).toBe(404);
  expect(msg(await decision(own, id, true, "", "overload")).get("error")).toContain("Explain");
  expect(msg(await decision(own, id, true, "Fictional exception authorised for 30 units.", "overload")).get("ok")).toBeTruthy();
  expect(sql("SELECT status, approved_limit, assessment FROM overload_requests WHERE id = ?", id)[0]).toEqual({ status: "approved", approved_limit: 30, assessment: report });
  expect(sql("SELECT actor FROM overload_events WHERE request_id = ? ORDER BY id DESC LIMIT 1", id)[0].actor).toBe("demo-reviewer");
  expect(msg(await post("/api/enrol", fields, own)).get("ok")).toBeTruthy();
  expect(msg(await decision(own, id, false, "Replay", "overload")).get("error")).toContain("no longer waiting");
});
