import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";

const base = inject("baseUrl"), cookies = inject("fixtureCookies");
const fields = { courseCode: "COMP8620", year: "2027", term: "S2", statement: "Please consider the remaining topic conditions." };
const other = "Assessment handoff duplicate student";
const post = async (path: string, person: string, values: Record<string, string> = {}) => {
  const res = await fetch(new URL(path, base), { method: "POST", headers: { cookie: cookies[person], origin: base },
    body: new URLSearchParams(values), redirect: "manual" });
  expect(res.status).toBe(303);
  return res.headers.get("location")!;
};
const page = async (path: string, person: string) => {
  const res = await fetch(new URL(path, base), { headers: { cookie: cookies[person] } });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
};
const sql = (query: string, id: string) => {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try { return db.prepare(query).all(id); } finally { db.close(); }
};
const evidence = (id: string) => sql("SELECT student_id, course_id, convenor_id, year, term, statement, assessment, checks, request_key FROM applications WHERE id = ?", id);
const events = (id: string) => sql("SELECT * FROM application_events WHERE application_id = ? ORDER BY id", id);

it.each([
  ["approve", "Assessment handoff approval student"],
  ["reject", "Assessment handoff rejection student"],
])("hands the same incomplete assessment to its reviewer for %s, preserving evidence and scope", async (decision, student) => {
  const path = await post("/api/applications", student, fields), id = path.split("/")[2];
  const route = `/api${path}review`;
  const before = await page(path, student), snapshot = evidence(id), history = events(id);
  expect(before.querySelector("#status-heading")?.textContent).toBe("Evidence or decision needed");
  expect(before.querySelector(`form[action="${route}"]`)).toBeTruthy();
  expect(before.querySelector(".request-label")?.textContent).toContain(`Request #${id} · 2027`);
  expect((await page("/applications/", "Dr Rowan Ellis")).querySelector(`a[href="${path}"]`)).toBeNull();
  const foreign = await post(route, other);
  expect(new URL(foreign, base).searchParams.get("error")).toContain("isn't yours");
  for (const [cookie, origin, status] of [["", base, 401], [cookies["Dr Rowan Ellis"], base, 403], [cookies[student], "https://elsewhere.invalid", 403]] as const) {
    expect((await fetch(new URL(route, base), { method: "POST", headers: { cookie, origin }, redirect: "manual" })).status).toBe(status);
  }
  expect(events(id)).toEqual(history);
  expect(await Promise.all([1, 2, 3].map(() => post(route, student)))).toEqual([path, path, path]);
  expect(events(id).slice(0, history.length)).toEqual(history);
  expect(events(id)).toHaveLength(history.length + 2);
  expect(evidence(id)).toEqual(snapshot);
  const pending = await page(path, student);
  expect(pending.querySelector("#status-heading")?.textContent).toBe("With Dr Rowan Ellis");
  expect(pending.querySelector("#assessment-heading")?.textContent).toBe("Original automatic assessment");
  expect(pending.querySelector(`form[action="/api${path}assessment"]`)).toBeNull();
  const queue = await page("/applications/", "Dr Rowan Ellis");
  expect(queue.querySelector(`a[href="${path}"]`)?.textContent).toContain(`Request #${id}`);
  expect((await page("/applications/", "Dr Hana Okafor")).querySelector(`a[href="${path}"]`)).toBeNull();
  const wrong = await post(`/api${path}decision`, "Dr Hana Okafor", { decision, note: "Wrong reviewer" });
  expect(new URL(wrong, base).searchParams.get("error")).toContain("Only the convenor");
  await post(`/api${path}decision`, "Dr Rowan Ellis", { decision, note: "Fictional topic evidence reviewed for this offering." });
  expect(evidence(id)).toEqual(snapshot);
  expect((await page(path, student)).querySelector("#status-heading")?.textContent).toBe(decision === "approve" ? "Approved" : "Rejected by the convenor");
  expect((await page("/applications/", "Dr Rowan Ellis")).querySelector(`a[href="${path}"]`)).toBeTruthy();
  const finalEvents = events(id);
  expect(new URL(await post(route, student), base).searchParams.has("error")).toBe(true);
  expect(events(id)).toEqual(finalEvents);
  for (const route of ["/plan/", "/record/"])
    expect((await page(route, student)).querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("COMP8620");
  if (decision === "approve") {
    for (const [who, year] of [[other, "2027"], [student, "2026"]])
      expect(new URL(await post("/api/enrol", who, { ...fields, year }), base).searchParams.has("error")).toBe(true);
    expect(new URL(await post("/api/enrol", student, fields), base).searchParams.has("error")).toBe(false);
    expect((await page(path, student)).querySelector("#status-heading")?.textContent).toBe("Enrolled");
    for (const route of ["/plan/", "/record/"])
      expect((await page(route, student)).querySelector("[data-confirmed-enrolments]")?.textContent).toContain("COMP8620");
  } else {
    expect(new URL(await post("/api/enrol", student, fields), base).searchParams.has("error")).toBe(true);
  }
});

it("rejects handoffs that would duplicate an active offering request or escape a topic scenario", async () => {
  const automatic = await post("/api/applications", other, fields), id = automatic.split("/")[2];
  const saved = evidence(id), history = events(id);
  const staff = await post("/api/applications", other, { ...fields, reviewMode: "convenor", reason: "exception" });
  const result = await post(`/api${automatic}review`, other);
  expect(new URL(result, base).searchParams.get("error")).toContain(`request #${staff.split("/")[2]}`);
  expect(evidence(id)).toEqual(saved);
  expect(events(id)).toEqual(history);
  const scenario = await post("/api/applications", other, { ...fields, scenarioKey: "comp8620-topic-v1" });
  const scenarioResult = await post(`/api${scenario}review`, other);
  expect(new URL(scenarioResult, base).searchParams.get("error")).toContain("Topic scenarios");
});
