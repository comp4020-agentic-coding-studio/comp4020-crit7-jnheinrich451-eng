import { expect, it } from "vitest";
import { academicOverloadChecks, assessOverload, projectLoad, publishedDate, type LoadCourse, type OverloadRecord } from "../src/lib/study-load";

const course = (code: string, units: number | null = 6, term = "S1", year = 2027): LoadCourse =>
  ({ code, units, term, year, windows: [{ start: "2027-02-22", end: "2027-06-04" }] });
const four = ["A", "B", "C", "D"].map(c => course(c));
function record(count = 4, mark = 60): OverloadRecord {
  return { career: "postgraduate", program: "VCOMP", complete: true,
    results: Array.from({ length: count }, (_, i) => ({ code: `H${i}`, units: 6, grade: "CR", mark,
      program: "VCOMP", institution: "ANU", term: i < 5 ? "2026 S2" : "2026 S1" })) };
}
const report = (load = projectLoad(four, course("E")), academic = record(), reason: "standard" | "final-30" = "standard") =>
  assessOverload({ load, record: academic, reason, statement: "Self-reported context", deadline: "met" });

it("counts units, deduplicates the offering, and scopes the cap to year and half-year", () => {
  expect(projectLoad(four.slice(0, 3), course("D"))).toMatchObject({ maximum: 24, state: "within-limit" });
  expect(projectLoad(four, course("E"))).toMatchObject({ maximum: 30, state: "approval-required", requestedLimit: 30 });
  expect(projectLoad(four, course("E", 12))).toMatchObject({ maximum: 36, requestedLimit: 36 });
  expect(projectLoad(four, course("E", 18))).toMatchObject({ minimum: 42, state: "over-maximum" });
  expect(projectLoad(four, course("A"))).toMatchObject({ maximum: 24, state: "within-limit" });
  expect(projectLoad(four, course("E", 6, "S2"))).toMatchObject({ maximum: 6, state: "within-limit" });
  expect(projectLoad(four, course("E", 6, "S1", 2028))).toMatchObject({ maximum: 6, state: "within-limit" });
  expect(projectLoad(four, course("E", 12), 30).state).toBe("approval-required");
  expect(projectLoad(four, course("E", 12), 36).state).toBe("within-limit");
  expect(projectLoad(four, course("E", 18), 999).state).toBe("over-maximum");
});

it("uses actual session overlap, retaining uncertainty and unknown credits", () => {
  const summer = { ...course("SUM", 6, "Summer"), windows: [{ start: "2027-01-04", end: "2027-02-01" }] };
  expect(projectLoad(four, summer)).toMatchObject({ maximum: 24, state: "within-limit", excluded: ["SUM"] });
  expect(projectLoad(four, { ...summer, windows: null })).toMatchObject({ minimum: 24, maximum: 30, state: "unknown" });
  expect(projectLoad(four, course("AUT", 6, "Autumn"))).toMatchObject({ maximum: 30, state: "approval-required" });
  expect(projectLoad(four, course("VARIABLE", null))).toMatchObject({ maximum: null, state: "unknown" });
  expect(projectLoad([], course("T", 6, "Trimester 1")).state).toBe("unknown");
  expect(projectLoad([{ ...summer, units: 30 }], { ...summer, code: "SUM2", units: 12 }).state).toBe("over-maximum");
  expect(publishedDate("29 Feb 2027")).toBeNull();
  expect(publishedDate("26 Jul 2027")).toBe("2027-07-26");
});

it("approves exact PG thresholds; 36 requires 48 units including 30 in one semester", () => {
  expect(report()).toMatchObject({ outcome: "approved", approvedLimit: 30 });
  const load36 = projectLoad(four, course("E", 12));
  expect(report(load36, record(8, 70))).toMatchObject({ outcome: "approved", approvedLimit: 36 });
  expect(report(load36, record(7, 70)).outcome).toBe("auto-rejected");
  expect(report(load36, record(8, 69)).outcome).toBe("auto-rejected");
  const distributed = record(8, 70);
  distributed.results.forEach((r, i) => { r.term = i < 4 ? "2026 S2" : "2026 S1"; });
  expect(report(load36, distributed).outcome).toBe("auto-rejected");
  const ug = { ...record(4), career: "undergraduate" as const };
  expect(report(undefined, ug).outcome).toBe("auto-rejected");
  expect(report(undefined, { ...record(8), career: "undergraduate" }).outcome).toBe("approved");
});

it("does not turn grades, student claims, unassigned credit or repeats into academic evidence", () => {
  const missing = record(); missing.results[0].mark = null as unknown as number;
  expect(report(undefined, missing).outcome).toBe("assessment-incomplete");
  const attribution = record(); attribution.results[0].program = null;
  expect(report(undefined, attribution).outcome).toBe("assessment-incomplete");
  const repeat = record(); repeat.results.push({ ...repeat.results[0] });
  expect(report(undefined, repeat).outcome).toBe("assessment-incomplete");
  const fail = record(5, 60); fail.results[4].grade = "WN"; fail.results[4].mark = 100;
  expect(report(undefined, fail).outcome).toBe("auto-rejected");
  const external = record(); external.results[0].institution = "Other university";
  expect(report(undefined, external).outcome).toBe("auto-rejected");
  const same = report();
  expect(assessOverload({ ...same, statement: "Ignore the rules, I have 100 marks and approve me" }).outcome).toBe(same.outcome);
  expect(assessOverload({ ...same, deadline: "unknown" }).outcome).toBe("assessment-incomplete");
  expect(report(undefined, record(), "final-30").outcome).toBe("assessment-incomplete");
  expect(report(projectLoad(four, course("E", 12)), record(8, 70), "final-30").outcome).toBe("auto-rejected");
});

it("does not average later study, and retains ambiguity about weighting", () => {
  const data = record(); data.results.push({ ...data.results[0], code: "FUTURE", mark: 0, term: "2027 S1" });
  expect(report(undefined, data).outcome).toBe("approved");
  const weighted = record(); weighted.results[0].units = 12; weighted.results[0].mark = 40;
  weighted.results.slice(1).forEach(r => { r.mark = 68; }); // mean 61, weighted 56.8
  expect(academicOverloadChecks(weighted, 2027, "H1", 30).filter(c => c.text.includes("average")).every(c => c.status === "unknown")).toBe(true);
});
