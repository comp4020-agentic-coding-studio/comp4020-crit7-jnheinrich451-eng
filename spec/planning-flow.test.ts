import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";
const base = inject("baseUrl"), cookies = inject("fixtureCookies");
const cookie = cookies["Planning legacy student"];
async function page(path = "/record/") {
  const response = await fetch(new URL(path, base), { headers: { cookie } });
  expect(response.status).toBe(200); return new JSDOM(await response.text()).window.document;
}
async function post(path: string, values: Record<string, string>, session = cookie, origin = base) {
  return fetch(new URL(path, base), { method: "POST", headers: { cookie: session, origin }, body: new URLSearchParams(values), redirect: "manual" });
}
function state() {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try {
    const student = db.prepare("SELECT * FROM students WHERE uid = 'fixture-planning-legacy'").get() as { id: number };
    return { student, transcript: db.prepare("SELECT * FROM transcript WHERE student_id = ?").all(student.id),
      enrolments: db.prepare("SELECT * FROM enrolments WHERE student_id = ?").all(student.id),
      plan: db.prepare("SELECT * FROM study_plans WHERE student_id = ?").get(student.id) as { template_id: string | null; planning_year: number; planning_term: string } | undefined,
      events: db.prepare("SELECT * FROM study_plan_events WHERE student_id = ?").all(student.id) };
  } finally { db.close(); }
}

it("preserves legacy facts, persists preference changes and keeps future suggestions separate from enrolment", async () => {
  const before = state(), first = await page();
  expect(first.querySelector("[data-study-suggestions]")?.textContent).toContain("Example study focus for your existing record");
  expect(state()).toEqual(before); // GET never creates or rewrites a profile.
  expect((await post("/api/study-plan", { period: "2028 S1", studentId: "1", templateId: "forged", mark: "100" })).status).toBe(303);
  const next = await page(), after = state();
  expect(after.plan).toMatchObject({ planning_year: 2028, planning_term: "S1", template_id: null });
  expect(after.student).toEqual(before.student); expect(after.transcript).toEqual(before.transcript); expect(after.enrolments).toEqual(before.enrolments);
  expect(next.querySelector("[data-study-suggestions]")?.textContent).toContain("indicative later options");
  expect(next.querySelector('[data-study-suggestions] form[action="/api/selections"]')).toBeNull();
  expect(next.querySelectorAll('[data-study-suggestions] a[href*="year=2028"]')).toHaveLength(0);
  expect(after.events).toHaveLength(1);
  await post("/api/study-plan", { period: "2028 S1" }); expect(state().events).toEqual(after.events);
  expect((await post("/api/study-plan", { period: "2027 S2" })).status).toBe(303);
  expect((await page("/")).querySelector<HTMLOptionElement>('#term option[value="S2"]')?.selected).toBe(true);
  expect((await page("/?term=")).querySelector<HTMLOptionElement>('#term option[value=""]')?.selected).toBe(true);
  const suggestion = (await page()).querySelector<HTMLFormElement>('[data-suggestion-options] form[action="/api/selections"]')!;
  const offeringId = suggestion.querySelector<HTMLInputElement>('input[name="offeringId"]')!.value;
  const code = suggestion.closest("li")!.querySelector(".enrolled-code")!.textContent!;
  expect((await post("/api/selections", { action: "add", offeringId })).status).toBe(303);
  expect((await page()).querySelector("[data-planning-saved]")?.textContent).toContain(code);
  expect((await page("/plan/")).querySelector("[data-saved-courses]")?.textContent).toContain(code);
  expect(state().enrolments).toEqual(before.enrolments);
});

it("rejects unsupported periods, reviewer writes, cross-site writes and anonymous access", async () => {
  const before = state();
  expect((await post("/api/study-plan", { period: "2029 S2" })).headers.get("location")).toContain("error=");
  expect(state()).toEqual(before);
  expect((await post("/api/study-plan", { period: "2027 S2" }, cookies["Dr Hana Okafor"])).status).toBe(403);
  expect((await post("/api/study-plan", { period: "2027 S2" }, cookie, "https://unrelated.example")).status).toBe(403);
  expect((await post("/api/study-plan", { period: "2027 S2" }, "")).status).toBe(401);
});
