import { expect, it } from "vitest";
import catalogue from "../src/data/catalogue-sources.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { generateAuthoredProfile, generateProfile } from "../src/lib/profile-template";
import { gate } from "../src/lib/eligibility";
import { publishedTerms } from "../src/lib/course-evidence";
import { rulesForSource } from "../src/lib/course-rules";
import { fixedUnits } from "../src/lib/course-evidence";
import { planningProgress, planStudy, remainingRequirements } from "../src/lib/study-planning";
import { academicOverloadChecks, type AcademicResult, type LoadCourse } from "../src/lib/study-load";

const sources = catalogue.snapshots as CatalogueSnapshot[];
const courses = sources.filter(s => s.evidence.kind === "course" && s.evidence.year === 2027).map(s => ({ code: s.evidence.code,
  title: s.evidence.title, units: fixedUnits(s.evidence), rules: rulesForSource(s.evidence.code, 2027, s), source: s }));
const generated = () => generateAuthoredProfile("stable-fixture").records.map(r => ({ ...r, code: r.courseCode }));
const input = () => ({ program: "VCOMP", year: 2027, term: "S2", results: generated(), confirmed: [] as LoadCourse[], courses, sources });
const result = (code: string, units = 6, term = "2026 S1"): AcademicResult => ({ code, units, term, grade: "D", mark: 78, program: "VCOMP", institution: "ANU" });

it("generates repeatable, coherent semesters within the degree level mix, with historical assumptions and usable marks", () => {
  const a = generateAuthoredProfile("same"), b = generateAuthoredProfile("same"), c = generateAuthoredProfile("different");
  expect(a).toEqual(b); expect(a.records.map(r => r.mark)).not.toEqual(c.records.map(r => r.mark));
  expect(a.completedThrough).toBe("2027 S1"); expect(a.planningTerm).toBe("S2");
  expect(a.assumption).toContain("not verified historical ANU data");
  for (const [term, units] of [["2026 S1", 24], ["2026 S2", 18], ["2027 S1", 18]]) expect(a.records.filter(r => r.term === term).reduce((n, r) => n + r.units, 0)).toBe(units);
  for (const r of a.records) expect(r.grade).toBe(r.mark >= 80 ? "HD" : "D");
  expect(a.records.filter(r => !r.courseCode.startsWith("COMP8")).reduce((n, r) => n + r.units, 0)).toBeLessThanOrEqual(48);
  expect(a.records.find(r => r.courseCode === "COMP6250")?.availabilityEvidence).toContain("explicitly has no current offerings");
  expect(a.records.some(r => r.courseCode === "COMP6710")).toBe(false); // excluded for VCOMP in the saved 2027 rule
  expect(academicOverloadChecks({ program: "VCOMP", career: "postgraduate", complete: true, results: generated() }, 2027, "H2", 30).every(c => c.status === "met")).toBe(true);
});

it("fails closed when a template source changes or conflicts", () => {
  const changed = sources.map(s => s.evidence.code === "COMP6442" ? { ...s, hash: "changed" } : s);
  expect(() => generateAuthoredProfile("x", changed)).toThrow("COMP6442");
  expect(() => generateAuthoredProfile("x", [...sources, sources.find(s => s.evidence.code === "COMP6442")!])).toThrow("conflicting");
  expect(() => generateAuthoredProfile("x", sources.filter(s => s.evidence.code !== "ARTIF-SPEC"))).toThrow("degree/specialisation");
  // The rule-driven generator leaves a changed or conflicting course out rather than guessing it.
  expect(() => generateProfile("x", sources.filter(s => s.evidence.code !== "ARTIF-SPEC"))).toThrow("degree/specialisation");
  for (const seed of ["a", "b", "c"]) {
    expect(generateProfile(seed, [...sources, sources.find(s => s.evidence.code === "COMP6442")!]).records.some(r => r.courseCode === "COMP6442")).toBe(false);
    expect(generateProfile(seed, changed).records.some(r => r.courseCode === "COMP6442")).toBe(false);
  }
});

