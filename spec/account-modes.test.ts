import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, inject, it } from "vitest";

const base = inject("baseUrl"), password = "Account modes initial passphrase!", nextPassword = "Account modes replacement passphrase!";
const post = (action: string, fields: Record<string, string> = {}, cookie = "", origin = base) => fetch(new URL(`/api/auth/${action}`, base), {
  method: "POST", headers: { origin, cookie }, body: new URLSearchParams(fields), redirect: "manual",
});
const get = (path: string, cookie = "") => fetch(new URL(path, base), { headers: { cookie }, redirect: "manual" });
const message = (res: Response) => decodeURIComponent(res.headers.get("location") ?? "");
const cookies = (res: Response) => res.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
const mailFile = (email: string) => join(inject("mailDir"), createHash("sha256").update(email).digest("hex") + ".eml");
const tokenIn = (text: string, route: string) => {
  const token = text.match(new RegExp(`/${route}/\\?token=([a-f0-9]{64})`))?.[1];
  if (!token) throw new Error(`No ${route} link`);
  return token;
};
const mailToken = (email: string, route: string) => tokenIn(readFileSync(mailFile(email), "utf8").replace(/=\r?\n/g, "").replace(/=3D/g, "="), route);
function snapshot(email: string) {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try {
    const account = db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as { id: number; student_id: number; kind: string; convenor_id: number | null; password_hash: string; verified_at: number };
    return { account, transcript: db.prepare("SELECT * FROM transcript WHERE student_id = ? ORDER BY id").all(account.student_id),
      plan: db.prepare("SELECT * FROM study_plans WHERE student_id = ?").get(account.student_id),
      enrolments: db.prepare("SELECT * FROM enrolments WHERE student_id = ? ORDER BY id").all(account.student_id),
      applications: db.prepare("SELECT * FROM applications WHERE student_id = ? ORDER BY id").all(account.student_id),
      changes: db.prepare("SELECT * FROM password_changes WHERE account_id = ? ORDER BY requested_at").all(account.id),
      inboxes: db.prepare("SELECT * FROM demo_inboxes WHERE account_id = ?").all(account.id),
      messages: db.prepare("SELECT m.* FROM demo_messages m JOIN demo_inboxes i ON i.token_hash = m.inbox_hash WHERE i.account_id = ?").all(account.id) };
  } finally { db.close(); }
}
async function realAccount(email: string) {
  expect((await post("register", { email, name: "Password tester", password })).status).toBe(303);
  const verification = mailToken(email, "verify");
  await post("verify", { token: verification });
  return { cookie: cookies(await post("login", { email, password })), verification };
}

