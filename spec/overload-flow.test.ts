import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";

const base = inject("baseUrl"), cookies = inject("fixtureCookies");
const fields = { courseCode: "COMP6442", year: "2027", term: "S1" };
const query = "/courses/COMP6442/?year=2027&term=S1";
async function page(path: string, person: string) {
  const response = await fetch(new URL(path, base), { headers: { cookie: cookies[person] } });
  expect(response.status).toBe(200);
  return new JSDOM(await response.text()).window.document;
}
async function post(path: string, person: string, values: Record<string, string> = {}) {
  const response = await fetch(new URL(path, base), { method: "POST", headers: { cookie: cookies[person], origin: base }, body: new URLSearchParams(values), redirect: "manual" });
  expect(response.status).toBe(303);
  return response.headers.get("location")!;
}
const error = (path: string) => new URL(path, base).searchParams.get("error");
function saved(path: string) {
  const database = new Database(inject("testDatabase"), { readonly: true });
  try { return database.prepare("SELECT assessment, approved_limit, status FROM overload_requests WHERE id = ?").get(Number(path.split("/")[2])) as { assessment: string; approved_limit: number | null; status: string }; }
  finally { database.close(); }
}

it("blocks the fifth six-unit course, persists an unknown report, and needs explicit human review and confirmation", async () => {
  const student = "Overload review student";
  const doc = await page(query, student);
  expect(doc.querySelector('[data-study-load="approval-required"]')?.textContent).toContain("30 units");
  expect(doc.querySelector('form[action="/api/enrol"]')).toBeNull();
  expect(error(await post("/api/enrol", student, { ...fields, approvedLimit: "36", overloadRequestId: "1" }))).toContain("24-unit limit");
  const path = await post("/api/overload/", student, { ...fields, reason: "standard", statement: "Please assess my fictional load." });
  expect(path).toMatch(/^\/overload\/\d+\/$/);
  const original = saved(path).assessment;
  expect(saved(path).status).toBe("auto-rejected"); // empty complete academic history does not meet completed-credit criteria
  expect((await page(path, student)).querySelector("[data-overload-assessment]")).toBeTruthy();
  expect((await page(path, student)).querySelector("[data-overload-pending]")).toBeNull();
  expect((await page("/overload/", "Dr Avery Hart")).querySelector(`a[href="${path}"]`)).toBeNull();
  expect(await post("/api/overload/", student, { ...fields, reason: "standard", statement: "Please assess my fictional load." })).toBe(path);
  for (const person of ["Olivia Park", "Dr Hana Okafor", "Dr Avery Hart"]) {
    const forbidden = await fetch(new URL(path, base), { headers: { cookie: cookies[person] }, redirect: "manual" });
    expect(forbidden.status).toBe(404);
  }
  await post(`/api${path}review`, student);
  expect((await page(path, student)).querySelector("[data-overload-pending]")).toBeTruthy();
  const events = (await page(path, student)).querySelectorAll(".timeline > li").length;
  await post(`/api${path}review`, student);
  expect((await page(path, student)).querySelectorAll(".timeline > li")).toHaveLength(events);
  expect(await post("/api/overload/", student, { ...fields, reason: "standard", statement: "Repeat while pending" })).toBe(path);
  expect((await page("/overload/", "Dr Avery Hart")).querySelector(`a[href="${path}"]`)).toBeTruthy();
  expect(error(await post(`/api${path}decision`, "Dr Hana Okafor", { decision: "approve", note: "Wrong reviewer" }))).toContain("assigned program-load reviewer");
  expect(error(await post(`/api${path}decision`, "Dr Avery Hart", { decision: "approve", note: "" }))).toContain("Explain");
  await post(`/api${path}decision`, "Dr Avery Hart", { decision: "approve", note: "Fictional exception: reviewed supporting evidence and authorised a 30-unit load." });
  expect(saved(path)).toMatchObject({ status: "approved", approved_limit: 30, assessment: original });
  expect((await page(path, student)).querySelector("[data-overload-pending]")).toBeNull();
  expect((await page("/plan/", student)).querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("COMP6442");
  expect(error(await post("/api/enrol", student, fields))).toBeNull();
  for (const route of ["/plan/", "/record/"]) expect((await page(route, student)).querySelector("[data-confirmed-enrolments]")?.textContent).toContain("COMP6442");
  expect((await page(path, student)).querySelector(".timeline")?.textContent).toContain("Confirmed COMP6442");
  expect(error(await post("/api/enrol", student, { ...fields, courseCode: "COMP7710" }))).toContain("maximum is 36");
  const enrolled = (await page("/plan/", student)).querySelector('a[aria-label="Drop COMP6442"]')!;
  const managePath = enrolled.getAttribute("href")!;
  const form = (await page(managePath, student)).querySelector('form[action$="/drop"]')!;
  await post(form.getAttribute("action")!, student, { revision: form.querySelector<HTMLInputElement>('input[name="revision"]')!.value });
  expect((await page(path, student)).querySelector(".timeline")?.textContent).toContain("Dropped COMP6442");
  expect(saved(path)).toMatchObject({ status: "approved", approved_limit: 30, assessment: original });
  expect((await page("/plan/", student)).querySelector("[data-study-load-summary]")?.textContent).toContain("24 units");
}, 15000); // Many sequential HTTP steps, including JSDOM renders, under the full concurrent suite.

it("automatically approves evidenced criteria but keeps the academic and load permissions separate", async () => {
  const student = "Overload auto student";
  const path = await post("/api/overload/", student, { ...fields, reason: "standard", statement: "Complete fictional 24-unit previous semester, all marks 60." });
  expect(saved(path)).toMatchObject({ status: "approved", approved_limit: 30 });
  expect((await page("/plan/", student)).querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("COMP6442");
  expect(error(await post("/api/enrol", student, { ...fields, courseCode: "COMP8620" }))).toBeTruthy();
  expect(error(await post("/api/enrol", student, fields))).toBeNull();
  expect(error(await post("/api/enrol", student, { ...fields, courseCode: "COMP6442", term: "S2" }))).toBeNull(); // another half-year starts at 6, not 36
  expect((await page("/overload/", student)).querySelector("main")?.textContent).toContain("limit 24 units");
});

it("course permission cannot bypass 24 units; simultaneous confirmations cannot consume the same remaining units", async () => {
  const student = "Overload permission student";
  const request = await post("/api/applications", student, { ...fields, courseCode: "COMP8820", reviewMode: "convenor", reason: "exception", statement: "Fictional course permission." });
  expect(request).toMatch(/^\/applications\/\d+\/$/);
  const document = await page(request, student);
  const text = document.querySelector("main")?.textContent ?? "";
  const reviewer = Object.keys(cookies).find(name => name.startsWith("Dr ") && text.includes(name));
  expect(reviewer).toBeTruthy();
  await post(`/api${request}decision`, reviewer!, { decision: "approve", note: "Fictional academic permission only." });
  expect(error(await post("/api/enrol", student, { ...fields, courseCode: "COMP8820", units: "6" }))).toContain("24-unit limit");
  const race = "Overload race student";
  const results = await Promise.all(["COMP6442", "COMP6800"].map(courseCode => post("/api/enrol", race, { ...fields, courseCode })));
  expect(results.filter(path => error(path) === null)).toHaveLength(1);
  expect(results.filter(path => error(path)?.includes("24-unit limit"))).toHaveLength(1);
});
