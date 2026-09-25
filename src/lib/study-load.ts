import policy from "../data/overload-policy.json";
import type { Check, ConditionStatus } from "./eligibility";

export const OVERLOAD_POLICY = policy;
export type HalfYear = "H1" | "H2";
export const HALF_LABELS = { H1: "First half-year", H2: "Second half-year" };
export interface LoadCourse {
  code: string; year: number; term: string; units: number | null;
  windows: { start: string; end: string }[] | null;
  sourceHash?: string;
}
export const halfOf = (term: string): HalfYear | null =>
  policy.periods.H1.includes(term) ? "H1" : policy.periods.H2.includes(term) ? "H2" : null;
export function publishedDate(value?: string): string | null {
  const match = value?.match(/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/);
  if (!match) return null;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(match[2]) + 1;
  const iso = `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const date = new Date(iso + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
const standard = (c: LoadCourse) => c.term === "S1" || c.term === "S2";
function overlap(a: LoadCourse, b: LoadCourse): boolean | null {
  if (!a.windows?.length || !b.windows?.length) return null;
  const possibilities = a.windows.flatMap(x => b.windows!.map(y => x.start <= y.end && y.start <= x.end));
  return possibilities.every(Boolean) ? true : possibilities.every(v => !v) ? false : null;
}
const knownUnits = (rows: LoadCourse[]) => rows.reduce((n, c) => n + (c.units ?? 0), 0);
const validUnits = (units: number | null) => units !== null && Number.isFinite(units) && units > 0;
export function unitRange(text?: string | null): { min: number; max: number } | null {
  const match = text?.match(/^(\d+) to (\d+) units?$/i);
  return match && Number(match[1]) > 0 && Number(match[2]) >= Number(match[1]) ? { min: Number(match[1]), max: Number(match[2]) } : null;
}
export function selectedUnits(text: string | null | undefined, selected?: number): number | null {
  const fixed = text?.match(/^(\d+) units?$/i);
  if (fixed) return Number(fixed[1]); // submitted values cannot shrink a fixed-unit course
  const range = unitRange(text);
  return range && selected !== undefined && Number.isInteger(selected) && selected >= range.min && selected <= range.max ? selected : null;
}
export function projectLoad(existing: LoadCourse[], target: LoadCourse, approvedLimit = 24) {
  const period = halfOf(target.term);
  const entries = [...new Map([...existing, target].filter(c => c.year === target.year && halfOf(c.term) === period)
    .map(c => [`${c.code}:${c.year}:${c.term}`, c])).values()];
  const semesters = entries.filter(standard), sessions = entries.filter(c => !standard(c));
  const overlapping: LoadCourse[] = [], uncertain: LoadCourse[] = [], excluded: LoadCourse[] = [];
  for (const session of sessions) {
    const matches = semesters.map(c => overlap(session, c));
    if (!semesters.length || matches.some(v => v === true)) overlapping.push(session);
    else if (matches.every(v => v === false)) excluded.push(session);
    else uncertain.push(session);
  }
  // A verified non-overlapping non-standard course does not add to semester load.
  // Non-standard courses still form their own half-year pool; this page does not
  // establish an exemption between two non-standard sessions.
  const minimum = Math.max(knownUnits([...semesters, ...overlapping]), knownUnits(sessions));
  const maximum = entries.every(c => validUnits(c.units))
    ? Math.max(knownUnits([...semesters, ...overlapping, ...uncertain]), knownUnits(sessions)) : null;
  const limit = Math.min(36, Math.max(24, approvedLimit));
  const state = minimum > 36 ? "over-maximum"
    : !period || maximum === null ? "unknown"
    : maximum <= limit ? "within-limit"
    : maximum > 36 && minimum !== maximum ? "unknown"
    : maximum > 36 ? "over-maximum"
    : minimum !== maximum ? "unknown" : "approval-required";
  return { year: target.year, period, target, entries, minimum, maximum, limit, state,
    uncertain: uncertain.map(c => c.code), excluded: excluded.map(c => c.code),
    requestedLimit: maximum !== null && maximum > 24 && maximum <= 36 ? (maximum <= 30 ? 30 : 36) : null,
  };
}
export type LoadProjection = ReturnType<typeof projectLoad>;
export const loadText = (load: LoadProjection) => load.maximum === null ? `At least ${load.minimum} units; some credit values are unknown`
  : load.minimum === load.maximum ? `${load.maximum} units` : `${load.minimum}–${load.maximum} units; session overlap is unresolved`;

export interface AcademicResult {
  code: string; grade: string; units: number; term: string;
  mark: number | null; program: string | null; institution: string | null;
}
export interface OverloadRecord {
  program: string; career: "postgraduate" | "undergraduate" | null;
  complete: boolean; results: AcademicResult[];
}
function check(text: string, status: ConditionStatus, evidence: string[] = [], nextAction?: string): Check {
  return { text, status, met: status === "met", evidence, ...(status !== "met" && nextAction ? { nextAction } : {}) };
}
function periodNumber(term: string): number | null {
  const m = term.match(/^(\d{4}) (S1|S2|Summer|Autumn|Winter|Spring)$/);
  return m ? Number(m[1]) * 2 + (halfOf(m[2]) === "H2" ? 1 : 0) : null;
}
function averageCheck(text: string, rows: AcademicResult[], threshold: number, complete: boolean): Check {
  const evidence = rows.map(r => `${r.code}, ${r.term}: ${["NCN", "WN"].includes(r.grade) ? "0 (" + r.grade + ")" : r.mark ?? "exact mark missing"}`);
  const marks = rows.map(r => ["NCN", "WN"].includes(r.grade) ? 0 : r.mark);
  if (!complete || !rows.length || marks.some(m => m === null || !Number.isFinite(m) || m < 0 || m > 100)
    || rows.some(r => !validUnits(r.units)) || new Set(rows.map(r => r.code)).size !== rows.length)
    return check(text, "unknown", evidence, "Supply exact marks, current-program attribution and a complete study-period record. Grade bands and repeated attempts are not converted into guessed averages.");
  const simple = (marks as number[]).reduce((n, m) => n + m, 0) / rows.length;
  const weighted = rows.reduce((n, r, i) => n + marks[i]! * r.units, 0) / rows.reduce((n, r) => n + r.units, 0);
  // The supplied summary does not specify weighting. Decide only if both readings agree.
  const status = simple >= threshold && weighted >= threshold ? "met"
    : simple < threshold && weighted < threshold ? "unmet" : "unknown";
  return check(text, status, [...evidence, `Course mean ${simple.toFixed(2)}%; unit-weighted mean ${weighted.toFixed(2)}%`],
    "Confirm the applicable average calculation or provide corrected academic evidence.");
}
export function academicOverloadChecks(record: OverloadRecord, year: number, period: HalfYear | null, limit: number | null): Check[] {
  if (!record.career || !period || (limit !== 30 && limit !== 36))
    return [check("Applicable overload criteria", "unknown", [], "Confirm the academic career, study period and proposed credit load. This source does not cover trimesters.")];
  const criteria = policy.criteria[record.career][String(limit) as "30" | "36"];
  const cutoff = year * 2 + (period === "H2" ? 1 : 0);
  const prior = record.results.filter(r => periodNumber(r.term) !== null && periodNumber(r.term)! < cutoff);
  const attributed = prior.filter(r => r.program === record.program);
  const complete = record.complete && record.results.every(r => periodNumber(r.term) !== null)
    && prior.every(r => r.program !== null);
  const anu = attributed.filter(r => r.institution === "ANU" && ["HD", "D", "CR", "P", "PS"].includes(r.grade));
  const creditsComplete = complete && attributed.every(r => r.institution !== null && validUnits(r.units));
  const unique = [...new Map(anu.map(r => [r.code, r])).values()];
  const bySemester = new Map<string, number>();
  for (const r of unique.filter(r => / S[12]$/.test(r.term))) bySemester.set(r.term, (bySemester.get(r.term) ?? 0) + r.units);
  const credits = unique.reduce((n, r) => n + r.units, 0), semester = Math.max(0, ...bySemester.values());
  const creditCheck = (text: string, actual: number, required: number) => check(text,
    actual >= required ? "met" : creditsComplete ? "unmet" : "unknown",
    [`${actual} explicitly attributed passed ANU units`, ...unique.map(r => `${r.code}: ${r.units} units, ${r.term}`)],
    "Supply completed units attributed to the current program and institution; current enrolments are not completed credit.");
  const latest = Math.max(-1, ...attributed.map(r => periodNumber(r.term)!));
  const previous = attributed.filter(r => periodNumber(r.term) === latest);
  return [
    ...(criteria.completedUnits ? [creditCheck(`At least ${criteria.completedUnits} completed units in the current ${record.career} program at ANU`, credits, criteria.completedUnits)] : []),
    creditCheck(`At least ${criteria.semesterUnits} units completed in one semester of the current program at ANU`, semester, criteria.semesterUnits),
    averageCheck(`Overall current-program average at least ${criteria.average}% (NCN/WN count as zero)`, attributed, criteria.average, complete),
    averageCheck(`Previous study-period average at least ${criteria.average}% (NCN/WN count as zero)`, previous, criteria.average,
      complete && previous.every(r => / S[12]$/.test(r.term))),
  ];
}

export type OverloadReason = "standard" | "final-30";
export function assessOverload(input: { load: LoadProjection; record: OverloadRecord; deadline: ConditionStatus; reason: OverloadReason; statement: string }) {
  const { load, record, reason } = input;
  const checks: Check[] = [check("Proposed load does not exceed 36 units", load.minimum > 36 ? "unmet" : load.maximum === null || load.maximum > 36 ? "unknown" : "met", [loadText(load)]),
    check("Credit values and session overlap are established", load.maximum !== null && load.minimum === load.maximum ? "met" : "unknown",
      load.excluded.map(code => `${code}: non-standard session outside the recorded standard-semester dates`), "Confirm missing credit values or class dates. A semester name alone does not establish non-overlap."),
    check("Request is within the nominated course's self-enrolment deadline", input.deadline, [], "Late or unclear deadlines require a reviewer to confirm that late enrolment is available."),
    ...academicOverloadChecks(record, load.year, load.period, load.requestedLimit),
  ];
  if (reason === "final-30") checks.push(check("Only 30 units remain to complete the degree; discretionary completion approval", "unknown", [],
    "A program reviewer must verify remaining degree requirements and decide the completion exception. No degree-completion audit is available in this prototype."));
  const forbidden = load.minimum > 36 || (reason === "final-30" && (load.requestedLimit ?? 0) > 30);
  const outcome = forbidden ? "auto-rejected" : reason === "final-30" ? "assessment-incomplete"
    : checks.some(c => c.status === "unmet") ? "auto-rejected"
    : checks.every(c => c.status === "met") && load.requestedLimit !== null ? "approved" : "assessment-incomplete";
  return { policy: "demo-overload-v1", source: policy, ...input, checks, outcome,
    approvedLimit: outcome === "approved" ? load.requestedLimit : null,
    explanation: forbidden ? "This proposed load exceeds the source's applicable maximum."
      : outcome === "approved" ? "The recorded conditions meet the demo overload policy. Approval raises the load limit only; it does not enrol you or waive course requirements."
      : outcome === "auto-rejected" ? "A recorded overload condition is not met. You can request human review of additional evidence."
      : "Evidence or a discretionary decision is needed. No overload approval has been issued and no human review is in progress.",
  };
}
export type OverloadReport = ReturnType<typeof assessOverload>;