describe("chosen demo identities and private inboxes", () => {
  it("keeps normal ANU aliases separate from user-chosen .test accounts, without SMTP or public reviewer registration", async () => {
    const demoRegister = await (await get("/register/?mode=demo")).text();
    expect(demoRegister).toContain("Choose a demo email");
    expect(demoRegister).toContain("your-choice@enrolment.test");
    expect(await (await get("/register/")).text()).toContain("ANU email alias");
    for (const email of ["u1234567@anu.edu.au", "someone@example.com", "a@enrolment.test.evil.test"]) {
      expect(message(await post("register", { mode: "demo", email, name: "Demo", password }))).toContain("ending+in+@enrolment.test");
    }
    expect((await post("register", { mode: "reviewer", email: "nobody@anu.edu.au", password })).status).toBe(400);
    const email = "chosen-by-visitor@enrolment.test";
    const registered = await post("register", { mode: "demo", email, name: "Chosen visitor", password, kind: "normal", role: "convenor", convenorId: "1" });
    let inboxCookie = cookies(registered);
    expect(registered.headers.get("location")).toContain("/demo-inbox/");
    expect(registered.headers.get("set-cookie")).toContain("HttpOnly");
    expect(existsSync(mailFile(email))).toBe(false);
    expect((await get("/record/", inboxCookie)).status).toBe(303);
    const inbox = await get("/demo-inbox/", inboxCookie);
    expect(inbox.headers.get("cache-control")).toBe("no-store");
    expect(inbox.headers.get("referrer-policy")).toBe("strict-origin");
    const token = tokenIn(await inbox.text(), "verify");
    expect(tokenIn(await (await get("/demo-inbox/", inboxCookie)).text(), "verify")).toBe(token);
    expect(await (await get(`/demo-inbox/?email=${email}&accountId=1`)).text()).not.toContain(token);
    const duplicate = await post("register", { mode: "demo", email, name: "Intruder", password: nextPassword });
    expect(duplicate.headers.get("set-cookie")).toBeNull();
    expect(message(await post("login", { mode: "demo", email, password: nextPassword }))).toContain("incorrect");
    const other = await post("register", { mode: "demo", email: "other-chosen@enrolment.test", name: "Other", password });
    expect(await (await get(`/demo-inbox/?email=${email}`, cookies(other))).text()).not.toContain(token);
    // GET and cross-site POST cannot activate the demo; normal activation and
    // password-change tokens are not interchangeable.
    expect(await (await get(`/verify/?token=${token}`, inboxCookie)).text()).toContain("Confirm &amp; enter demo");
    expect((await post("verify", { token }, inboxCookie, "https://unrelated.test")).status).toBe(403);
    expect(message(await post("password-change-confirm", { token, password: nextPassword, confirmation: nextPassword }))).toContain("invalid");
    const confirmed = await post("verify", { token }, inboxCookie);
    const session = cookies(confirmed);
    expect(confirmed.headers.get("location")).toContain("/record/");
    expect(await (await get("/record/", session)).text()).toContain("data-demo-account");
    expect(message(await post("verify", { token }))).toContain("invalid+or+expired");
    const before = snapshot(email);
    expect(before.account.kind).toBe("demo"); expect(before.account.convenor_id).toBeNull();
    expect(before.transcript).toHaveLength(10);
    expect(JSON.stringify(before)).not.toContain(token);
    expect(JSON.stringify(before)).not.toContain(inboxCookie.split("=")[1]);
    expect(message(await post("email-test", {}, session))).toContain("private+demo+inbox");
    const changed = await post("password-change", { currentPassword: password }, `${session}; ${inboxCookie}`);
    expect(changed.headers.get("location")).toContain("/demo-inbox/");
    const changeToken = tokenIn(await (await get("/demo-inbox/", inboxCookie)).text(), "change-password");
    expect(existsSync(mailFile(email))).toBe(false);
    expect(message(await post("password-change-confirm", { token: changeToken, password: nextPassword, confirmation: nextPassword }, session))).toContain("Password+changed");
    expect((await get("/record/", session)).status).toBe(303);
    expect(await (await get("/demo-inbox/", inboxCookie)).text()).not.toContain(changeToken);
    const signedIn = await post("login", { mode: "demo", email, password: nextPassword });
    inboxCookie = cookies(signedIn);
    expect((await get("/record/", inboxCookie)).status).toBe(200);
    const after = snapshot(email);
    expect(after.transcript).toEqual(before.transcript); expect(after.plan).toEqual(before.plan);
    await post("logout", {}, inboxCookie);
    expect(await (await get("/demo-inbox/", inboxCookie)).text()).toContain("No private inbox is open");
  });

  it("recovers an unconfirmed private inbox only after password authentication", async () => {
    const email = "recover-chosen@enrolment.test";
    await post("register", { mode: "demo", email, name: "Recover", password });
    const recovered = await post("login", { mode: "demo", email, password });
    expect(recovered.headers.get("location")).toBe("/demo-inbox/");
    expect(cookies(recovered)).not.toContain("enrol_session=");
    const cookie = cookies(recovered);
    const before = tokenIn(await (await get("/demo-inbox/", cookie)).text(), "verify");
    await post("demo-resend", {}, cookie);
    const fresh = tokenIn(await (await get("/demo-inbox/", cookie)).text(), "verify");
    expect(fresh).not.toBe(before);
    expect(message(await post("demo-resend", {}, cookie))).toContain("Too+many");
    expect(message(await post("demo-resend", { email }))).toContain("Sign+in");
  });
});

