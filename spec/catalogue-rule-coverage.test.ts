import { describe, expect, it } from "vitest";
import catalogue from "../src/data/catalogue-sources.json";
import reviews from "../src/data/enrolment-rules-2027.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { rulesForSource } from "../src/lib/course-rules";
import { evaluateRequirement, gate, type StudentRecord } from "../src/lib/eligibility";
import { assessDemo } from "../src/lib/demo-assessment";

const sources = (catalogue.snapshots as CatalogueSnapshot[]).filter(s => s.evidence.kind === "course");
const rules = (code: string) => rulesForSource(code, 2027, sources.find(s => s.evidence.code === code))!;
const record = (passed: string[] = [], program = "VCOMP", enrolled: string[] = []): StudentRecord => ({
  passed: passed.map(code => ({ code, units: 6 })), program, enrolled, failed: [], complete: true, academicCareer: "postgraduate",
});
const assess = (code: string, student: StudentRecord) => assessDemo({ offering: { code, courseId: 1, year: 2027, term: "S1" },
  rules: rules(code), record: student, reason: "recorded-checks", statement: "Please assess the recorded facts." });

describe("all saved course requirements are accounted for", () => {
  it("pins each of the 80 identities, preserves every explicit course mention and distinguishes source gaps", () => {
    expect(new Set(reviews.map(r => `${r.code}:${r.year}`)).size).toBe(sources.length);
    const coverage = { encoded: 0, partial: 0, "missing-source": 0 };
    for (const source of sources) {
      const review = reviews.find(r => r.code === source.evidence.code && r.sourceHash === source.hash)!;
      expect(review, source.evidence.code).toBeDefined();
      coverage[review.coverage as keyof typeof coverage]++;
      const section = source.evidence.sections.find(s => s.key === "incompatibility")!;
      for (const mention of section.blocks.flatMap(b => b.text.match(/\b[A-Z]{4}\d{4}\b/g) ?? [])) {
        expect(JSON.stringify(review.rules), `${review.code}: omitted ${mention}`).toContain(mention);
      }
      const bound = rules(review.code);
      expect(bound.source).toMatchObject({ code: review.code, year: 2027, hash: source.hash });
      if (!section.present) {
        expect(bound.source?.blocks).toEqual([]);
        expect(gate(review.code, bound, record()).outcome).toBe("assessment-incomplete");
        expect(assess(review.code, record()).outcome).toBe("assessment-incomplete");
      }
    }
    expect(coverage).toEqual({ encoded: 62, partial: 16, "missing-source": 2 });
  });

  // Expected cases are authored from the paragraphs, not generated from rule trees.
  const cases: [string, string[], string, string, string[]?][] = [
    ["COMP6034", ["COMP6800"], "VCOMP", "eligible"],
    ["COMP6034", ["COMP2700"], "MCOMP", "rules-not-met"],
    ["COMP6120", [], "MCOMP", "eligible", ["COMP6442"]],
    ["COMP6120", ["COMP2100", "COMP2120"], "VCOMP", "rules-not-met"],
    ["COMP6250", [], "GDCOMP", "eligible"],
    ["COMP6260", [], "VCOMP", "eligible"],
    ["COMP6260", ["COMP1600"], "VCOMP", "rules-not-met"],
    ["COMP6261", ["ENGN8534"], "VCOMP", "rules-not-met"],
    ["COMP6300", [], "VCOMP", "eligible"],
    ["COMP6300", ["COMP1110"], "GDCOMP", "eligible"],
    ["COMP6310", ["COMP6300"], "VCOMP", "rules-not-met"],
    ["COMP6310", ["COMP6300", "COMP1110"], "VCOMP", "eligible"],
    ["COMP6330", [], "MCOMP", "eligible", ["COMP6300"]],
    ["COMP6330", [], "MCOMP", "rules-not-met", ["COMP2300"]],
    ["COMP6331", ["COMP6442"], "VCOMP", "eligible"],
    ["COMP6363", [], "MMLCV", "rules-not-met"],
    ["COMP6390", ["COMP6710"], "MMLCV", "eligible"],
    ["COMP6434", ["COMP6710", "COMP6240"], "VCOMP", "eligible"],
    ["COMP6434", ["COMP6710"], "VCOMP", "rules-not-met"],
    ["COMP6442", [], "VCOMP", "eligible"],
    ["COMP6442", ["COMP6710"], "MCOMP", "eligible", ["MATH6005"]],
    ["COMP6442", ["COMP6710"], "MMLCV", "eligible"],
    ["COMP6442", ["COMP6710"], "MCOMP", "rules-not-met"],
    ["COMP6470", [], "VCOMP", "permission-always"],
    ["COMP6490", [], "VCOMP", "assessment-incomplete"],
    ["COMP6490", ["COMP6710"], "VCOMP", "eligible"],
    ["COMP6670", [], "MCOMP", "eligible", ["COMP6730"]],
    ["COMP6670", [], "MCOMP", "rules-not-met", ["COMP1110"]],
    ["COMP6710", [], "VCOMP", "rules-not-met"],
    ["COMP6710", [], "MCOMP", "eligible"],
    ["COMP6720", ["COMP1720"], "VCOMP", "rules-not-met"],
    ["COMP6730", ["COMP6710"], "VCOMP", "rules-not-met"],
    ["COMP6780", [], "VCOMP", "eligible"],
    ["COMP6800", [], "VCOMP", "eligible"],
    ["COMP6800", [], "MCOMP", "rules-not-met"],
    ["COMP8011", ["COMP6240", "COMP6710"], "VCOMP", "permission-always"],
    ["COMP8020", ["COMP6390"], "VCOMP", "permission-always"],
    ["COMP8045", ["COMP6240", "COMP6710"], "VCOMP", "permission-always"],
    ["COMP8131", ["COMP6800"], "VCOMP", "eligible"],
    ["COMP8260", [], "GDCOMP", "eligible"],
    ["COMP8350", ["COMP6720"], "VCOMP", "eligible"],
    ["COMP8430", ["COMP6710", "COMP6240"], "VCOMP", "assessment-incomplete"],
    ["COMP8460", ["COMP3600"], "VCOMP", "eligible"],
    ["COMP8490", [], "VCOMP", "assessment-incomplete"],
    ["COMP8500", ["COMP6442", "COMP8260"], "MCOMP", "eligible", ["COMP6120"]],
    ["COMP8500", ["COMP6442", "COMP6250"], "MMLCV", "eligible"],
    ["COMP8500", ["COMP6442", "COMP6250"], "MCOMP", "rules-not-met", ["COMP6120"]],
    ["COMP8536", ["COMP6710"], "VCOMP", "eligible"],
    ["COMP8536", [], "VCOMP", "assessment-incomplete"],
    ["COMP8536", ["COMP6710"], "MCOMP", "rules-not-met"],
    ["COMP8539", ["ENGN4528"], "VCOMP", "eligible"],
    ["COMP8539", ["ENGN6528"], "VCOMP", "rules-not-met"],
    ["COMP8610", [], "VCOMP", "eligible"],
    ["COMP8610", ["COMP6710"], "MMLCV", "eligible"],
    ["COMP8610", ["COMP6710", "COMP6390"], "MCOMP", "eligible"],
    ["COMP8650", ["COMP6670"], "VCOMP", "permission-always"],
    ["COMP8703", ["COMP3704"], "VCOMP", "eligible"],
    ["COMP8703", ["COMP3704"], "MCOMP", "rules-not-met"],
    ["COMP8712", ["COMP6442", "COMP6310"], "MCOMP", "eligible"],
    ["COMP8712", ["COMP6442", "COMP6310", "COMP3710"], "MCOMP", "permission-conditional"],
    ["COMP8715", ["COMP6442", "COMP6250"], "MMLCV", "assessment-incomplete"],
    ["COMP8800", [], "VCOMP", "permission-always"],
    ["COMP8820", [], "VCOMP", "permission-always"],
    ["COMP8830", ["COMP6442", "COMP6250"], "MMLCV", "permission-always"],
    ["COMP8880", ["COMP6670"], "VCOMP", "eligible"],
    ["COMP8980", ["COMP6670"], "VCOMP", "assessment-incomplete"],
    ["COMP8980", ["COMP6670", "COMP8410", "STAT6039"], "MADAN", "eligible"],
    ["COMP8980", [], "VCOMP", "rules-not-met"],
    ["ENGN6213", [], "VCOMP", "eligible"],
    ["ENGN6528", [], "VCOMP", "rules-not-met"],
    ["ENGN6528", [], "Master of Engineering", "eligible"],
    ["ENGN6627", [], "Master of Engineering", "rules-not-met"],
    ["ENGN6627", [], "MMLCV", "eligible"],
    ["ENGN8100", [], "Master of Project Management", "eligible"],
    ["ENGN9820", [], "VCOMP", "permission-always"],
    ["ENVS6025", ["ENVS3040"], "VCOMP", "rules-not-met"],
    ["INFS8004", [], "MMGNT", "eligible"],
    ["INFS8004", ["INFS7004"], "VCOMP", "eligible"],
    ["INFS8205", ["INFS8008"], "VCOMP", "eligible"],
    ["LAWS8445", [], "VCOMP", "permission-conditional"],
    ["MATH6005", [], "MCOMP", "eligible"],
    ["MATH6005", [], "VCOMP", "assessment-incomplete"],
    ["MATH6111", [], "VCOMP", "permission-always"],
    ["MATH6112", [], "VCOMP", "permission-always"],
    ["MATH6114", [], "VCOMP", "permission-always"],
    ["MATH6213", [], "VCOMP", "permission-always"],
    ["MATH6406", [], "VCOMP", "permission-always"],
    ["MATH8201", [], "Master of Science in Astronomy and Astrophysics", "eligible"],
    ["MATH8343", [], "VCOMP", "rules-not-met"],
    ["MGMT7020", [], "VCOMP", "assessment-incomplete"],
    ["REGN8014", [], "VCOMP", "assessment-incomplete"],
  ];
  it.each(cases)("%s with passes %j in %s gives %s (current %j)", (code, passed, program, outcome, enrolled) => {
    expect(gate(code, rules(code), record(passed, program, enrolled)).outcome).toBe(outcome);
  });
});

