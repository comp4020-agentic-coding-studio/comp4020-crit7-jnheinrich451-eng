import { describe, expect, it } from "vitest";
import { REQUISITES } from "../src/data/requisites";
import { firstRound, gate, type StudentRecord } from "../src/lib/eligibility";

// The gate against ANU's real, transcribed rules. Each case is a sentence of
// the requisite text read literally; if a transcription or the evaluator
// drifts, the sentence it broke is named here.

const student = (over: Partial<StudentRecord> = {}): StudentRecord => ({
  program: "MCOMP",
  complete: true,
  passed: [],
  failed: [],
  enrolled: [],
  ...over,
});
const passed = (...codes: string[]) => codes.map((code) => ({ code, units: 6 }));
const run = (code: string, s: StudentRecord) => gate(code, REQUISITES[code], s);

describe("the three gate outcomes", () => {
  it("eligible: COMP6466 lets a Master of Computing student straight in", () => {
    expect(run("COMP6466", student()).outcome).toBe("eligible");
  });

  it("rules not met: COMP6242 names each unmet group", () => {
    const g = run("COMP6242", student({ passed: passed("COMP6710") }));
    expect(g.outcome).toBe("rules-not-met");
    if (g.outcome !== "rules-not-met") return;
    const unmet = g.checks.filter((c) => !c.met).map((c) => c.text);
    expect(unmet).toEqual(["one of COMP3670, COMP6670 or COMP8410"]);
  });

  it("permission always: COMP8620 needs a code even when requisites are met", () => {
    const g = run("COMP8620", student({ passed: passed("COMP6320") }));
    expect(g).toMatchObject({ outcome: "permission-always", requisitesMet: true });
  });

  it("courses without recorded rules say so instead of guessing", () => {
    expect(run("COMP6120", student()).outcome).toBe("not-recorded");
  });
});

describe("requisite shapes", () => {
  it("COMP6361: the program alternative stands in for both courses", () => {
    expect(run("COMP6361", student({ program: "VCOMP" })).outcome).toBe("eligible");
    expect(run("COMP6361", student({ passed: passed("COMP6442") })).outcome).toBe("rules-not-met");
    expect(run("COMP6361", student({ passed: passed("COMP6442", "COMP6260") })).outcome).toBe("eligible");
  });

  it("COMP6320: COMP6262 counts while currently enrolled", () => {
    const s = student({ passed: passed("COMP6710"), enrolled: ["COMP6262"] });
    expect(run("COMP6320", s).outcome).toBe("eligible");
  });

  it("COMP8535: counts passed units of 6000-level COMP courses", () => {
    const six = student({ program: "VCOMP", passed: passed("COMP6710") });
    const g = run("COMP8535", six);
    expect(g.outcome).toBe("rules-not-met");
    if (g.outcome === "rules-not-met") {
      expect(g.checks.find((c) => !c.met)?.text).toContain("(you have 6)");
    }
    expect(run("COMP8535", student({ program: "VCOMP", passed: passed("COMP6710", "COMP6442") })).outcome).toBe(
      "eligible",
    );
  });

  it("a failed attempt doesn't count as passed", () => {
    expect(run("COMP8600", student({ failed: ["COMP6670"] })).outcome).toBe("rules-not-met");
  });

  it("incompatibility blocks even a student who meets the requisites", () => {
    const g = run("COMP8600", student({ passed: passed("COMP6670", "COMP4670") }));
    expect(g).toMatchObject({ outcome: "rules-not-met", incompatible: ["COMP4670"] });
  });

  it("a course already passed isn't offered again", () => {
    expect(run("COMP6466", student({ passed: passed("COMP6466") })).outcome).toBe("already");
  });
});

describe("the automatic first round", () => {
  it("rejects on incompatibility, with the course named", () => {
    const r = firstRound("COMP8600", run("COMP8600", student({ passed: passed("COMP6670", "COMP4670") })));
    expect(r.decision).toBe("auto-reject");
    expect(r.reasons.join(" ")).toContain("COMP4670");
  });

  it("rejects a permission-always request whose requisites aren't met", () => {
    const r = firstRound("COMP8620", run("COMP8620", student()));
    expect(r.decision).toBe("auto-reject");
    expect(r.reasons.join(" ")).toContain("COMP6320");
  });

  it("sends a met permission-always request to the convenor", () => {
    const r = firstRound("COMP8620", run("COMP8620", student({ passed: passed("COMP3620") })));
    expect(r.decision).toBe("to-convenor");
  });

  it("sends unmet requisites to the convenor, with what's missing", () => {
    const r = firstRound("COMP6242", run("COMP6242", student()));
    expect(r.decision).toBe("to-convenor");
    expect(r.reasons.filter((x) => x.startsWith("Not met"))).toHaveLength(2);
  });

  it("tells an eligible student they don't need a code", () => {
    expect(firstRound("COMP6466", run("COMP6466", student())).decision).toBe("auto-reject");
  });
});
