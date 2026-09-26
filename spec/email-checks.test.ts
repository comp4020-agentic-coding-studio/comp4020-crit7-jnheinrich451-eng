import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, inject, it } from "vitest";

const base = inject("baseUrl"), password = "Separate email test passphrase!";
const post = (path: string, fields: Record<string, string> = {}, cookie = "", origin = base) => fetch(new URL(path, base), {
  method: "POST", headers: { origin, cookie }, body: new URLSearchParams(fields), redirect: "manual",
});
const get = (path: string, cookie = "") => fetch(new URL(path, base), { headers: { cookie }, redirect: "manual" });
const message = (res: Response) => decodeURIComponent(res.headers.get("location") ?? "");
const mailFile = (email: string) => join(inject("mailDir"), createHash("sha256").update(email).digest("hex") + ".eml");
function deliveredToken(email: string, route: string) {
  const mail = readFileSync(mailFile(email), "utf8").replace(/=\r?\n/g, "").replace(/=3D/g, "=");
  const token = mail.match(new RegExp(`/${route}/\\?token=([a-f0-9]{64})`))?.[1];
  if (!token) throw new Error("Expected captured email link");
  return token;
}
async function account(email: string) {
  await post("/api/auth/register", { email, password, name: "Email test student" });
  await post("/api/auth/verify", { token: deliveredToken(email, "verify") });
  return (await post("/api/auth/login", { email, password })).headers.get("set-cookie")!.split(";")[0];
}
function snapshot(email: string) {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try {
    const a = db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as { id: number; student_id: number };
    return { account: a, sessions: db.prepare("SELECT * FROM sessions WHERE account_id = ? ORDER BY token_hash").all(a.id),
      transcript: db.prepare("SELECT * FROM transcript WHERE student_id = ? ORDER BY id").all(a.student_id),
      enrolments: db.prepare("SELECT * FROM enrolments WHERE student_id = ? ORDER BY id").all(a.student_id),
      applications: db.prepare("SELECT * FROM applications WHERE student_id = ? ORDER BY id").all(a.student_id) };
  } finally { db.close(); }
}

describe("repeatable verification delivery tests", () => {
  it("sends only to the signed-in account, confirms once, persists receipt and preserves identity and academic state", async () => {
    const email = "email-check-student@anu.edu.au", cookie = await account(email);
    // New accounts get a seeded, rule-generated record, so enrol in the first
    // no-prerequisite S2 course it has not already passed.
    let enrolled = "";
    for (const courseCode of ["COMP6390", "COMP6261", "COMP6466", "COMP6361", "ENVS6025"]) {
      if (message(await post("/api/enrol", { courseCode, year: "2027", term: "S2" }, cookie)).includes(`Enrolled+in+${courseCode}`)) { enrolled = courseCode; break; }
    }
    expect(enrolled).not.toBe("");
    expect(message(await post("/api/applications", { courseCode: "COMP8830", year: "2027", term: "S2",
      statement: "Please review this fictional exception while I test email delivery.", reason: "exception", reviewMode: "convenor" }, cookie))).toMatch(/^\/applications\/\d+\//);
    const before = snapshot(email);
    expect(before.enrolments).toHaveLength(1); expect(before.applications).toHaveLength(1);
    expect((await post("/api/auth/email-test")).status).toBe(401);
    expect((await get("/account/")).status).toBe(303);
    expect((await post("/api/auth/email-test", {}, cookie, "https://unrelated.test")).status).toBe(403);
    const sent = await post("/api/auth/email-test", { email: "wrong-recipient@anu.edu.au", accountId: "1" }, cookie);
    expect(message(sent)).toContain("email+service+accepted");
    expect(existsSync(mailFile("wrong-recipient@anu.edu.au"))).toBe(false);
    const token = deliveredToken(email, "email-test");
    const page = await get(`/email-test/?token=${token}`, cookie);
    expect(page.headers.get("referrer-policy")).toBe("strict-origin");
    expect(page.headers.get("cache-control")).toBe("no-store");
    expect(await page.text()).toContain("Confirm test email receipt");
    expect(await (await get("/account/", cookie)).text()).not.toContain("Receipt confirmed");
    expect(message(await post("/api/auth/verify", { token }))).toContain("invalid+or+expired");
    expect((await post("/api/auth/email-test-confirm", { token }, cookie, "null")).status).toBe(403);
    expect(message(await post("/api/auth/email-test-confirm", { token }, cookie))).toContain("receipt+confirmed");
    expect(message(await post("/api/auth/email-test-confirm", { token }, cookie))).toContain("already+used");
    expect(await (await get("/account/", cookie)).text()).toContain("Receipt confirmed");
    expect(await (await get("/account/", cookie)).text()).toContain("Receipt confirmed");
    expect(snapshot(email)).toEqual(before);
    const db = new Database(inject("testDatabase"), { readonly: true });
    try {
      const row = db.prepare("SELECT * FROM email_checks WHERE account_id = ?").get(before.account.id) as { token_hash: string; status: string };
      expect(row.token_hash).toBe(createHash("sha256").update(token).digest("hex"));
      expect(JSON.stringify(row)).not.toContain(token);
      expect(row.status).toBe("confirmed");
    } finally { db.close(); }
    await post("/api/auth/email-test", {}, cookie);
    const next = deliveredToken(email, "email-test");
    expect(next).not.toBe(token);
    expect(message(await post("/api/auth/email-test-confirm", { token: next }))).toContain("receipt+confirmed");
    await post("/api/auth/email-test", {}, cookie);
    expect(message(await post("/api/auth/email-test", {}, cookie))).toContain("Too+many+attempts");
    expect(snapshot(email)).toEqual(before);
  });

  it("cannot turn expired, invented or registration tokens into receipt confirmations", async () => {
    for (const token of [inject("expiredEmailCheck"), inject("expiredToken"), "z".repeat(64), "a".repeat(64)]) {
      expect(message(await post("/api/auth/email-test-confirm", { token }))).toContain("invalid,+expired,+or+already+used");
    }
    const email = "email-check-unverified@anu.edu.au";
    await post("/api/auth/register", { email, password, name: "Unverified test" });
    const token = deliveredToken(email, "verify");
    expect(message(await post("/api/auth/email-test-confirm", { token }))).toContain("invalid,+expired,+or+already+used");
    expect(message(await post("/api/auth/login", { email, password }))).toContain("Verify+your+email");
    expect(message(await post("/api/auth/verify", { token }))).toContain("Email+verified");
  });

  it("records provider failure without invalidating an already verified account", async () => {
    const email = "email-check-failure@anu.edu.au", cookie = await account(email), before = snapshot(email);
    expect(message(await post("/api/auth/email-test", {}, cookie))).toContain("test+email+could+not+be+sent");
    const page = await get("/account/", cookie);
    expect(page.status).toBe(200); expect(await page.text()).toContain("Your account remains verified");
    expect(snapshot(email)).toEqual(before);
  });
});
