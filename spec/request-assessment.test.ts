import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

const base = inject("baseUrl");
const cookies = inject("fixtureCookies");
const approval = "Assessment approval student";
const decline = "Assessment decline student";
const notice = "You have a request being processed. Resending requests may slow the process.";
async function page(path: string, person: string) {
  const res = await fetch(new URL(path, base), { headers: { cookie: cookies[person] } });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
}
async function post(path: string, person: string, fields: Record<string, string>) {
  // Pending reminders belong to the optional, explicitly selected staff route.
  if (path === "/api/applications") fields = { reviewMode: "convenor", ...fields };
  const res = await fetch(new URL(path, base), {
    method: "POST", headers: { origin: base, cookie: cookies[person] },
    body: new URLSearchParams(fields), redirect: "manual",
  });
  expect(res.status).toBe(303);
  return res.headers.get("location")!;
}
async function offering(person: string) {
  const doc = await page("/courses/ENGN6627/?year=2027", person);
  const form = doc.querySelector('form[action="/api/applications"]')!;
  expect(form?.textContent).toContain("Request permission");
  const term = form.querySelector<HTMLInputElement>('input[name="term"]')!.value;
  return { courseCode: "ENGN6627", term, year: "2027" };
}
const coursePath = (fields: Record<string, string>) => `/courses/${fields.courseCode}/?year=${fields.year}&term=${fields.term}`;
async function expectReminder(path: string, person: string, id: string, present: boolean) {
  const doc = await page(path, person);
  const element = doc.querySelector(`[data-pending-request="${id}"]`);
  expect(Boolean(element), path).toBe(present);
  if (present) expect(element?.textContent).toContain(notice);
  return doc;
}