it("generates varied profiles from the saved rules, placing every course where its rules and offerings allow", () => {
  const byCode = new Map(courses.map(c => [c.code, c]));
  expect(generateProfile("same")).toEqual(generateProfile("same"));
  const transcripts = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const p = generateProfile(`rule-seed-${i}`);
    transcripts.add(p.records.map(r => `${r.term}:${r.courseCode}`).join());
    expect(p.id).toBe("vcomp-ai-2027-s2-v2");
    expect(new Set(p.records.map(r => r.courseCode)).size).toBe(p.records.length);
    for (const { term, units } of p.semesterLoads) expect(p.records.filter(r => r.term === term).reduce((n, r) => n + r.units, 0)).toBe(units);
    expect(p.semesterLoads.reduce((n, s) => n + s.units, 0)).toBe(60);
    expect(p.records.filter(r => !r.courseCode.startsWith("COMP8")).reduce((n, r) => n + r.units, 0)).toBeLessThanOrEqual(48);
    for (const r of p.records) {
      const course = byCode.get(r.courseCode)!;
      expect(r.mark).toBeGreaterThanOrEqual(65); expect(r.mark).toBeLessThanOrEqual(92);
      expect(r.grade).toBe(r.mark >= 80 ? "HD" : r.mark >= 70 ? "D" : "CR");
      expect(course.rules?.permissionAlways).toBeUndefined();
      expect(publishedTerms(course.source.evidence, 2027)).toContain(r.term.slice(5));
      const record = { program: "VCOMP", academicCareer: "postgraduate" as const, complete: true, failed: [],
        passed: p.records.filter(o => o.term < r.term).map(o => ({ code: o.courseCode, units: o.units })),
        enrolled: p.records.filter(o => o.term === r.term && o.courseCode !== r.courseCode).map(o => o.courseCode) };
      expect(gate(r.courseCode, course.rules, record).outcome, `${r.courseCode} in ${r.term}`).toBe("eligible");
    }
    const first: typeof p.records = [];
    for (const r of p.records) { if (first.reduce((n, f) => n + f.units, 0) >= 48) break; first.push(r); }
    const points = { HD: 7, D: 6, CR: 5 } as Record<string, number>;
    expect(first.reduce((n, r) => n + points[r.grade] * r.units, 0) / first.reduce((n, r) => n + r.units, 0)).toBeGreaterThanOrEqual(6);
    // What remains is the planner's own reading of the generated record.
    const progress = planningProgress(p.records.map(r => ({ ...r, code: r.courseCode })));
    expect(p.remaining).toEqual(remainingRequirements(progress));
    expect(p.remaining.minimumUnits).toBeGreaterThanOrEqual(36);
    expect(p.remaining.items.map(item => item.key)).toContain("professional");
  }
  expect(transcripts.size).toBeGreaterThanOrEqual(55);
});

it("offers eligible AI progress, separates unknown permission cases and never promises one-semester completion", () => {
  const p = planStudy(input());
  expect(p.supported).toBe(true);
  expect(p.options[0].course.code).toBe("COMP8539");
  expect(p.options.every(c => c.result.outcome === "eligible" && c.offered)).toBe(true);
  expect(p.proposedUnits).toBeLessThanOrEqual(24);
  expect(p.attention.map(c => c.course.code)).toContain("COMP8620");
  expect(p.attention.find(c => c.course.code === "COMP8620")?.result.outcome).toBe("permission-always");
  expect(p.exceedsOneSemester).toBe(true);
  expect(p.progress).toMatchObject({ recordedUnits: 60, aiUnits: 18, aiAdvancedUnits: 6, advancedUnits: 18 });
  expect(p.attention.find(c => c.course.code === "COMP8800")?.result.outcome).toBe("permission-always");
  expect(p.attention.find(c => c.course.code === "COMP8490")?.result.outcome).toBe("assessment-incomplete");
  expect(p.options.map(c => c.course.code)).not.toContain("COMP6710");
  const possible = planningProgress([...generated(), ...p.options.map(c => result(c.course.code, c.course.units!, "2027 S2"))]);
  expect(possible.allocated).toBeLessThanOrEqual(72); // Leave 24 degree units for the required project.
});

