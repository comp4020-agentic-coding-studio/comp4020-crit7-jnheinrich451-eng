import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";
const base = inject("baseUrl"), cookies = inject("fixtureCookies");
async function page(path: string, person: string) {
  const res = await fetch(new URL(path, base), { headers: { cookie: cookies[person] } });
  expect(res.status).toBe(200); return new JSDOM(await res.text()).window.document;
}
async function post(path: string, person: string, data: Record<string, string>) {
  const res = await fetch(new URL(path, base), { method: "POST", headers: { origin: base, cookie: cookies[person] }, body: new URLSearchParams(data), redirect: "manual" });
  expect(res.status).toBe(303); return new URL(res.headers.get("location")!, base);
}
async function courseRow(person: string, code: string) {
  const document = await page("/plan/", person);
  return [...document.querySelectorAll<HTMLElement>("[data-enrolment-id]")].find(li => li.querySelector(".enrolled-code")?.textContent === code)!;
}
async function management(person: string, code: string) {
  const row = await courseRow(person, code), id = row.dataset.enrolmentId!;
  const drop = await page(`/enrolments/${id}/?mode=drop`, person);
  return { id, revision: drop.querySelector<HTMLInputElement>('input[name="revision"]')!.value };
}
async function offering(person: string, code: string, term = "S1") {
  return (await page(`/courses/${code}/?year=2027&term=${term}`, person)).querySelector<HTMLInputElement>('input[name="offeringId"]')!.value;
}
function rows(sql: string, ...args: (string | number)[]) {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try { return db.prepare(sql).all(...args); } finally { db.close(); }
}

it("swaps at 24 units, drops persistently, releases units and rejects stale drop forms after re-enrolment", async () => {
  const who = "Course changes student", old = await management(who, "COMP6442"), replacementId = await offering(who, "COMP6800");
  const before = await page(`/enrolments/${old.id}/?replacementId=${replacementId}`, who);
  expect(before.querySelector("[data-swap-load]")?.textContent).toContain("24 units");
  expect(before.querySelector('button[disabled]')).toBeNull();
  expect((await post(`/api/enrolments/${old.id}/swap`, who, { revision: old.revision, replacementId })).searchParams.has("error")).toBe(false);
  for (const route of ["/plan/", "/record/"]) {
    const section = (await page(route, who)).querySelector("[data-confirmed-enrolments]")!;
    expect(section.textContent).not.toContain("COMP6442"); expect(section.textContent).toContain("COMP6800");
    expect(section.querySelectorAll("li")).toHaveLength(4);
  }
  const next = await management(who, "COMP6800");
  expect((await post(`/api/enrolments/${next.id}/drop`, who, { revision: next.revision })).searchParams.has("error")).toBe(false);
  expect((await page("/plan/", who)).querySelector("[data-study-load-summary]")?.textContent).toContain("18 units");
  expect((await page("/plan/", who)).querySelector("[data-saved-courses]")?.textContent).not.toContain("COMP6800");
  expect(rows("SELECT ended_reason FROM enrolments WHERE id = ?", next.id)).toEqual([{ ended_reason: "dropped" }]);
  expect((await post("/api/enrol", who, { courseCode: "COMP6800", year: "2027", term: "S1" })).searchParams.has("error")).toBe(false);
  expect((await post(`/api/enrolments/${next.id}/drop`, who, { revision: next.revision })).searchParams.get("error")).toContain("changed");
  expect(await courseRow(who, "COMP6800")).toBeTruthy();
  expect((await page("/plan/", who)).querySelector("[data-enrolment-history]")?.textContent).toContain("Swapped COMP6442 for COMP6800");
  expect(rows("SELECT kind FROM enrolment_events WHERE enrolment_id = ? ORDER BY id", next.id)).toEqual([{ kind: "confirmed" }, { kind: "dropped" }, { kind: "confirmed" }]);
});