describe("new operators and evidence boundaries", () => {
  it("keeps program negation, academic career and partial records three-valued", () => {
    expect(gate("COMP6710", rules("COMP6710"), { ...record(), program: null }).outcome).toBe("assessment-incomplete");
    expect(gate("COMP6780", rules("COMP6780"), { ...record(), academicCareer: undefined }).outcome).toBe("assessment-incomplete");
    expect(gate("COMP6780", rules("COMP6780"), { ...record(), academicCareer: "undergraduate" }).outcome).toBe("rules-not-met");
    expect(gate("COMP8712", rules("COMP8712"), { ...record(["COMP6442", "COMP6310"]), complete: false }).outcome).toBe("assessment-incomplete");
    expect(gate("COMP8712", rules("COMP8712"), { ...record(["COMP6442", "COMP6310", "COMP3710"]), complete: false }).outcome).toBe("permission-conditional");
  });
  it("counts the stated credit list and level, without treating enrolment or repeated rows as extra passed credit", () => {
    const short = record(["COMP6710", "COMP6240"]);
    short.passed[0].units = 3;
    expect(gate("COMP6434", rules("COMP6434"), short).outcome).toBe("rules-not-met");
    const requirement = { units: 12, prefix: "COMP6", label: "Twelve COMP6 units" };
    expect(evaluateRequirement(requirement, record(["COMP6710", "COMP8600"], "VCOMP", ["COMP6240"])).status).toBe("unmet");
    expect(evaluateRequirement(requirement, record(["COMP6710", "COMP6710"])).status).toBe("unknown");
    expect(evaluateRequirement(requirement, record(["COMP6710", "COMP6240"])).status).toBe("met");
    const count = { courseCount: 5, prefix: "LAWS61", orEnrolled: true as const, label: "Five LAWS61 courses" };
    const partial = record(["LAWS6101", "LAWS6102", "LAWS6103"], "MJD", ["LAWS6103", "LAWS6104"]);
    expect(evaluateRequirement(count, partial).status).toBe("unmet");
    partial.enrolled.push("LAWS6105");
    expect(evaluateRequirement(count, partial).status).toBe("met");
  });
  it("does not issue permission for missing topic, mode, equivalence, selection, marks or project evidence", () => {
    for (const [code, passes, program] of [
      ["COMP8011", ["COMP6710", "COMP6240"], "VCOMP"], ["COMP8045", ["COMP6710", "COMP6240"], "VCOMP"],
      ["COMP8020", ["COMP6390"], "VCOMP"], ["COMP8650", ["COMP6670"], "VCOMP"],
      ["COMP8430", ["COMP6710", "COMP6240"], "VCOMP"], ["COMP8536", [], "VCOMP"],
      ["COMP8715", ["COMP6442", "COMP6250"], "MMLCV"], ["COMP8830", ["COMP6442", "COMP6250"], "MMLCV"],
      ["COMP8800", ["COMP6445", "COMP8280", "COMP6710", "COMP6240", "COMP6670", "COMP6320"], "MMLCV"],
      ["MATH6213", ["MATH6110"], "VCOMP"], ["LAWS8445", [], "VCOMP"],
    ] as [string, string[], string][]) {
      const result = assess(code, record(passes, program));
      expect(result.outcome, code).toBe("assessment-incomplete");
      expect(result.nextActions.length, code).toBeGreaterThan(0);
    }
    expect(assess("COMP8800", record(["COMP6445", "COMP8280", "COMP6710", "COMP6240", "COMP6670", "COMP6320"], "MMLCV")).nextActions.join(" ")).toContain("GPA");
    expect(assess("COMP8820", record()).outcome).toBe("approved");
    expect(assess("COMP8712", record(["COMP6442", "COMP6310", "COMP3710"]))).toMatchObject({ outcome: "approved", policy: "demo-permission-v2" });
    expect(assess("COMP8712", record(["COMP3710"])).outcome).toBe("auto-rejected");
  });
});