it("prioritises a missing semester-two prerequisite and retains indicative later offerings", () => {
  const i = input(); i.results = i.results.filter(r => !["COMP6670", "COMP8600"].includes(r.code));
  const p = planStudy(i), ml = p.options.find(c => c.course.code === "COMP6670");
  expect(ml?.unlocks).toContain("COMP8600");
  expect(p.later.find(c => c.course.code === "COMP8600")?.later).toEqual({ year: 2028, term: "S1" });
});

it("does not use current enrolments, saved courses or future results as completed credit", () => {
  const i = input(); i.results = i.results.filter(r => r.code !== "COMP6528");
  i.confirmed = [{ code: "COMP6528", year: 2027, term: "S1", units: 6, windows: null }];
  expect(planStudy(i).options.map(c => c.course.code)).not.toContain("COMP8539");
  i.results.push({ ...generated().find(r => r.code === "COMP6528")!, term: "2027 S2" });
  expect(planStudy(i).options.map(c => c.course.code)).not.toContain("COMP8539");
  expect(planStudy({ ...input(), savedCodes: ["COMP8539"] }).progress).toEqual(planStudy(input()).progress);
});

it("deduplicates credit and allocates AI and degree groups without counting the 8000 threshold as extra units", () => {
  const rows = generated(), once = planningProgress(rows), doubled = planningProgress([...rows, ...rows]);
  expect(doubled).toEqual(once);
  const allocated = Object.values(once.allocation).flat();
  expect(new Set(allocated.map(r => r.code)).size).toBe(allocated.length);
  expect(once.aiFoundationUnits).toBeLessThanOrEqual(12);
  const p = planningProgress([result("COMP8800", 12, "2026 S2"), result("COMP8800", 12, "2027 S1"), result("COMP8800", 12, "2027 S1")]);
  expect(p.projectUnits).toBe(24); expect(p.recordedUnits).toBe(24);
  expect(planningProgress([result("COMP8800", 12, "2026 S1"), result("COMP8800", 12, "2027 S1")]).projectUnits).toBe(12);
});

it("reserves capacity for saved candidates and honours the actual confirmed-unit limit", () => {
  const p = planStudy(input()), saved = p.options.map(c => c.course.code);
  const withSaved = planStudy({ ...input(), savedCodes: saved });
  expect(withSaved.proposedUnits + withSaved.reservedUnits).toBeLessThanOrEqual(24);
  expect(withSaved.options.some(c => saved.includes(c.course.code))).toBe(false);
  const confirmed = ["COMP6240", "COMP6300", "COMP6331", "COMP6260"].map(code => ({ code, year: 2027, term: "S2", units: 6, windows: null }));
  expect(planStudy({ ...input(), confirmed }).options).toEqual([]);
  expect(planStudy({ ...input(), confirmed, limit: 30 }).proposedUnits).toBeLessThanOrEqual(6);
});

it("does not substitute professional-practice codes or invent missing offerings", () => {
  const i = input(); i.results = i.results.filter(r => r.code !== "COMP6250");
  i.results.push({ ...generated()[0], code: "COMP8280", courseCode: "COMP8280", units: 6 });
  const p = planStudy(i);
  expect(p.progress.professional).toEqual([]);
  expect(p.later.find(c => c.course.code === "COMP6250")?.later).toBeUndefined();
  expect(p.options.map(c => c.course.code)).not.toContain("COMP8260");
});

it("keeps unknown course conditions and changed planning sources unresolved", () => {
  const i = input(); i.courses = i.courses.map(c => c.code === "COMP8539" ? { ...c, rules: undefined } : c);
  expect(planStudy(i).attention.find(c => c.course.code === "COMP8539")?.result.outcome).toBe("not-recorded");
  const p = planStudy({ ...input(), sources: sources.filter(s => s.evidence.code !== "ARTIF-SPEC") });
  expect(p.supported).toBe(false); expect(p.options).toEqual([]);
});

it("uses saved later class rows as indicative options without turning them into 2027 offerings", () => {
  const i = input(); i.results = i.results.filter(r => r.code !== "COMP8600");
  const p = planStudy({ ...i, year: 2028, term: "S1" });
  expect(p.future).toBe(true); expect(p.options.map(c => c.course.code)).toContain("COMP8600");
  expect(planStudy(i).options.map(c => c.course.code)).not.toContain("COMP8600");
});