describe("assessment entry and pending-request lifecycle", () => {
  it("offers assessment beyond permission-always courses, reuses a pending request, and removes reminders on approval", async () => {
    const fields = await offering(approval);
    const path = await post("/api/applications", approval, { ...fields, statement: "Please assess my equivalent study." });
    expect(path).toMatch(/^\/applications\/\d+\/$/);
    const id = path.split("/")[2];
    const course = await expectReminder(coursePath(fields), approval, id, true);
    expect(course.querySelector('form[action="/api/applications"]')).toBeNull();
    expect(course.querySelector('form[action="/api/enrol"]')).toBeNull();
    for (const route of [path, "/applications/", "/plan/"]) await expectReminder(route, approval, id, true);
    const before = await page(path, approval);
    expect(before.querySelector('[data-check-status="unmet"]')?.textContent).toContain("Master of Engineering in Electrical Engineering");
    expect(before.querySelector('[data-source-hash]')).toBeTruthy();
    expect(before.querySelector("main")?.textContent).toContain("Sent to Dr Sam Achterberg, convenor of ENGN6627");
    const events = before.querySelectorAll(".timeline > li").length;
    const repeated = await Promise.all(["Same request", "", "Another retry"].map(statement =>
      post("/api/applications", approval, { ...fields, statement })));
    expect(repeated).toEqual([path, path, path]);
    expect((await page(path, approval)).querySelectorAll(".timeline > li")).toHaveLength(events);
    expect((await page("/applications/", approval)).querySelectorAll(`a[href="${path}"]`)).toHaveLength(1);
    expect((await page(coursePath(fields), decline)).querySelector("[data-pending-request]")).toBeNull();
    const blocked = await post("/api/enrol", approval, fields);
    expect(new URL(blocked, base).searchParams.get("error")).toContain("need a permission code");

    await post(`/api${path}decision`, "Dr Sam Achterberg", { decision: "approve", note: "Approved for this fictional test scenario." });
    for (const route of [path, coursePath(fields), "/applications/", "/plan/"]) await expectReminder(route, approval, id, false);
    const approvedCourse = await page(coursePath(fields), approval);
    expect(approvedCourse.querySelector('form[action="/api/enrol"]')).toBeTruthy();
    expect(await post("/api/applications", approval, { ...fields, statement: "Stale form after approval" })).toBe(path);
    expect((await page("/plan/", approval)).querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain(fields.courseCode);
    await post("/api/enrol", approval, fields);
    expect((await page(path, approval)).querySelector("#status-heading")?.textContent).toBe("Enrolled");
    expect((await page("/applications/", approval)).querySelector(`a.request-card[href="${path}"] .badge`)?.textContent).toBe("Enrolled");
    for (const route of ["/plan/", "/record/"]) {
      expect((await page(route, approval)).querySelector("[data-confirmed-enrolments]")?.textContent).toContain(fields.courseCode);
    }
  });

  it("removes reminders after rejection and permits a new request without rewriting the decided request", async () => {
    const fields = await offering(decline);
    const path = await post("/api/applications", decline, { ...fields, statement: "Please check whether my background qualifies." });
    const id = path.split("/")[2];
    await expectReminder(coursePath(fields), decline, id, true);
    await post(`/api${path}decision`, "Dr Sam Achterberg", { decision: "reject", note: "The supplied evidence does not establish equivalence." });
    for (const route of [path, coursePath(fields), "/applications/", "/plan/"]) await expectReminder(route, decline, id, false);
    expect((await page(path, decline)).querySelector("main")?.textContent).toContain("does not establish equivalence");
    expect((await page(coursePath(fields), decline)).querySelector('form[action="/api/applications"]')).toBeTruthy();
    const revised = await post("/api/applications", decline, { ...fields, statement: "New supporting information for a fresh assessment." });
    expect(revised).not.toBe(path);
    await expectReminder(coursePath(fields), decline, revised.split("/")[2], true);
    await expectReminder(path, decline, id, false);
  });

  it("keeps unavailable offerings closed and eligible courses on direct enrolment", async () => {
    const none = await page("/courses/COMP6490/?year=2027", approval);
    expect(none.querySelector('form[action="/api/applications"]')).toBeNull();
    const unavailable = await post("/api/applications", approval, { courseCode: "COMP6490", year: "2027", term: "S1", statement: "Not offered" });
    expect(new URL(unavailable, base).searchParams.get("error")).toContain("isn't offered");
    const ready = await page("/courses/COMP6466/?year=2027&term=S2", approval);
    expect(ready.querySelector('form[action="/api/enrol"]')).toBeTruthy();
    expect(ready.querySelector('form[action="/api/applications"]')).toBeNull();
  });

  it("keeps the exception request route for unmet prerequisites and shows no pending reminder for automatic rejection", async () => {
    const unmet = await page("/courses/COMP6242/?year=2027&term=S1", decline);
    expect(unmet.querySelector('form[action="/api/applications"]')).toBeTruthy();
    const rejected = await post("/api/applications", decline, { courseCode: "COMP8620", year: "2027", term: "S2", statement: "My complete fictional record has no base prerequisite." });
    const doc = await page(rejected, decline);
    expect(doc.querySelector("#status-heading")?.textContent).toBe("Rejected automatically");
    expect(doc.querySelector("[data-pending-request]")).toBeNull();
    expect((await page("/courses/COMP8620/?year=2027&term=S2", decline)).querySelector("[data-pending-request]")).toBeNull();
  });
});

describe("explicit requests for human judgement", () => {
  it.each([
    ["exception", "Staff exception student"],
    ["equivalent-study", "Staff equivalence student"],
    ["record-correction", "Staff correction student"],
  ])("routes %s despite a recorded incompatibility, preserving its evidence and reason", async (reason, student) => {
    const fields = { courseCode: "COMP7710", year: "2027", term: "S1", statement: "Please consider the evidence in my explanation." };
    const automatic = await post("/api/applications", student, { ...fields, reviewMode: "automatic", reason: "recorded-checks" });
    expect((await page(automatic, student)).querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
    const path = await post("/api/applications", student, { ...fields, reason, convenorId: "1" });
    const doc = await page(path, student);
    expect(doc.querySelector("#status-heading")?.textContent).toBe("With Dr Hana Okafor");
    expect(doc.querySelector('[data-check-status="unmet"]')?.textContent).toContain("COMP6710");
    expect(doc.querySelector(".timeline")?.textContent).toContain("The recorded checks are unchanged");
    expect(doc.querySelector<HTMLSelectElement>("#assessment-reason")?.value).toBe(reason);
    expect((await page("/applications/", "Dr Hana Okafor")).querySelector(`a[href="${path}"]`)).toBeTruthy();
    expect((await page("/applications/", "Dr Rowan Ellis")).querySelector(`a[href="${path}"]`)).toBeNull();
    const wrongReviewer = await post(`/api${path}decision`, "Dr Rowan Ellis", { decision: "approve", note: "Wrong reviewer" });
    expect(new URL(wrongReviewer, base).searchParams.get("error")).toContain("Only the convenor");
    const waiting = await page(path, student);
    const events = waiting.querySelectorAll(".timeline > li").length;
    expect(await post("/api/applications", student, { ...fields, reason })).toBe(path);
    expect((await page(path, student)).querySelectorAll(".timeline > li")).toHaveLength(events);
    if (reason === "exception") {
      await post(`/api${path}decision`, "Dr Hana Okafor", { decision: "approve", note: "Fictional exception for this test offering." });
      expect((await page(path, student)).querySelector("#status-heading")?.textContent).toBe("Approved");
      expect((await page("/record/", student)).querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("COMP7710");
      await post("/api/enrol", student, fields);
      expect((await page("/record/", student)).querySelector("[data-confirmed-enrolments]")?.textContent).toContain("COMP7710");
    } else if (reason === "equivalent-study") {
      const missingNote = await post(`/api${path}decision`, "Dr Hana Okafor", { decision: "reject", note: "" });
      expect(new URL(missingNote, base).searchParams.get("error")).toContain("Say why");
      await post(`/api${path}decision`, "Dr Hana Okafor", { decision: "reject", note: "The evidence does not support this exception." });
      expect((await page(path, student)).querySelector("#status-heading")?.textContent).toBe("Rejected by the convenor");
    } else {
      await post(`/api${path}assessment`, student, { reason });
      const converted = await page(path, student);
      expect(converted.querySelector("#status-heading")?.textContent).toBe("Evidence or decision needed");
      expect(converted.querySelector(".timeline")?.textContent).toContain("My record is missing or contains incorrect results");
      expect((await page("/applications/", "Dr Hana Okafor")).querySelector(`a[href="${path}"]`)).toBeNull();
    }
    expect((await page(automatic, student)).querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
  });
});