it("keeps the original for ineligible, permission-required, oversized, unavailable and foreign-session replacements", async () => {
  const who = "Swap failure student", old = await management(who, "COMP6442");
  const permission = await offering(who, "COMP8820"), oversized = await offering(who, "COMP7710"), ineligible = await offering(who, "ENGN6627");
  const otherTerm = await offering(who, "COMP6442", "S2");
  const payloads = [permission, oversized, ineligible, otherTerm, "999999"].map(replacementId => ({ revision: old.revision, replacementId }));
  for (const data of payloads) {
    expect((await post(`/api/enrolments/${old.id}/swap`, who, data)).searchParams.has("error"), JSON.stringify(data)).toBe(true);
    expect(await courseRow(who, "COMP6442")).toBeTruthy();
    expect(rows("SELECT kind FROM enrolment_events WHERE enrolment_id = ?", old.id)).toEqual([]);
  }
  expect((await fetch(new URL(`/enrolments/${old.id}/`, base), { headers: { cookie: cookies["Olivia Park"] } })).status).toBe(404);
  expect((await post(`/api/enrolments/${old.id}/drop`, "Olivia Park", { revision: old.revision })).searchParams.has("error")).toBe(true);
  const denied = await fetch(new URL(`/api/enrolments/${old.id}/drop`, base), { method: "POST", headers: { cookie: cookies["Dr Hana Okafor"], origin: base }, body: new URLSearchParams({ revision: old.revision }), redirect: "manual" });
  expect(denied.status).toBe(403);
  // Deliberately fail the replacement write in the throwaway DB, after the old
  // enrolment has been ended. Both the drop and its event must roll back.
  const db = new Database(inject("testDatabase"));
  try {
    db.exec(`CREATE TRIGGER fixture_swap_write_failure BEFORE INSERT ON enrolments
      WHEN NEW.student_id = (SELECT student_id FROM enrolments WHERE id = ${Number(old.id)})
      BEGIN SELECT RAISE(ABORT, 'Fixture replacement write failure'); END`);
    const target = await offering(who, "COMP6800");
    const fault = await fetch(new URL(`/api/enrolments/${old.id}/swap`, base), { method: "POST", headers: { cookie: cookies[who], origin: base }, body: new URLSearchParams({ revision: old.revision, replacementId: target }), redirect: "manual" });
    expect(fault.status).toBe(500); // operational faults propagate; transactional state must still be preserved
    expect(await courseRow(who, "COMP6442")).toBeTruthy();
    expect(rows("SELECT kind FROM enrolment_events WHERE enrolment_id = ?", old.id)).toEqual([]);
  } finally { db.exec("DROP TRIGGER IF EXISTS fixture_swap_write_failure"); db.close(); }
  const request = await post("/api/applications", who, { courseCode: "COMP8820", year: "2027", term: "S1", statement: "Use the published permission-only criterion." });
  expect(request.pathname).toMatch(/^\/applications\/\d+\/$/);
  const chooseUnits = await page(`/enrolments/${old.id}/?replacementId=${permission}`, who);
  expect(chooseUnits.querySelector("[data-swap-issue]")?.textContent).toContain("Choose a credit value between 6 and 24 units for COMP8820");
  expect(chooseUnits.querySelector('input[name="units"]')).toBeTruthy();
  expect(chooseUnits.querySelector('button[disabled]')).toBeTruthy();
  for (const units of ["", "25"]) expect((await post(`/api/enrolments/${old.id}/swap`, who, { revision: old.revision, replacementId: permission, units })).searchParams.has("error")).toBe(true);
  expect((await post(`/api/enrolments/${old.id}/swap`, who, { revision: old.revision, replacementId: permission, units: "6" })).searchParams.has("error")).toBe(false);
  expect((await page(request.pathname, who)).querySelector("#status-heading")?.textContent).toBe("Enrolled");
  const enrolled = await management(who, "COMP8820");
  await post(`/api/enrolments/${enrolled.id}/drop`, who, { revision: enrolled.revision });
  expect((await page(request.pathname, who)).querySelector("#status-heading")?.textContent).toBe("Demo permission approved");
  expect((await page(request.pathname, who)).querySelector(".timeline")?.textContent).toContain("Dropped COMP8820");
  expect(rows("SELECT units, ended_reason FROM enrolments WHERE id = ?", enrolled.id)).toEqual([{ units: 6, ended_reason: "dropped" }]);
});

it("protects a kept course's concurrent requirement and then permits the prerequisite drop", async () => {
  const who = "Course dependency student", prerequisite = await management(who, "COMP6442"), dependent = await management(who, "COMP6120");
  expect((await post(`/api/enrolments/${prerequisite.id}/drop`, who, { revision: prerequisite.revision })).searchParams.get("error")).toContain("COMP6120 currently relies on COMP6442");
  expect(await courseRow(who, "COMP6442")).toBeTruthy();
  expect((await post(`/api/enrolments/${dependent.id}/drop`, who, { revision: dependent.revision })).searchParams.has("error")).toBe(false);
  expect((await post(`/api/enrolments/${prerequisite.id}/drop`, who, { revision: prerequisite.revision })).searchParams.has("error")).toBe(false);
  expect((await page("/record/", who)).querySelectorAll("[data-confirmed-enrolments] li")).toHaveLength(0);
});

it("commits only one of two competing changes to the same enrolment revision", async () => {
  const who = "Course change race student";
  expect((await post("/api/enrol", who, { courseCode: "COMP6442", year: "2027", term: "S1" })).searchParams.has("error")).toBe(false);
  const current = await management(who, "COMP6442"), replacementId = await offering(who, "COMP6800");
  const outcomes = await Promise.all([
    post(`/api/enrolments/${current.id}/drop`, who, { revision: current.revision }),
    post(`/api/enrolments/${current.id}/swap`, who, { revision: current.revision, replacementId }),
  ]);
  expect(outcomes.filter(result => !result.searchParams.has("error"))).toHaveLength(1);
  expect(outcomes.filter(result => result.searchParams.get("error")?.includes("changed"))).toHaveLength(1);
  expect(rows("SELECT kind FROM enrolment_events WHERE enrolment_id = ? AND kind IN ('dropped','swapped-out')", current.id)).toHaveLength(1);
});

it("respects a kept course's published concurrent incompatibility when swapping another course", async () => {
  const who = "Swap incompatibility student";
  for (const courseCode of ["COMP7710", "COMP6528"]) expect((await post("/api/enrol", who, { courseCode, year: "2027", term: "S1" })).searchParams.has("error")).toBe(false);
  const original = await management(who, "COMP6528"), replacementId = await offering(who, "COMP6710");
  const response = await post(`/api/enrolments/${original.id}/swap`, who, { revision: original.revision, replacementId });
  expect(response.searchParams.get("error")).toContain("COMP7710 cannot be taken with COMP6710");
  expect(await courseRow(who, "COMP6528")).toBeTruthy();
});
