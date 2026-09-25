import {
  type CourseRules,
  PROGRAMS,
  type ProgramKey,
  type Requirement,
  type RuleSource,
} from "../data/requisites";

// The gate, as pure functions: a student's record and a course's rules in,
// an outcome and its reasons out. No database, no request — pages and API
// routes call this and never re-derive eligibility themselves (CLAUDE.md).

export interface StudentRecord {
  program: ProgramKey | null;
  /** Complete within this fictional scenario, not verified university history.
   * Without this declaration, absent results remain unknown. */
  complete?: boolean;
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
  /** Optional only for historical snapshots saved before three-valued results. */
  status?: ConditionStatus;
  source?: RuleSource;
  evidence?: string[];
  nextAction?: string;
  children?: RequirementResult[];
  kind?: "incompatibility";
}

export type ConditionStatus = "met" | "unmet" | "unknown";
export interface RequirementResult extends Check {
  status: ConditionStatus;
  evidence: string[];
}

export const checkStatus = (c: Check): ConditionStatus => c.status ?? (c.met ? "met" : "unmet");

export type Gate =
  | { outcome: "already"; text: string }
  | { outcome: "not-recorded"; checks: Check[] }
  | { outcome: "eligible"; checks: Check[] }
  | { outcome: "assessment-incomplete"; checks: Check[]; incompatible: string[] }
  | { outcome: "rules-not-met"; checks: Check[]; incompatible: string[] }
  | {
      outcome: "permission-always";
      checks: Check[];
      incompatible: string[];
      requisitesMet: boolean;
      reviewNote?: string;
    };

/** Offering availability is checked separately, before accepting a request. */
export const canRequestAssessment = (g: Gate): boolean => g.outcome !== "already" && g.outcome !== "eligible";

export function gate(courseCode: string, rules: CourseRules | undefined, s: StudentRecord, publishedSource?: RuleSource): Gate {
  if (s.passed.some((p) => p.code === courseCode)) {
    return { outcome: "already", text: `You've already passed ${courseCode}.` };
  }
  if (s.enrolled.includes(courseCode)) {
    return { outcome: "already", text: `You're already enrolled in ${courseCode}.` };
  }
  if (!rules) return { outcome: "not-recorded", checks: [{
    met: false, status: "unknown",
    text: `Eligibility conditions for ${courseCode} have not been interpreted`,
    evidence: [], ...(publishedSource ? { source: publishedSource } : {}),
    nextAction: "The prototype needs a reviewed interpretation of this course's saved requirements. This is a gap in the automatic checks; changing your explanation cannot resolve it.",
  }] };

  const checks: Check[] = rules.requires ? topLevel(rules.requires).map((r) => evaluateRequirement(r, s, rules.source)) : [];
  const passedCodes = new Set(s.passed.map((p) => p.code));
  const completedConflicts = (rules.incompatible ?? []).filter((c) => passedCodes.has(c));
  const enrolledConflicts = (rules.incompatibleEnrolled ?? []).filter(c => s.enrolled.includes(c) && !completedConflicts.includes(c));
  const incompatible = [...new Set([...completedConflicts, ...enrolledConflicts])];
  for (const code of completedConflicts) {
    checks.push({ met: false, status: "unmet", kind: "incompatibility", text: `You've passed ${code}, which is incompatible with ${courseCode}`, source: rules.source, evidence: [`Passed ${code}`],
      nextAction: "Choose a course compatible with your completed study. If this result is incorrect, request a record correction; completing more prerequisites does not remove an incompatibility." });
  }
  for (const code of enrolledConflicts) {
    checks.push({ met: false, status: "unmet", kind: "incompatibility", text: `You're currently enrolled in ${code}, which cannot be taken together with ${courseCode}`, source: rules.source,
      evidence: [`Currently enrolled in ${code} for this assessment's offering period`],
      nextAction: "Review the conflicting enrolment for this term. If the record is incorrect, request a correction; automatic assessment cannot override the conflict." });
  }
  if (s.complete !== true && ((rules.incompatible ?? []).some(c => !passedCodes.has(c)) || (rules.incompatibleEnrolled ?? []).some(c => !s.enrolled.includes(c)))) {
    checks.push({ met: false, status: "unknown", text: "The incomplete record cannot exclude all incompatible courses", source: rules.source,
      evidence: [], nextAction: "Supply a complete completion record for the incompatibility check." });
  }
  const requisitesMet = checks.every((c) => c.met);

  if (rules.permissionAlways) {
    return { outcome: "permission-always", checks, incompatible, requisitesMet, ...(rules.reviewNote ? { reviewNote: rules.reviewNote } : {}) };
  }
  if (checks.some(c => checkStatus(c) === "unmet")) return { outcome: "rules-not-met", checks, incompatible };
  if (!requisitesMet) return { outcome: "assessment-incomplete", checks, incompatible };
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
        decision: "to-convenor",
        reasons: [`Assessment incomplete: an automatic eligibility check is unavailable for ${courseCode}.`,
          "The published requirements and any permission requirement need interpretation; this is not an approval or a rejection."],
      };
    case "eligible":
      return {
        decision: "auto-reject",
        reasons: [`You meet ${courseCode}'s requisites, so you don't need a permission code: enrol directly.`],
      };
    case "rules-not-met":
    case "assessment-incomplete":
    case "permission-always": {
      if (g.incompatible.length > 0) {
        return {
          decision: "auto-reject",
          reasons: g.checks.filter(c => c.kind === "incompatibility" && checkStatus(c) === "unmet").map(
            (c) => `${c.text}. This prototype treats incompatibility as a hard bar.`,
          ),
        };
      }
      const unmet = g.checks.filter((c) => checkStatus(c) === "unmet").map((c) => `Not met: ${c.text}`);
      const unknown = g.checks.filter((c) => checkStatus(c) === "unknown")
        .map((c) => `Unknown: ${c.text}${c.nextAction ? `. ${c.nextAction}` : ""}`);
      if (g.outcome === "permission-always") {
        // ANU's wording for these courses: "Students who meet the
        // pre-requisites can request a permission code".
        if (unmet.length > 0) {
          return {
            decision: "auto-reject",
            reasons: [`This prototype's first-round policy requires the recorded prerequisites for ${courseCode}.`, ...unmet, ...unknown],
          };
        }
        return {
          decision: "to-convenor",
          reasons: [
            unknown.length ? `Assessment incomplete. ${courseCode} needs a permission code from every student.` : `${g.reviewNote ? "Base prerequisites met" : "Requisites met"}. ${courseCode} needs a permission code from every student.`,
            ...g.checks.filter(c => checkStatus(c) === "met").map(c => `Met: ${c.text}`),
            ...unknown, ...(g.reviewNote ? [g.reviewNote] : []),
          ],
        };
      }
      return {
        decision: "to-convenor",
        reasons: [...unmet, ...unknown, "The convenor decides whether your case covers what's missing."],
      };
    }
  }
}

