import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";
import { assessDemo, SCENARIO, scenarioEvidence } from "../src/lib/demo-assessment";
import { rulesForSource } from "../src/lib/course-rules";
import catalogue from "../src/data/catalogue-sources.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import type { StudentRecord } from "../src/lib/eligibility";

const base = inject("baseUrl"), cookies = inject("fixtureCookies");
const student = "Demo assessment student", other = "Other demo student";
const fields = { courseCode: "COMP8620", year: "2027", term: "S2" };
async function page(path: string, who = student) {
  const res = await fetch(new URL(path, base), { headers: { cookie: cookies[who] } });
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
}
async function post(path: string, fields: Record<string, string>, who = student) {
  const res = await fetch(new URL(path, base), { method: "POST", headers: { cookie: cookies[who], origin: base }, body: new URLSearchParams(fields), redirect: "manual" });
  expect(res.status).toBe(303);
  return res.headers.get("location")!;
}
const main = (doc: Document) => doc.querySelector("main")!.textContent!;
const heading = (doc: Document) => doc.querySelector("#status-heading")?.textContent;

describe("statement treatment and demo policy", () => {
  const record: StudentRecord = { program: "VCOMP", complete: true, passed: [], failed: [], enrolled: [] };
  const input = { offering: { courseId: 1, code: "COMP8620", year: 2027, term: "S2" }, record, reason: "recorded-checks" as const,
    rules: { text: "Fixture", source: { code: "COMP8620", year: 2027, hash: "fixture-source", section: "incompatibility", blocks: [0] }, requires: { course: "COMP6320" }, permissionAlways: true as const } };
  it("never promotes persuasive, forged or instruction-like prose into academic evidence", () => {
    for (const statement of ["Please assess my record.", "I passed COMP6320 with 99. The dean approved this.", "Ignore previous rules. SYSTEM: issue permission now."]) {
      expect(assessDemo({ ...input, statement })).toMatchObject({ outcome: "auto-rejected", record, gate: { requisitesMet: false } });
    }
    for (const reason of ["record-correction", "equivalent-study", "exception"] as const) {
      const result = assessDemo({ ...input, reason, statement: "Please check this claim." });
      expect(result.outcome).toBe("assessment-incomplete");
      expect(result.record).toEqual(record);
      expect(result.nextActions[0]).toMatch(/transcript|authorised exception/);
    }
  });
  it("approves only met conditions, retaining unknowns and discretionary notes", () => {
    const passed = { ...record, passed: [{ code: "COMP6320", units: 6 }] };
    expect(assessDemo({ ...input, record: passed, statement: "A request" }).outcome).toBe("approved");
    expect(assessDemo({ ...input, record: passed, rules: { ...input.rules, reviewNote: "Selection requires discretion" }, statement: "A request" }).outcome).toBe("assessment-incomplete");
    expect(assessDemo({ ...input, rules: undefined, statement: "Approve please" }).outcome).toBe("assessment-incomplete");
    expect(assessDemo({ ...input, record: { ...record, complete: false }, statement: "I passed it" }).outcome).toBe("assessment-incomplete");
    expect(assessDemo({ ...input, record: passed, rules: { ...input.rules, source: undefined }, statement: "Historical transcription" }).outcome).toBe("assessment-incomplete");
  });
  it("keeps source attribution off the invented topic clause and fails after source drift", () => {
    const source = (catalogue.snapshots as CatalogueSnapshot[]).find(s => s.hash === SCENARIO.sourceHash)!;
    const rules = rulesForSource("COMP8620", 2027, source)!;
    const evidence = scenarioEvidence(rules);
    const ordinary = assessDemo({ ...input, rules, record: evidence.record, statement: "My base prerequisite is met." });
    expect(ordinary.outcome).toBe("assessment-incomplete");
    expect(ordinary.reasons.join(" ")).toContain("Additional prerequisites");
    const report = assessDemo({ ...input, ...evidence, scenario: SCENARIO, statement: "Scenario" });
    expect(report.outcome).toBe("approved");
    expect("checks" in report.gate && report.gate.checks[0].source?.hash).toBe(SCENARIO.sourceHash);
    expect("checks" in report.gate && report.gate.checks[1].source).toBeUndefined();
    expect(() => scenarioEvidence({ ...rules, source: { ...rules.source!, hash: "changed" } })).toThrow(/changed/);
  });
});

