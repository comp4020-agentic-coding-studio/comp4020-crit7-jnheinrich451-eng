import {
  type CourseRules,
  PROGRAMS,
  type ProgramKey,
  type Requirement,
} from "../data/requisites";

// The gate, as pure functions: a student's record and a course's rules in,
// an outcome and its reasons out. No database, no request — pages and API
// routes call this and never re-derive eligibility themselves (CLAUDE.md).

export interface StudentRecord {
  program: ProgramKey;
  /** Courses passed, with units, from the transcript. */
  passed: { code: string; units: number }[];
  /** Courses attempted and not passed. */
  failed: string[];
  /** Courses currently enrolled in. */
  enrolled: string[];
}

/** One line of the requisite checklist, as the student sees it. */
export interface Check {
  met: boolean;
  text: string;
}

export type Gate =
  | { outcome: "already"; text: string }
  | { outcome: "not-recorded" }
  | { outcome: "eligible"; checks: Check[] }
  | { outcome: "rules-not-met"; checks: Check[]; incompatible: string[] }
  | {
      outcome: "permission-always";
      checks: Check[];
      incompatible: string[];
      requisitesMet: boolean;
    };

export function gate(courseCode: string, rules: CourseRules | undefined, s: StudentRecord): Gate {
  if (s.passed.some((p) => p.code === courseCode)) {
    return { outcome: "already", text: `You've already passed ${courseCode}.` };
  }
  if (s.enrolled.includes(courseCode)) {
    return { outcome: "already", text: `You're already enrolled in ${courseCode}.` };
  }
  if (!rules) return { outcome: "not-recorded" };

  const checks = rules.requires ? topLevel(rules.requires).map((r) => check(r, s)) : [];
  const passedCodes = new Set(s.passed.map((p) => p.code));
  const incompatible = (rules.incompatible ?? []).filter((c) => passedCodes.has(c));
  for (const code of incompatible) {
    checks.push({ met: false, text: `You've passed ${code}, which is incompatible with ${courseCode}` });
  }
  const requisitesMet = checks.every((c) => c.met);

  if (rules.permissionAlways) {
    return { outcome: "permission-always", checks, incompatible, requisitesMet };
  }
  if (!requisitesMet) return { outcome: "rules-not-met", checks, incompatible };
  return { outcome: "eligible", checks };
}

export type FirstRound =
  | { decision: "auto-reject"; reasons: string[] }
  | { decision: "to-convenor"; reasons: string[] };

/** The automatic first round an application gets before any person sees it.
 *  Only rules the record can settle reject here; anything that needs a
 *  judgement (an equivalent course elsewhere, say) goes to the convenor. */
export function firstRound(courseCode: string, g: Gate): FirstRound {
  switch (g.outcome) {
    case "already":
      return { decision: "auto-reject", reasons: [g.text] };
    case "not-recorded":
      return {
        decision: "auto-reject",
        reasons: [`${courseCode}'s requisites aren't recorded in this prototype, so it can't be checked.`],
      };
    case "eligible":
      return {
        decision: "auto-reject",
        reasons: [`You meet ${courseCode}'s requisites, so you don't need a permission code: enrol directly.`],
      };
    case "rules-not-met":
    case "permission-always": {
      if (g.incompatible.length > 0) {
        return {
          decision: "auto-reject",
          reasons: g.incompatible.map(
            (c) => `You've passed ${c}, which is incompatible with ${courseCode}. This prototype treats incompatibility as a hard bar.`,
          ),
        };
      }
      const unmet = g.checks.filter((c) => !c.met).map((c) => `Not met: ${c.text}`);
      if (g.outcome === "permission-always") {
        // ANU's wording for these courses: "Students who meet the
        // pre-requisites can request a permission code".
        if (unmet.length > 0) {
          return {
            decision: "auto-reject",
            reasons: [`${courseCode} only issues permission codes to students who meet its requisites.`, ...unmet],
          };
        }
        return {
          decision: "to-convenor",
          reasons: [`Requisites met. ${courseCode} needs a permission code from every student.`],
        };
      }
      return {
        decision: "to-convenor",
        reasons: [...unmet, "The convenor decides whether your case covers what's missing."],
      };
    }
  }
}

// --- the requirement tree -------------------------------------------------

/** An `all` at the root is shown as separate checklist lines; anything else
 *  is one line. */
function topLevel(r: Requirement): Requirement[] {
  return "all" in r ? r.all : [r];
}

function check(r: Requirement, s: StudentRecord): Check {
  return { met: satisfied(r, s), text: describe(r, s) };
}

export function satisfied(r: Requirement, s: StudentRecord): boolean {
  if ("all" in r) return r.all.every((x) => satisfied(x, s));
  if ("any" in r) return r.any.some((x) => satisfied(x, s));
  if ("course" in r) {
    return (
      s.passed.some((p) => p.code === r.course) ||
      (r.orEnrolled === true && s.enrolled.includes(r.course))
    );
  }
  if ("program" in r) return s.program === r.program;
  return passedUnits(r.prefix, s) >= r.units;
}

function passedUnits(prefix: string, s: StudentRecord): number {
  return s.passed.filter((p) => p.code.startsWith(prefix)).reduce((n, p) => n + p.units, 0);
}

/** Plain-language requirement text, with the student's own standing noted
 *  where it helps ("you have 6"). */
function describe(r: Requirement, s: StudentRecord, nested = false): string {
  if ("all" in r || "any" in r) {
    const parts = ("all" in r ? r.all : r.any).map((x) => describe(x, s, true));
    const joined = joinList(parts, "all" in r ? "and" : "or");
    const text = "any" in r && !nested ? `one of ${joined}` : joined;
    return nested ? `(${text})` : text;
  }
  if ("course" in r) {
    const base = r.orEnrolled ? `${r.course} (passed or currently enrolled)` : r.course;
    return s.failed.includes(r.course) && !nested ? `${base}: attempted, not passed` : base;
  }
  if ("program" in r) return `studying the ${PROGRAMS[r.program]}`;
  return nested ? r.label : `${r.label} (you have ${passedUnits(r.prefix, s)})`;
}

function joinList(parts: string[], word: string): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${word} ${parts.at(-1)}`;
}
