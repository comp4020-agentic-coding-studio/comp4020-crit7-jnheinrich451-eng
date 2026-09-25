import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";
import catalogue from "../src/data/catalogue-sources.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { rulesForSource } from "../src/lib/course-rules";
import { checkStatus, firstRound, gate, type StudentRecord } from "../src/lib/eligibility";

const source = (catalogue.snapshots as CatalogueSnapshot[]).find(s => s.evidence.code === "COMP7710")!;
const rules = rulesForSource("COMP7710", 2027, source)!;
const empty: StudentRecord = { program: "VCOMP", complete: true, passed: [], failed: [], enrolled: [] };
const base = inject("baseUrl"), cookies = inject("fixtureCookies");
const fields = { courseCode: "COMP7710", year: "2027", term: "S1" };
async function page(path: string, person: string) {
  const res = await fetch(new URL(path, base), { headers: { cookie: cookies[person] } });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
}
async function post(path: string, person: string, values: Record<string, string>) {
  const res = await fetch(new URL(path, base), { method: "POST", headers: { origin: base, cookie: cookies[person] }, body: new URLSearchParams(values), redirect: "manual" });
  expect(res.status).toBe(303);
  return res.headers.get("location")!;
}

describe("COMP7710 saved 2027 incompatibility", () => {
  it("encodes completions and current enrolments without inventing a permission requirement", () => {
    expect(source.hash).toBe("26e64aa8e5553b48734121517dc2edf47a6de0b78f8faccb989bd6204403e046");
    expect(rules.text).toContain("previously completed or are currently enrolled");
    expect(rules.permissionAlways).toBeUndefined();
    expect(gate("COMP7710", rules, empty).outcome).toBe("eligible");
    for (const code of ["COMP1110", "COMP1140", "COMP6710"]) {
      for (const record of [{ ...empty, passed: [{ code, units: 6 }] }, { ...empty, enrolled: [code] }]) {
        const result = gate("COMP7710", rules, record);
        expect(result).toMatchObject({ outcome: "rules-not-met", incompatible: [code] });
        expect("checks" in result && result.checks[0].source?.hash).toBe(source.hash);
      }
    }
    expect(gate("COMP7710", rules, { ...empty, failed: ["COMP6710"] }).outcome).toBe("eligible");
    const partial = gate("COMP7710", rules, { ...empty, complete: false });
    expect(partial.outcome).toBe("assessment-incomplete");
    expect("checks" in partial && partial.checks.map(checkStatus)).toEqual(["unknown"]);
    const concurrent = gate("COMP7710", rules, { ...empty, enrolled: ["COMP6710"] });
    expect(firstRound("COMP7710", concurrent).reasons.join(" ")).toContain("currently enrolled in COMP6710");
    expect(firstRound("COMP7710", concurrent).reasons.join(" ")).not.toContain("You've passed");
    // An ordinary completion-only exclusion must not silently grow into a concurrent rule.
    expect(gate("TEST1000", { text: "Completion only", incompatible: ["COMP6710"] }, { ...empty, enrolled: ["COMP6710"] }).outcome).toBe("eligible");
    expect(rulesForSource("COMP7710", 2027, { ...source, hash: "changed" })).toBeUndefined();
    expect(rulesForSource("COMP7710", 2026, source)).toBeUndefined();
  });

  it("allows a compatible student to confirm enrolment and retain it after reload", async () => {
    const person = "Programming eligibility student";
    const course = await page("/courses/COMP7710/?year=2027&term=S1", person);
    expect(course.querySelector("#gate-heading")?.textContent).toBe("You can enrol directly");
    expect(course.querySelector('form[action="/api/applications"]')).toBeNull();
    expect(await post("/api/enrol", person, fields)).toContain("Enrolled+in+COMP7710");
    expect((await page("/courses/COMP7710/?year=2027&term=S1", person)).querySelector("#gate-heading")?.textContent).toBe("Enrolled");
  });

  it("gives the existing COMP6710 completion a specific result and useful next action", async () => {
    const person = "Programming conflict student";
    const course = await page("/courses/COMP7710/?year=2027&term=S1", person);
    expect(course.querySelector('[data-check-status="unmet"]')?.textContent).toContain("COMP6710, which is incompatible with COMP7710");
    expect(course.querySelector('form[action="/api/enrol"]')).toBeNull();
    const blocked = await post("/api/enrol", person, fields);
    expect(new URL(blocked, base).searchParams.has("error")).toBe(true);
    const path = await post("/api/applications", person, { ...fields, statement: "Please assess this course." });
    const result = await page(path, person);
    expect(result.querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
    expect(result.querySelector("[data-decision-reasons]")?.textContent).toContain("COMP6710");
    expect(result.querySelector("[data-next-actions]")?.textContent).toContain("Choose a course compatible with your completed study");
    expect(result.querySelector("[data-next-actions]")?.textContent).not.toContain("Complete the unmet requirements");
    expect(result.querySelector("[data-pending-request]")).toBeNull();
    expect((await page(path, person)).querySelector("[data-decision-reasons]")?.textContent).toBe(result.querySelector("[data-decision-reasons]")?.textContent);
    const disputed = await post("/api/applications", person, { ...fields, reason: "record-correction", statement: "The completed-course entry is incorrect." });
    expect((await page(disputed, person)).querySelector("#status-heading")?.textContent).toBe("Evidence or decision needed");
    const exception = await post("/api/applications", person, { ...fields, reason: "exception", statement: "Please consider a waiver." });
    const undecided = await page(exception, person);
    expect(undecided.querySelector("#status-heading")?.textContent).toBe("Exception decision needed");
    expect(undecided.querySelector(".status")?.textContent).toContain("No staff review is in progress");
    expect(undecided.querySelector('[data-check-status="unmet"]')?.textContent).toContain("COMP6710");
    expect(undecided.querySelector("[data-pending-request]")).toBeNull();
    expect((await page("/applications/", person)).querySelector(`a.request-card[href="${exception}"] .badge`)?.textContent).toBe("Exception decision needed");
    const saved = (await page("/plan/", person)).querySelector("[data-saved-courses]")!;
    expect(saved.querySelector(".badge")?.textContent).toBe("Exception decision needed");
    expect(saved.querySelector("[data-pending-request]")).toBeNull();
    expect(saved.querySelector('form[action="/api/enrol"]')).toBeNull();
    expect((await page(path, person)).querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
  });

  it("checks current enrolment in the chosen year and term without claiming the course was passed", async () => {
    const person = "Programming current student";
    const current = await page("/courses/COMP7710/?year=2027&term=S1", person);
    expect(current.querySelector('[data-check-status="unmet"]')?.textContent).toContain("currently enrolled in COMP6710");
    expect((await page("/courses/COMP7710/?year=2027&term=S2", person)).querySelector("#gate-heading")?.textContent).toBe("You can enrol directly");
    const path = await post("/api/applications", person, { ...fields, statement: "Check the courses I am taking this term." });
    const result = await page(path, person);
    expect(result.querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
    expect(result.querySelector("[data-decision-reasons]")?.textContent).toContain("currently enrolled in COMP6710");
    expect(result.querySelector("[data-decision-reasons]")?.textContent).not.toContain("You've passed");
  });
});