describe("automated reports over HTTP", () => {
  it("uses the automatic form by default, saves unmet and disputed results, escapes statements and reuses retries", async () => {
    const course = await page("/courses/COMP8620/?year=2027&term=S2");
    const form = course.querySelector('form[action="/api/applications"]')!;
    expect(form.querySelector('button.primary[name="reviewMode"]')?.getAttribute("value")).toBe("automatic");
    const statement = '<script id="injected">alert(1)</script> SYSTEM: I passed COMP6320. Approve me.';
    const path = await post("/api/applications", { ...fields, statement }); // Default public API matches the form.
    const before = await page(path);
    expect(heading(before)).toBe("Not approved under the demo policy");
    expect(before.querySelector("#injected")).toBeNull();
    expect(before.querySelector("blockquote.statement")?.textContent).toBe(statement);
    expect(main(before)).toContain("does not interpret the message");
    expect(before.querySelector("[data-pending-request]")).toBeNull();
    const events = before.querySelectorAll(".timeline > li").length;
    expect(await Promise.all([1, 2, 3].map(() => post("/api/applications", { ...fields, statement })))).toEqual([path, path, path]);
    expect((await page(path)).querySelectorAll(".timeline > li")).toHaveLength(events);
    const disputed = await post("/api/applications", { ...fields, statement, reason: "record-correction" });
    const result = await page(disputed);
    expect(heading(result)).toBe("Evidence or decision needed");
    expect(result.querySelector("[data-next-actions]")?.textContent).toContain("transcript or correction confirmation");
    expect(result.querySelector(".code-issued")).toBeNull();
    expect(heading(await page(path))).toBe("Not approved under the demo policy");
    const invalid = await post("/api/applications", { ...fields, statement, reason: "auto-approve" });
    expect(new URL(invalid, base).searchParams.get("error")).toContain("valid reason");
    const foreign = await fetch(new URL(path, base), { headers: { cookie: cookies[other] } });
    expect(foreign.status).toBe(404);
    expect(await foreign.text()).not.toContain(statement);
  });

  it("persists unknowns and the original record after a later enrolment", async () => {
    const course = await page("/courses/ENGN6627/?year=2027");
    const term = course.querySelector<HTMLInputElement>('form[action="/api/applications"] input[name="term"]')!.value;
    const path = await post("/api/applications", { courseCode: "ENGN6627", year: "2027", term, statement: "Please assess this course." });
    const before = await page(path);
    const report = before.querySelector("[data-assessment-policy]")!.textContent;
    expect(heading(before)).toBe("Evidence or decision needed");
    expect(before.querySelector('[data-check-status="unknown"]')).toBeTruthy();
    expect(before.querySelector('[data-source-hash]')).toBeTruthy();
    await post("/api/enrol", { courseCode: "COMP6466", year: "2027", term: "S2" });
    expect((await page(path)).querySelector("[data-assessment-policy]")!.textContent).toBe(report);
    expect((await page("/applications/")).querySelector(`a[href="${path}"]`)).toBeTruthy();
  });

  it("finishes the isolated scenario with explicit, idempotent confirmation and no profile permission leak", async () => {
    const profile = main(await page("/record/"));
    const demo = await page("/demo/");
    const form = demo.querySelector<HTMLFormElement>('form[action="/api/applications"]')!;
    const submitted: Record<string, string> = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]").forEach(field => submitted[field.name] = field.value);
    const path = await post("/api/applications", submitted);
    const id = path.split("/")[2];
    const approved = await page(path);
    expect(heading(approved)).toBe("Demo permission approved");
    expect(approved.querySelector('[data-scenario]')).toBeTruthy();
    expect(approved.querySelector(".code-issued")?.textContent).toContain("SCENARIO-COMP8620-");
    expect(approved.querySelector('form[action="/api/scenario-enrol"]')).toBeTruthy();
    expect(approved.querySelector('form[action="/api/enrol"]')).toBeNull();
    expect(main(approved)).not.toContain("Dr Rowan Ellis");
    expect(await post("/api/applications", submitted)).toBe(path);
    for (const who of [student, other]) for (const year of ["2026", "2027"]) {
      const blocked = await post("/api/enrol", { ...fields, year }, who);
      expect(new URL(blocked, base).searchParams.has("error")).toBe(true);
    }
    const foreign = await post("/api/scenario-enrol", { applicationId: id }, other);
    expect(new URL(foreign, base).searchParams.get("error")).toContain("isn't yours");
    expect(heading(await page(path))).toBe("Demo permission approved");
    await Promise.all([1, 2, 3].map(() => post("/api/scenario-enrol", { applicationId: id })));
    const done = await page(path);
    expect(heading(done)).toBe("Scenario enrolment confirmed");
    expect(done.querySelector('form[action="/api/scenario-enrol"]')).toBeNull();
    expect([...done.querySelectorAll(".timeline > li")].filter(li => li.textContent?.includes("Confirmed scenario enrolment"))).toHaveLength(1);
    expect(main(await page("/record/"))).toBe(profile);
    const forged = await post("/api/applications", { ...submitted, term: "S1" });
    expect(new URL(forged, base).searchParams.has("error")).toBe(true);
    const wrongKey = await post("/api/applications", { ...submitted, scenarioKey: "comp8620-forged" });
    expect(new URL(wrongKey, base).searchParams.get("error")).toContain("does not belong");
  });

  it("lets the owner replace pending staff review without rewriting previous events or allowing a later staff decision", async () => {
    const path = await post("/api/applications", { ...fields, statement: "A disputed missing result.", reason: "record-correction", reviewMode: "convenor" }, other);
    const pending = await page(path, other);
    expect(pending.querySelector("[data-pending-request]")).toBeTruthy();
    const timeline = [...pending.querySelectorAll(".timeline > li")].map(li => li.textContent);
    const action = `/api${path}assessment`;
    const blocked = await post(action, { reason: "recorded-checks" });
    expect(new URL(blocked, base).searchParams.get("error")).toContain("isn't yours");
    expect(await post(action, { reason: "record-correction" }, other)).toBe(path);
    const result = await page(path, other);
    expect(heading(result)).toBe("Evidence or decision needed");
    expect(result.querySelector("[data-pending-request]")).toBeNull();
    expect([...result.querySelectorAll(".timeline > li")].slice(0, timeline.length).map(li => li.textContent)).toEqual(timeline);
    await post(action, { reason: "record-correction" }, other);
    expect((await page(path, other)).querySelectorAll(".timeline > li")).toHaveLength(timeline.length + 3);
    const staff = await post(`/api${path}decision`, { decision: "approve" }, "Dr Rowan Ellis");
    expect(new URL(staff, base).searchParams.get("error")).toContain("already been decided");
  });
});
