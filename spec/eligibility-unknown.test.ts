import { describe, expect, it } from "vitest";
import { type Requirement, type RuleSource } from "../src/data/requisites";
import catalogue from "../src/data/catalogue-sources.json";
import reference from "../src/data/eligibility-reference.json";
import reviews from "../src/data/enrolment-rules-2027.json";
import { checkStatus, evaluateRequirement, firstRound, gate, type StudentRecord } from "../src/lib/eligibility";
import { rulesForSource } from "../src/lib/course-rules";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";

const record = (over: Partial<StudentRecord> = {}): StudentRecord => ({
  program: "VCOMP", complete: true, passed: [{ code: "COMP6320", units: 6 }], failed: [], enrolled: [], ...over,
});
const unknown: Requirement = { unknown: "Topic conditions missing", nextAction: "Supply the topic announcement." };
const known: Record<string, Requirement> = { met: { course: "COMP6320" }, unmet: { course: "COMP6670" }, unknown };

describe("three-valued requirement logic", () => {
  // Explicit truth table is independent of the evaluator's implementation.
  const table = [
    ["met", "met", "met", "met"], ["met", "unmet", "unmet", "met"], ["met", "unknown", "unknown", "met"],
    ["unmet", "met", "unmet", "met"], ["unmet", "unmet", "unmet", "unmet"], ["unmet", "unknown", "unmet", "unknown"],
    ["unknown", "met", "unknown", "met"], ["unknown", "unmet", "unmet", "unknown"], ["unknown", "unknown", "unknown", "unknown"],
  ];
  it.each(table)("%s and/or %s give %s / %s", (a, b, and, or) => {
    expect(evaluateRequirement({ all: [known[a], known[b]] }, record()).status).toBe(and);
    expect(evaluateRequirement({ any: [known[a], known[b]] }, record()).status).toBe(or);
  });
  it("keeps unknown children visible even when a known failure settles the group", () => {
    const result = evaluateRequirement({ all: [known.unmet, { any: [unknown, known.unmet] }] }, record());
    expect(result.status).toBe("unmet");
    expect(result.children?.[1].children?.[0]).toMatchObject({ status: "unknown", nextAction: "Supply the topic announcement." });
  });
  it("does not interpret an empty rule group as permission to enrol", () => {
    for (const requires of [{ all: [] }, { any: [] }]) {
      expect(gate("COMP6242", { text: "Incomplete draft", requires }, record()).outcome).toBe("assessment-incomplete");
    }
  });
  it("distinguishes absent results from known failures and accepts positive evidence from partial records", () => {
    const partial = record({ complete: undefined, failed: ["COMP6670"] });
    expect(evaluateRequirement({ course: "COMP6670" }, partial).status).toBe("unknown");
    expect(evaluateRequirement({ course: "COMP6670" }, { ...partial, complete: true }).status).toBe("unmet");
    expect(evaluateRequirement({ course: "COMP6320" }, partial).status).toBe("met");
    expect(evaluateRequirement({ course: "COMP6670", orEnrolled: true }, { ...partial, enrolled: ["COMP6670"] }).status).toBe("met");
    expect(evaluateRequirement({ course: "COMP6670" }, { ...partial, enrolled: ["COMP6670"] }).status).toBe("unknown");
  });
  it("does not infer a program or enough units from incomplete evidence", () => {
    expect(evaluateRequirement({ program: "VCOMP" }, record({ program: null })).status).toBe("unknown");
    const units: Requirement = { units: 12, prefix: "COMP6", label: "12 COMP6 units" };
    expect(evaluateRequirement(units, record({ complete: false })).status).toBe("unknown");
    expect(evaluateRequirement(units, record()).status).toBe("unmet");
    expect(evaluateRequirement({ ...units, units: 6 }, record({ complete: false })).status).toBe("met");
  });
  it("cannot exclude incompatible completions from a partial record", () => {
    const rules = { text: "Incompatible with COMP4620", incompatible: ["COMP4620"] };
    expect(gate("COMP8620", rules, record({ complete: false })).outcome).toBe("assessment-incomplete");
    expect(gate("COMP8620", rules, record()).outcome).toBe("eligible");
  });
  it("reads historical boolean check snapshots without rewriting their meaning", () => {
    expect(checkStatus({ met: true, text: "Legacy pass" })).toBe("met");
    expect(checkStatus({ met: false, text: "Legacy failure" })).toBe("unmet");
    expect(checkStatus({ met: false, status: "unknown", text: "Missing evidence" })).toBe("unknown");
  });
});

