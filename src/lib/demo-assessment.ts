import { createHash } from "node:crypto";
import type { CourseRules, RuleSource } from "../data/requisites";
import { checkStatus, gate, type Gate, type StudentRecord } from "./eligibility";
import { UserError } from "./errors";

export const REQUEST_REASONS = {
  "recorded-checks": "Assess using my recorded results",
  "record-correction": "My record is missing or contains incorrect results",
  "equivalent-study": "I have equivalent study outside this record",
  "exception": "I am asking for an exception to a requirement",
} as const;
export type RequestReason = keyof typeof REQUEST_REASONS;
export function requestReason(value: string): RequestReason {
  if (!Object.hasOwn(REQUEST_REASONS, value)) throw new UserError("Choose a valid reason for your request.");
  return value as RequestReason;
}

// These are OUR prototype decisions, never attributed to ANU or an LLM.
export const DEMO_POLICY = "demo-permission-v2";
export const SCENARIO_KEY = "comp8620-topic-v1";
export const SCENARIO = {
  key: SCENARIO_KEY,
  label: "Fictional COMP8620 topic scenario",
  sourceHash: "76a7b02a678a1decce52c04eaef9856b11e98b17d2cd17e2f15217406eea64c6",
  courseCode: "COMP8620", year: 2027, term: "S2",
  assumptions: [
    "For this fictional topic only, the additional prerequisite is a pass in COMP6670.",
    "The scenario student has passed COMP6320 and COMP6670, with no other completed or enrolled courses.",
    "The demo policy issues permission when every scenario condition is met; it grants no exceptions.",
    "Confirmation is saved as scenario enrolment only. It does not change your profile or semester enrolments.",
  ],
};

export interface AssessmentReport {
  version: 1;
  policy: "demo-permission-v1" | typeof DEMO_POLICY;
  offering: { courseId: number; code: string; year: number; term: string };
  rules: CourseRules | null;
  rulesHash: string;
  record: StudentRecord;
  gate: Gate;
  context: { reason: RequestReason; statement: string; treatment: string };
  scenario: typeof SCENARIO | null;
  outcome: "approved" | "auto-rejected" | "assessment-incomplete";
  reasons: string[];
  nextActions: string[];
}
export const snapshotHash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Fixed input fixture, never a browser-supplied transcript or rule override. */
export function scenarioEvidence(published: CourseRules | undefined): { record: StudentRecord; rules: CourseRules } {
  if (!published || published.source?.hash !== SCENARIO.sourceHash || !published.requires || !("all" in published.requires))
    throw new UserError("This scenario needs its original reviewed COMP8620 source. Its evidence has changed.");
  return {
    record: { program: "VCOMP", complete: true, passed: [{ code: "COMP6320", units: 6 }, { code: "COMP6670", units: 6 }], failed: [], enrolled: [] },
    // Source attribution stays on the published base and incompatibility checks.
    // The fictional topic clause deliberately has no ANU source reference.
    rules: { text: "Fictional topic scenario; see the saved assumptions.", permissionAlways: true,
      requires: { all: [{ ...published.requires.all[0], source: published.source }, { course: "COMP6670" }] },
      incompatible: published.incompatible },
  };
}

/** Statement is preserved as data. Only the explicit reason changes handling;
 * no wording, persuasion, claimed grade or embedded instruction changes facts. */
export function assessDemo(input: {
  offering: AssessmentReport["offering"]; rules?: CourseRules; record: StudentRecord;
  source?: RuleSource; reason: RequestReason; statement: string; scenario?: typeof SCENARIO;
}): AssessmentReport {
  const result = gate(input.offering.code, input.rules, input.record, input.source);
  const checks = "checks" in result ? result.checks : [];
  const unmet = checks.filter(c => checkStatus(c) === "unmet");
  const unknown = checks.filter(c => checkStatus(c) === "unknown");
  let outcome: AssessmentReport["outcome"] = "assessment-incomplete";
  const reasons: string[] = [];
  const nextActions: string[] = [];
  if (input.reason !== "recorded-checks") {
    reasons.push("Your selected request reason needs evidence or a discretionary decision beyond this automatic policy.");
    nextActions.push({
      "record-correction": "Identify the incorrect result and supply a transcript or correction confirmation. This prototype cannot verify or amend university records.",
      "equivalent-study": "Supply the completed subject, transcript and syllabus for an equivalence decision. This prototype cannot award equivalence from a statement.",
      "exception": "Seek an authorised exception decision from the course contact. This demo policy cannot grant waivers.",
    }[input.reason]);
  } else if (unmet.length) {
    outcome = "auto-rejected";
    reasons.push("The demo policy does not issue permission while a recorded requirement is unmet. This is not an ANU refusal.");
    if (unmet.some(c => c.kind !== "incompatibility"))
      nextActions.push("Complete the unmet requirements, or submit a new assessment with the record-correction, equivalent-study or exception reason if applicable.");
    nextActions.push(...unmet.flatMap(c => c.nextAction ? [c.nextAction] : []));
  } else if (unknown.length || result.outcome === "not-recorded" || input.rules?.reviewNote || (!input.scenario && !input.rules?.source)) {
    reasons.push("The available evidence cannot settle every condition. No permission has been issued and no reviewer is processing this automatic assessment.");
    if (input.rules?.reviewNote) nextActions.push(input.rules.reviewNote);
    if (!input.scenario && input.rules && !input.rules.source)
      nextActions.push("This historical rule transcription has no versioned source review for automatic permission. Use staff review or the separate fictional scenario.");
  } else if ((result.outcome === "permission-always" || result.outcome === "permission-conditional") && result.requisitesMet) {
    outcome = "approved";
    reasons.push("Every recorded condition is met. Permission is issued under the demo policy, not by ANU or the course convenor.");
    nextActions.push(input.scenario ? "Confirm scenario enrolment to finish the example." : "Confirm enrolment for this offering; approval alone does not enrol you.");
  } else {
    reasons.push(result.outcome === "already" ? result.text : "No permission is needed for this course.");
    nextActions.push("Return to the course to check your enrolment.");
  }
  reasons.push(...unmet.map(c => `Unmet: ${c.text}`), ...unknown.map(c => `Unknown: ${c.text}`));
  nextActions.push(...unknown.map(c => c.nextAction ?? "Supply evidence for the unresolved condition."));
  return {
    version: 1, policy: DEMO_POLICY, offering: input.offering, rules: input.rules ?? null,
    rulesHash: snapshotHash(input.rules ?? null), record: input.record, gate: result,
    context: { reason: input.reason, statement: input.statement,
      treatment: "Your explanation is saved for reference. The automatic assessment uses your selected reason and recorded results; it does not interpret the message or verify its claims." },
    scenario: input.scenario ?? null, outcome, reasons, nextActions: [...new Set(nextActions)],
  };
}
