import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

const base = inject("baseUrl");
const fixtures = inject("fixtureCookies");
const password = "Separate prototype passphrase 2026!";
const post = (path: string, fields: Record<string, string>, cookie = "", origin = base) =>
  fetch(new URL(path, base), {
    method: "POST",
    headers: { origin, cookie },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });
const get = (path: string, cookie = "") =>
  fetch(new URL(path, base), { headers: { cookie }, redirect: "manual" });
const message = (res: Response) => decodeURIComponent(res.headers.get("location") ?? "");
function verification(email: string): string {
  const filename = createHash("sha256").update(email.toLowerCase()).digest("hex") + ".eml";
  const mail = readFileSync(join(inject("mailDir"), filename), "utf8")
    .replace(/=\r?\n/g, "")
    .replace(/=3D/g, "=");
  const token = mail.match(/\/verify\/\?token=([a-f0-9]{64})/)?.[1];
  if (!token) throw new Error("No verification link delivered to test SMTP inbox");
  return token;
}

describe("verified student accounts", () => {
  const email = "new-student@anu.edu.au";
  let token = "";
  let cookie = "";
  it("rejects a non-ANU domain, suffix tricks, multiple @ signs, and short passwords", async () => {
    for (const email of ["a@example.com", "a@anu.edu.au.evil.test", "a@evilanu.edu.au", "a@@anu.edu.au"]) {
      const res = await post("/api/auth/register", { email, password, name: "Student" });
      expect(message(res)).toContain("ending+exactly+in+@anu.edu.au");
    }
    expect(
      message(
        await post("/api/auth/register", { email: "short@anu.edu.au", password: "short", name: "Student" }),
      ),
    ).toContain("15–128");
  });
  it("delivers a verification link and refuses login until it is confirmed", async () => {
    const registered = await post("/api/auth/register", {
      email: " NEW-STUDENT@ANU.EDU.AU ",
      password,
      name: "New student",
      role: "convenor",
      convenorId: "1",
    });
    expect(registered.status).toBe(303);
    expect(registered.headers.get("set-cookie")).toBeNull();
    token = verification(email);
    expect(message(await post("/api/auth/login", { email, password }))).toContain("Verify+your+email");
    expect((await get(`/verify/?token=${token}`)).status).toBe(200);
    // Opening a link does not consume it (email scanners may prefetch it).
    expect(message(await post("/api/auth/login", { email, password }))).toContain("Verify+your+email");
  });
  it("keeps verification tokens out of referrers without hiding the form origin", async () => {
    const page = await get(`/verify/?token=${token}`);
    // Browser contract: strict-origin sends only the origin as Referer and
    // retains Origin on native same-origin forms. no-referrer sends Origin:
    // null for those forms, which correctly fails Astro's CSRF protection.
    expect(page.headers.get("referrer-policy")).toBe("strict-origin");
    expect(page.headers.get("cache-control")).toBe("no-store");
    for (const origin of ["null", "http://unrelated.test"]) {
      expect((await post("/api/auth/verify", { token }, "", origin)).status).toBe(403);
    }
    // Rejected requests must not consume the token or activate the account.
    expect(await (await get(`/verify/?token=${token}`)).text()).toContain("Confirm email address");
    expect(message(await post("/api/auth/login", { email, password }))).toContain("Verify+your+email");
  });
  it("confirmation works once, and expired or invented links cannot verify", async () => {
    expect(message(await post("/api/auth/verify", { token }))).toContain("Email+verified");
    expect(message(await post("/api/auth/verify", { token }))).toContain("invalid+or+expired");
    expect(message(await post("/api/auth/verify", { token: inject("expiredToken") }))).toContain(
      "invalid+or+expired",
    );
    expect(message(await post("/api/auth/verify", { token: "f".repeat(64) }))).toContain(
      "invalid+or+expired",
    );
  });
  it("signs in with an HttpOnly session and creates a labelled fictional profile", async () => {
    expect(message(await post("/api/auth/login", { email, password: "incorrect passphrase" }))).toContain(
      "incorrect",
    );
    const res = await post("/api/auth/login", { email, password });
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toContain("HttpOnly");
    expect(header.toLowerCase()).toContain("samesite=lax");
    cookie = header.split(";")[0];
    const page = await (await get("/record/", cookie)).text();
    expect(page).toContain("New student");
    expect(page).toContain("Fictional Computing");
    expect(page).toContain("COMP6442");
    expect(page).toContain("vcomp-ai-2027-s2-v1");
    const recordDb = new Database(inject("testDatabase"), { readonly: true });
    try {
      const stored = recordDb.prepare("SELECT p.* FROM study_plans p JOIN accounts a ON a.student_id = p.student_id WHERE a.email = ?").get(email) as { student_id: number; template_id: string; template_snapshot: string; planning_year: number; planning_term: string };
      expect(stored).toMatchObject({ template_id: "vcomp-ai-2027-s2-v1", planning_year: 2027, planning_term: "S2" });
      const snapshot = JSON.parse(stored.template_snapshot);
      expect(snapshot.s1State).toBe("completed");
      expect(recordDb.prepare("SELECT SUM(units) AS units, COUNT(mark) AS marks FROM transcript WHERE student_id = ?").get(stored.student_id)).toEqual({ units: 60, marks: 10 });
    } finally { recordDb.close(); }
    expect(
      (await post("/api/applications/1/decision", { decision: "approve" }, cookie)).headers.get("location"),
    ).toContain("Only");
    const ownQueue = await (await get("/applications/", cookie)).text();
    expect(ownQueue).not.toContain("Olivia Park");
  });
  it("stores salted hashes and keeps verification/session secrets out of the database", () => {
    const db = new Database(inject("testDatabase"), { readonly: true });
    try {
      const account = db.prepare("SELECT * FROM accounts WHERE email = ?").get(email) as Record<
        string,
        unknown
      >;
      expect(account.password_hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
      expect(account.password_hash).not.toContain(password);
      expect(account.convenor_id).toBeNull();
      expect(account.student_id).toBeTypeOf("number");
      const rawSession = cookie.split("=")[1];
      expect(db.prepare("SELECT 1 FROM sessions WHERE token_hash = ?").get(rawSession)).toBeUndefined();
      expect(db.prepare("SELECT 1 FROM email_tokens WHERE token_hash = ?").get(token)).toBeUndefined();
    } finally {
      db.close();
    }
  });
  it("preserves profile and selections across reloads and sign-ins", async () => {
    const course = new JSDOM(await (await get("/courses/COMP6528/?term=S1", cookie)).text()).window.document;
    const id = course.querySelector<HTMLInputElement>('input[name="offeringId"]')!.value;
    await post("/api/selections", { action: "add", offeringId: id }, cookie);
    await post("/api/selections", { action: "add", offeringId: id }, cookie);
    const plan = new JSDOM(await (await get("/plan/", cookie)).text()).window.document;
    expect(plan.querySelectorAll(".plan-row").length).toBe(1);
    expect(plan.querySelector("main")?.textContent).toContain("COMP6528");
    const other = await (await get("/plan/", fixtures["Tom Okoye"])).text();
    expect(other).not.toContain("Computer Vision");
    await post("/api/auth/logout", {}, cookie);
    expect((await get("/record/", cookie)).status).toBe(303);
    cookie = (await post("/api/auth/login", { email, password })).headers.get("set-cookie")!.split(";")[0];
    expect(await (await get("/plan/", cookie)).text()).toContain("Computer Vision");
    expect(await (await get("/record/", cookie)).text()).toContain("COMP6442");
  });
  it("never exposes someone else's application or private live stream", async () => {
    expect((await get("/applications/1/", cookie)).status).toBe(404);
    expect((await get("/api/events")).status).toBe(401);
    expect((await get("/record/", `enrol_session=${inject("expiredSession")}`)).status).toBe(303);
    expect((await get("/record/", "as=c:1")).status).toBe(303);
    expect((await post("/api/auth/logout", {}, cookie, "https://unrelated.test")).status).toBe(403);
  });
});

describe("reviewer invitations", () => {
  it("requires the emailed invitation and a password to activate a reviewer account", async () => {
    const token = verification("invited-reviewer@anu.edu.au");
    const invitationPage = await get(`/verify/?token=${token}`);
    expect(invitationPage.headers.get("referrer-policy")).toBe("strict-origin");
    expect(await invitationPage.text()).toContain("invited reviewer");
    const studentLogin = await post("/api/auth/login", { email: "new-student@anu.edu.au", password });
    const studentCookie = studentLogin.headers.get("set-cookie")!.split(";")[0];
    for (const signedIn of [studentCookie, fixtures["Dr Rowan Ellis"]]) {
      const switchPage = await get(`/verify/?token=${token}`, signedIn);
      const doc = new JSDOM(await switchPage.text()).window.document;
      expect(doc.querySelector("[data-account-switch]")?.textContent).toContain("Sign out and continue");
      expect(doc.querySelector('form[action="/api/auth/verify"]')).toBeNull();
      expect(message(await post("/api/auth/verify", { token, password }, signedIn))).toContain("Sign+out+of+your+current+account");
    }
    expect((await get("/record/", studentCookie)).status).toBe(200);
    const expiredWhileSignedIn = new JSDOM(await (await get("/verify/?token=expired", studentCookie)).text()).window.document;
    expect(expiredWhileSignedIn.querySelector("[data-current-session]")?.textContent).toContain("Sign out to use another account");
    expect(expiredWhileSignedIn.querySelector('form[action="/api/auth/verify"]')).toBeNull();
    expect(message(await post("/api/auth/login", { email: "invited-reviewer@anu.edu.au", password }))).toContain("Email+or+password+is+incorrect");
    expect((await post("/api/auth/logout", { verificationToken: token }, studentCookie, "https://unrelated.test")).status).toBe(403);
    const signedOut = await post("/api/auth/logout", { verificationToken: token, returnTo: "https://unrelated.test" }, studentCookie);
    expect(signedOut.headers.get("location")).toBe(`/verify/?token=${token}`);
    expect((await get("/record/", studentCookie)).status).toBe(303);
    expect(await (await get(signedOut.headers.get("location")!)).text()).toContain("invited reviewer");
    expect(message(await post("/api/auth/verify", { token, password: "short" }))).toContain("15–128");
    expect(message(await post("/api/auth/verify", { token, password }))).toContain("Email+verified");
    const session = await post("/api/auth/login", { email: "invited-reviewer@anu.edu.au", password });
    expect(session.headers.get("location")).toBe("/applications/");
    const cookie = session.headers.get("set-cookie")!.split(";")[0];
    const page = await (await get("/applications/", cookie)).text();
    expect(page).toContain("Invitation test reviewer");
    expect(page).not.toContain("Olivia Park");
    expect((await post("/api/selections", { action: "add", offeringId: "1" }, cookie)).status).toBe(403);
  });

  it("lets reviewers browse and search the catalogue without returning to their queue", async () => {
    const cookie = fixtures["Dr Hana Okafor"];
    const queue = new JSDOM(await (await get("/applications/", cookie)).text()).window.document;
    const catalogueLink = [...queue.querySelectorAll("nav a")].find(a => a.textContent?.trim() === "Course catalogue")!;
    const response = await get(catalogueLink.getAttribute("href")!, cookie);
    expect(response.status).toBe(200);
    const catalogue = new JSDOM(await response.text()).window.document;
    expect(catalogue.querySelector("h1")?.textContent).toBe("Course catalogue");
    const search = await get("/?q=7710&year=2027", cookie);
    expect(search.status).toBe(200);
    expect(await search.text()).toContain("COMP7710");
    const course = new JSDOM(await (await get("/courses/COMP7710/?year=2027", cookie)).text()).window.document;
    expect(course.querySelector("main")?.textContent).toContain("Reviewer view");
    expect(course.querySelector('form[action="/api/applications"]')).toBeNull();
    expect(queue.querySelector("[data-assigned-courses]")?.textContent).toContain("COMP7710");
    expect(queue.querySelector("[data-assigned-courses]")?.textContent).not.toContain("COMP8620");
    // A separate reviewer fixture has no courses or requests, regardless of parallel tests.
    const emptyLogin = await post("/api/auth/login", { email: "invited-reviewer@anu.edu.au", password });
    const emptyCookie = emptyLogin.headers.get("set-cookie")!.split(";")[0];
    const emptyQueue = await (await get("/applications/", emptyCookie)).text();
    expect(emptyQueue).toContain("Automatic demo assessments do not enter this queue");
    expect(emptyQueue).toContain("Nothing is waiting for you");
  });
});

describe("authentication failure handling", () => {
  it("keeps failed-delivery accounts unverified and supports a successful resend", async () => {
    const email = "delivery-failure@anu.edu.au";
    expect(message(await post("/api/auth/register", { email, password, name: "Delivery test" }))).toContain(
      "could+not+be+sent",
    );
    expect(message(await post("/api/auth/login", { email, password }))).toContain("Verify+your+email");
    expect(message(await post("/api/auth/resend", { email }))).toContain("verification+email+has+been+sent");
    expect(message(await post("/api/auth/verify", { token: verification(email) }))).toContain(
      "Email+verified",
    );
  });
  it("duplicate registration cannot overwrite an account, password, or profile", async () => {
    await post("/api/auth/register", {
      email: "new-student@anu.edu.au",
      password: "An attacker new password!",
      name: "Changed name",
      role: "convenor",
    });
    const res = await post("/api/auth/login", { email: "new-student@anu.edu.au", password });
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    const profile = await (await get("/record/", cookie)).text();
    expect(profile).toContain("New student");
    expect(profile).not.toContain("Changed name");
  });
  it("limits repeated login attempts and rejects CSRF without an Origin", async () => {
    for (let n = 0; n < 8; n++) await post("/api/auth/login", { email: "rate-test@anu.edu.au", password });
    expect(message(await post("/api/auth/login", { email: "rate-test@anu.edu.au", password }))).toContain(
      "Too+many+attempts",
    );
    const res = await fetch(new URL("/api/auth/register", base), {
      method: "POST",
      body: new URLSearchParams({ email: "csrf@anu.edu.au", password, name: "CSRF" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("search and offering boundaries", () => {
  it("preserves a historical approval without granting permission for 2027", async () => {
    const student = fixtures["Historical approval student"];
    expect(await (await get("/courses/COMP6240/?year=2026&term=S1", student)).text()).toContain("Permission approved");
    const wrongYear = await post("/api/enrol", { courseCode: "COMP6240", year: "2027", term: "S1" }, student);
    expect(message(wrongYear)).toContain("need+a+permission+code");
    const historical = await post("/api/enrol", { courseCode: "COMP6240", year: "2026", term: "S1" }, student);
    expect(message(historical)).toContain("with+your+permission+code");
    expect(await (await get("/record/", student)).text()).toContain("2026 First Semester");
  });
  it("accepts spaced and numeric codes without confusing subjects", async () => {
    const all = await (await get("/?q=6528&term=")).text();
    expect(all).toContain("COMP6528");
    expect(all).toContain("ENGN6528");
    const comp = await (await get("/?q=6528&subject=COMP&term=")).text();
    expect(comp).toContain("COMP6528");
    expect(comp).not.toContain("ENGN6528");
    expect(await (await get("/?q=COMP%206528&term=")).text()).toContain("Computer Vision");
    expect(await (await get("/?q=COMP6528&term=S2")).text()).toContain("No matching courses");
  });
  it("an approval is valid only for its requested year and term", async () => {
    const student = fixtures["Offering test student"];
    const req = await post(
      "/api/applications",
      {
        courseCode: "COMP6240",
        term: "S1",
        statement: "Please review this fictional scenario",
        reviewMode: "convenor",
        dispute: "yes",
      },
      student,
    );
    const path = req.headers.get("location")!;
    expect(path).toMatch(/^\/applications\/\d+\/$/);
    await post(
      `/api${path}decision`,
      { decision: "approve", note: "This offering only" },
      fixtures["Dr Leo Brandt"],
    );
    expect(await (await get(path, student)).text()).toContain("2027 First Semester");
    const wrongYear = await post("/api/enrol", { courseCode: "COMP6240", term: "S1", year: "2026" }, student);
    expect(message(wrongYear)).toContain("need+a+permission+code");
    const wrongTerm = await post("/api/enrol", { courseCode: "COMP6240", term: "S2", year: "2027" }, student);
    expect(message(wrongTerm)).toContain("need+a+permission+code");
    const rightTerm = await post("/api/enrol", { courseCode: "COMP6240", term: "S1", year: "2027" }, student);
    expect(message(rightTerm)).toContain("with+your+permission+code");
    expect(await (await get("/record/", student)).text()).toContain("2027 First Semester");
  });
});