// --- the requirement tree -------------------------------------------------

/** An `all` at the root is shown as separate checklist lines; anything else
 *  is one line. */
function topLevel(r: Requirement): Requirement[] {
  return "all" in r && r.all.length ? r.all.map(child => ({ ...child, source: child.source ?? r.source })) : [r];
}

export function satisfied(r: Requirement, s: StudentRecord): boolean {
  return evaluateRequirement(r, s).status === "met";
}

/** The same evaluator powers the gate and the future rule-authoring benchmark.
 * Unknown evidence is neither a successful condition nor a known failure. */
export function evaluateRequirement(r: Requirement, s: StudentRecord, inheritedSource?: RuleSource): RequirementResult {
  const source = r.source ?? inheritedSource;
  const result = (status: ConditionStatus, evidence: string[] = [], nextAction?: string): RequirementResult => ({
    met: status === "met", status, text: describe(r, s), evidence,
    ...(source ? { source } : {}), ...(nextAction ? { nextAction } : {}),
  });
  if ("all" in r || "any" in r) {
    const children = ("all" in r ? r.all : r.any).map(child => evaluateRequirement(child, s, source));
    if (!children.length) return result("unknown", [], "Complete the empty requirement group before assessment.");
    const states = children.map(child => child.status);
    const status: ConditionStatus = "all" in r
      ? states.includes("unmet") ? "unmet" : states.includes("unknown") ? "unknown" : "met"
      : states.includes("met") ? "met" : states.includes("unknown") ? "unknown" : "unmet";
    return { ...result(status, children.flatMap(child => child.evidence), status === "unknown"
      ? [...new Set(children.flatMap(child => child.nextAction ? [child.nextAction] : []))].join(" ") : undefined), children };
  }
  if ("unknown" in r) return result("unknown", [], r.nextAction);
  if ("course" in r) {
    if (s.passed.some(p => p.code === r.course)) return result("met", [`Passed ${r.course}`]);
    if (r.orEnrolled && s.enrolled.includes(r.course)) return result("met", [`Currently enrolled in ${r.course} for this assessment's offering period`]);
    const evidence = s.failed.includes(r.course) ? [`An unsuccessful attempt at ${r.course} is recorded`] : [];
    return s.complete === true
      ? result("unmet", [...evidence, "No qualifying result in the complete fictional record"])
      : result("unknown", evidence, `Supply completion${r.orEnrolled ? " or current enrolment" : ""} evidence for ${r.course}, or confirm the fictional record is complete.`);
  }
  if ("program" in r) return s.program === null
    ? result("unknown", [], "Supply the student's program.")
    : result(s.program === r.program ? "met" : "unmet", [`Recorded program: ${s.program}`]);
  const units = passedUnits(r.prefix, s);
  const evidence = s.passed.filter(p => p.code.startsWith(r.prefix)).map(p => `${p.code}: ${p.units} passed units`);
  if (units >= r.units) return result("met", evidence);
  return s.complete === true ? result("unmet", evidence)
    : result("unknown", evidence, "Supply the remaining results or confirm the fictional record is complete.");
}

function passedUnits(prefix: string, s: StudentRecord): number {
  return s.passed.filter((p) => p.code.startsWith(prefix)).reduce((n, p) => n + p.units, 0);
}

/** Plain-language requirement text, with the student's own standing noted
 *  where it helps ("you have 6"). */
function describe(r: Requirement, s: StudentRecord, nested = false): string {
  if ("unknown" in r) return r.unknown;
  if ("all" in r || "any" in r) {
    if (!("all" in r ? r.all : r.any).length) return "An empty requirement group needs interpretation";
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