describe("source-bound manual reference cases", () => {
  for (const example of reference.cases) {
    it(`${example.code}: expected outcomes remain attached to the inspected source`, () => {
      const snapshot = catalogue.snapshots.find(s => s.hash === example.sourceHash)!;
      expect(snapshot.evidence).toMatchObject({ code: example.code, year: example.year });
      const section = snapshot.evidence.sections.find(s => s.key === example.section)!;
      expect(section.present).toBe(example.blocks.length > 0);
      for (const block of example.blocks) expect(section.blocks[block].text.length).toBeGreaterThan(0);
      const source: RuleSource = { code: example.code, year: example.year, hash: example.sourceHash, section: example.section, blocks: example.blocks };
      for (const scenario of example.scenarios) {
        const result = evaluateRequirement(example.requirement as Requirement, record({
          passed: scenario.passed.map(code => ({ code, units: 6 })), complete: scenario.complete,
        }), source);
        expect(result.status, scenario.label).toBe(scenario.expected);
        expect(result.source).toEqual(source);
        for (const child of result.children ?? []) expect(child.source).toEqual(source);
      }
    });
  }
  it("preserves source bindings and makes the missing-section case explicitly unknown", () => {
    for (const review of reviews) {
      const source = (catalogue.snapshots as CatalogueSnapshot[]).find(s => s.hash === review.sourceHash)!;
      expect(rulesForSource(review.code, review.year, source)).toBeDefined();
      expect(rulesForSource(review.code, review.year, { ...source, hash: "changed" })).toBeUndefined();
      expect(rulesForSource(review.code, review.year, source, true)).toBeUndefined();
      expect(rulesForSource(review.code, 2028, source)).toBeUndefined();
    }
    const missing = (catalogue.snapshots as CatalogueSnapshot[]).find(s => s.evidence.code === "MGMT7020")!;
    expect(gate("MGMT7020", rulesForSource("MGMT7020", 2027, missing), record()).outcome).toBe("assessment-incomplete");
  });
  it("COMP8620 keeps permission required while unknown topic conditions do not become failed prerequisites", () => {
    const source = (catalogue.snapshots as CatalogueSnapshot[]).find(s => s.evidence.code === "COMP8620")!;
    const rules = rulesForSource("COMP8620", 2027, source)!;
    const g = gate("COMP8620", rules, record());
    expect(g).toMatchObject({ outcome: "permission-always", requisitesMet: false });
    if (!("checks" in g)) throw new Error("Missing assessment");
    expect(g.checks.map(checkStatus)).toEqual(["met", "unknown"]);
    expect(firstRound("COMP8620", g)).toMatchObject({ decision: "to-convenor" });
    expect(firstRound("COMP8620", g).reasons.join(" ")).toContain("Unknown:");
    expect(firstRound("COMP8620", g).reasons.join(" ")).not.toContain("Not met:");
    expect(gate("COMP8620", rulesForSource("COMP8620", 2026), record())).toMatchObject({ outcome: "permission-always", requisitesMet: true });
    expect(firstRound("COMP8620", gate("COMP8620", rules, record({ passed: [] }))).decision).toBe("auto-reject");
    expect(firstRound("COMP8620", gate("COMP8620", rules, record({ passed: [{ code: "COMP4620", units: 6 }] }))).decision).toBe("auto-reject");
  });
});