describe("email-confirmed password changes", () => {
  it("requires the current password and an emailed single-use link; revokes sessions and preserves the academic workflow", async () => {
    const email = "password-change@anu.edu.au", { cookie, verification } = await realAccount(email);
    const secondSession = cookies(await post("login", { email, password }));
    const coursePost = (path: string, fields: Record<string, string>) => fetch(new URL(path, base), { method: "POST", headers: { origin: base, cookie }, body: new URLSearchParams(fields), redirect: "manual" });
    expect(message(await coursePost("/api/enrol", { courseCode: "COMP8539", year: "2027", term: "S2" }))).toContain("Enrolled+in+COMP8539");
    expect(message(await coursePost("/api/applications", { courseCode: "COMP8830", year: "2027", term: "S2", statement: "Please review this fictional exception for a preservation test.", reason: "exception", reviewMode: "convenor" }))).toMatch(/^\/applications\/\d+\//);
    const before = snapshot(email);
    expect(before.enrolments).toHaveLength(1); expect(before.applications).toHaveLength(1);
    expect((await post("password-change", { currentPassword: password })).status).toBe(401);
    expect((await post("password-change", { currentPassword: password }, cookie, "null")).status).toBe(403);
    expect(message(await post("password-change", { currentPassword: "Wrong password" }, cookie))).toContain("incorrect");
    await post("password-change", { currentPassword: password, email: "wrong-recipient@anu.edu.au", accountId: "1" }, cookie);
    const token = mailToken(email, "change-password");
    expect(existsSync(mailFile("wrong-recipient@anu.edu.au"))).toBe(false);
    const page = await get(`/change-password/?token=${token}`);
    expect(page.headers.get("referrer-policy")).toBe("strict-origin"); expect(page.headers.get("cache-control")).toBe("no-store");
    expect(await page.text()).toContain("Confirm password change");
    expect(snapshot(email).account).toEqual(before.account);
    expect((await get("/record/", secondSession)).status).toBe(200);
    expect(message(await post("verify", { token }))).toContain("invalid+or+expired");
    expect(message(await post("email-test-confirm", { token }))).toContain("invalid");
    expect(message(await post("password-change-confirm", { token: verification, password: nextPassword, confirmation: nextPassword }))).toContain("invalid");
    expect(message(await post("password-change-confirm", { token, password: nextPassword, confirmation: password }))).toContain("do+not+match");
    expect((await post("password-change-confirm", { token, password: nextPassword, confirmation: nextPassword }, "", "null")).status).toBe(403);
    await post("password-change", { currentPassword: password }, cookie);
    const sibling = mailToken(email, "change-password");
    expect(sibling).not.toBe(token);
    expect(message(await post("password-change", { currentPassword: password }, cookie))).toContain("Too+many");
    expect(message(await post("password-change-confirm", { token, password: nextPassword, confirmation: nextPassword }))).toContain("Password+changed");
    for (const oldToken of [token, sibling, inject("expiredPasswordChange"), "e".repeat(64)])
      expect(message(await post("password-change-confirm", { token: oldToken, password, confirmation: password }))).toContain("invalid");
    expect((await get("/record/", cookie)).status).toBe(303); expect((await get("/record/", secondSession)).status).toBe(303);
    expect(message(await post("login", { email, password }))).toContain("incorrect");
    const loggedIn = cookies(await post("login", { email, password: nextPassword }));
    expect((await get("/record/", loggedIn)).status).toBe(200);
    const after = snapshot(email);
    expect(after.account.verified_at).toBe(before.account.verified_at);
    expect(after.account.password_hash).not.toBe(before.account.password_hash);
    for (const key of ["transcript", "plan", "enrolments", "applications"] as const) expect(after[key]).toEqual(before[key]);
    expect(after.changes).toHaveLength(2);
    expect(JSON.stringify(after.changes)).not.toContain(token);
    expect(await (await get("/demo-inbox/", loggedIn)).text()).not.toContain(token);
    expect((await post("demo-inbox-open", {}, loggedIn)).status).toBe(403);
  });

  it("records rejected mail without changing passwords or verified sessions", async () => {
    const email = "password-change-failure@anu.edu.au", { cookie } = await realAccount(email), before = snapshot(email);
    expect(message(await post("password-change", { currentPassword: password }, cookie))).toContain("email+could+not+be+sent");
    const after = snapshot(email);
    expect(after.account).toEqual(before.account); expect(after.transcript).toEqual(before.transcript);
    expect(after.changes).toMatchObject([{ status: "failed" }]);
    expect((await get("/record/", cookie)).status).toBe(200);
  });
});
