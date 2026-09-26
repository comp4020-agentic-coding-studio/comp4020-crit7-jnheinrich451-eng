import policy from "../data/study-planning-2027.json";
import type { CourseRules, Requirement } from "../data/requisites";
import type { CatalogueSnapshot } from "./catalogue-types";
import { gate, evaluateRequirement, checkStatus, type StudentRecord } from "./eligibility";
import { publishedDate, projectLoad, type AcademicResult, type LoadCourse } from "./study-load";
import { publishedTerms, TERM_LABELS } from "./course-evidence";
import type { Term } from "../data/courses";

export const PLANNING_POLICY = policy;
export const PLANNING_PERIODS = ["2027 S2", "2028 S1", "2028 S2"];
type Source = Pick<CatalogueSnapshot, "hash" | "evidence">;
export interface PlanningCourse {
  code: string; title: string; units: number | null; rules?: CourseRules; source?: Source;
}
export function semesterIndex(term: string) {
  const m = /^(\d{4}) (S1|S2|Summer|Autumn|Winter|Spring)$/.exec(term);
  return m ? Number(m[1]) * 2 + (["S2", "Winter", "Spring"].includes(m[2]) ? 1 : 0) : null;
}
const passed = (grade: string) => ["HD", "D", "CR", "P"].includes(grade);
const positive = (n: number | null) => n !== null && Number.isFinite(n) && n > 0;
const sum = (rows: { units: number }[]) => rows.reduce((total, row) => total + row.units, 0);

/** Exclusive buckets; the level-8000 threshold is an overlay, never extra credit. */
export function planningProgress(results: AcademicResult[]) {
  const unique = [...new Map(results.filter(r => passed(r.grade) && positive(r.units)).map(r => [r.code, r])).values()];
  const pool = new Map(unique.map(r => [r.code, r]));
  const allocate = (codes: string[], maximum: number) => {
    const rows: AcademicResult[] = [];
    for (const code of codes) {
      const r = pool.get(code);
      if (r && sum(rows) + r.units <= maximum) { rows.push(r); pool.delete(code); }
    }
    return rows;
  };
  const core = allocate(policy.program.core, 12);
  const professional = allocate(policy.program.professional, 6);
  // This project is explicitly repeatable. Only two distinct consecutive
  // semesters of 12 units count; duplicate rows cannot create a second attempt.
  const projects = [...new Map(results.filter(r => r.code === policy.program.project && passed(r.grade) && r.units === 12 && / S[12]$/.test(r.term))
    .map(r => [r.term, r])).values()].sort((a, b) => semesterIndex(a.term)! - semesterIndex(b.term)!);
  const pair = projects.findIndex((r, i) => projects[i + 1] && semesterIndex(projects[i + 1].term)! - semesterIndex(r.term)! === 1);
  const project = pair >= 0 ? projects.slice(pair, pair + 2) : projects.slice(0, 1);
  pool.delete(policy.program.project);
  const advanced = allocate(policy.specialisation.advanced, 24);
  const foundation = allocate(policy.specialisation.foundation, Math.min(12, 24 - sum(advanced)));
  const further = allocate([...pool.keys()].filter(c => /^(COMP|ENGN)[678]\d{3}$/.test(c)), 18);
  const electives = allocate([...pool.keys()].filter(c => /^[A-Z]{4}[6789]\d{3}$/.test(c)), 12);
  const advancedUnits = sum(unique.filter(r => /^COMP8\d{3}$/.test(r.code) && r.code !== policy.program.project)) + sum(project);
  const allocated = sum([...core, ...professional, ...project, ...advanced, ...foundation, ...further, ...electives]);
  return { core: core.map(r => r.code), professional: professional.map(r => r.code), projectUnits: sum(project),
    aiUnits: sum([...advanced, ...foundation]), aiAdvancedUnits: sum(advanced), aiFoundationUnits: sum(foundation),
    aiFoundationSurplus: unique.filter(r => policy.specialisation.foundation.includes(r.code) && !foundation.some(f => f.code === r.code)).map(r => r.code),
    advancedUnits, recordedUnits: sum(unique.filter(r => r.code !== policy.program.project)) + sum(project), allocated,
    allocation: { core, professional, project, advanced, foundation, further, electives },
    // A lower bound only: no inference that this alone fulfils the degree.
    minimumFurtherUnits: Math.max(0, 96 - allocated, 48 - advancedUnits, 24 - sum(project)) };
}
/** What the recorded study leaves outstanding, in the same exclusive buckets.
 * The 8000-level line is a threshold that overlaps the groups above it, so the
 * total is the planner's lower bound, never a sum of the lines. */
export function remainingRequirements(progress: ReturnType<typeof planningProgress>) {
  const items: { key: string; text: string; units: number }[] = [];
  const core = policy.program.core.filter(code => !progress.core.includes(code));
  if (core.length) items.push({ key: "core", text: `Compulsory ${core.length === 1 ? "course" : "courses"}: ${core.join(", ")}`, units: core.length * 6 });
  if (!progress.professional.length) items.push({ key: "professional", text: `Professional practice: ${policy.program.professional.join(" or ")}`, units: 6 });
  const ai = Math.max(0, policy.specialisation.totalUnits - progress.aiUnits), aiAdvanced = Math.max(0, policy.specialisation.advancedMinimum - progress.aiAdvancedUnits);
  if (ai || aiAdvanced) items.push({ key: "specialisation", text: `${policy.specialisation.title} specialisation: ${Math.max(ai, aiAdvanced)} more units${aiAdvanced ? `, including ${aiAdvanced} from its advanced list` : ""}`, units: Math.max(ai, aiAdvanced) });
  const project = Math.max(0, policy.program.projectUnits - progress.projectUnits);
  if (project) items.push({ key: "project", text: `Research project (${policy.program.project}): ${project} units across consecutive semesters`, units: project });
  const advanced = Math.max(0, policy.program.advancedCompUnits - progress.advancedUnits);
  if (advanced) items.push({ key: "advanced", text: `8000-level COMP study: ${advanced} more units, which can overlap the groups above`, units: advanced });
  return { totalUnits: policy.program.totalUnits, allocatedUnits: progress.allocated, minimumUnits: progress.minimumFurtherUnits, items };
}
export function referencedCourses(requirement?: Requirement): string[] {
  if (!requirement) return [];
  if ("course" in requirement) return [requirement.course];
  if ("all" in requirement) return requirement.all.flatMap(referencedCourses);
  if ("any" in requirement) return requirement.any.flatMap(referencedCourses);
  if ("interpretations" in requirement) return requirement.interpretations.flatMap(referencedCourses);
  return [];
}
function loadCourse(course: PlanningCourse, year: number, term: string): LoadCourse {
  const windows = course.source?.evidence.offerings.filter(o => o.year === year && o.session === TERM_LABELS[term as Term])
    .map(o => ({ start: publishedDate(o.fields["Class start date"]), end: publishedDate(o.fields["Class end date"]) }));
  return { code: course.code, year, term, units: course.units, sourceHash: course.source?.hash,
    windows: windows?.length && windows.every(w => w.start && w.end) ? windows as { start: string; end: string }[] : null };
}
export interface PlanningInput {
  program: string; year: number; term: string; results: AcademicResult[]; confirmed: LoadCourse[];
  courses: PlanningCourse[]; sources: Source[]; savedCodes?: string[]; limit?: number;
  /** Preferences only reorder candidates; the same gates still select the combination. */
  preferredCodes?: string[];
  /** A personal ceiling is separate from the institutional/approved limit. */
  targetUnits?: number;
}
export function planStudy(input: PlanningInput) {
  const validSource = (code: string, hash: string) => {
    const rows = input.sources.filter(s => s.evidence.code === code && s.evidence.year === policy.year);
    return rows.length === 1 && rows[0].hash === hash;
  };
  const supported = input.program === policy.program.key && validSource(policy.program.code, policy.program.hash)
    && validSource(policy.specialisation.code, policy.specialisation.hash) && PLANNING_PERIODS.includes(`${input.year} ${input.term}`);
  const cutoff = semesterIndex(`${input.year} ${input.term}`)!;
  const dated = input.results.filter(r => semesterIndex(r.term) !== null && semesterIndex(r.term)! < cutoff);
  const progress = planningProgress(dated);
  const record: StudentRecord = { program: input.program, academicCareer: "postgraduate", complete: input.results.every(r => semesterIndex(r.term) !== null),
    passed: [...new Map(dated.filter(r => passed(r.grade)).map(r => [r.code, { code: r.code, units: r.units }])).values()],
    failed: dated.filter(r => !passed(r.grade)).map(r => r.code),
    enrolled: input.confirmed.filter(c => c.year === input.year && c.term === input.term).map(c => c.code) };
  const byCode = new Map(input.courses.map(c => [c.code, c]));
  const saved = [...new Set(input.savedCodes ?? [])].map(code => byCode.get(code)).filter((c): c is PlanningCourse => !!c
    && !record.passed.some(r => r.code === c.code) && !record.enrolled.includes(c.code)
    && !!c.source && publishedTerms(c.source.evidence, input.year).includes(input.term as Term));
  const reserved = [...input.confirmed, ...saved.map(c => loadCourse(c, input.year, input.term))];
  const remainingCore = policy.program.core.filter(code => !progress.core.includes(code));
  const priorityFor = (course: PlanningCourse) => {
    const reasons: string[] = [];
    let score = 0;
    if (remainingCore.includes(course.code)) { score += 100; reasons.push("One of your remaining compulsory degree courses."); }
    if (!progress.professional.length && policy.program.professional.includes(course.code)) { score += 100; reasons.push("Fills the six-unit professional-practice requirement."); }
    if (course.code === policy.program.project && progress.projectUnits < 24) { score += 95; reasons.push("The degree requires two consecutive 12-unit research-project semesters; approval and project registration still need review."); }
    if (policy.specialisation.advanced.includes(course.code) && (progress.aiUnits < 24 || progress.aiAdvancedUnits < 12)) { score += 90; reasons.push("Contributes to your Artificial Intelligence specialisation's advanced-course requirement."); }
    if (policy.specialisation.foundation.includes(course.code) && progress.aiUnits < 24 && progress.aiFoundationUnits < 12) { score += 60; reasons.push("Can fill the remaining foundation allowance in your Artificial Intelligence specialisation."); }
    if (/^COMP8\d{3}$/.test(course.code) && progress.advancedUnits < 48) { score += 25; reasons.push("Adds 8000-level COMP credit toward the degree's 48-unit minimum."); }
    const unlocks = input.courses.filter(target => target.code !== course.code && !record.passed.some(r => r.code === target.code)
      && (policy.specialisation.advanced.includes(target.code) || policy.program.core.includes(target.code))
      && referencedCourses(target.rules?.requires).includes(course.code)).filter(target => {
        if (!target.rules?.requires) return false;
        const before = evaluateRequirement(target.rules.requires, record);
        const after = evaluateRequirement(target.rules.requires, { ...record, passed: [...record.passed, { code: course.code, units: course.units ?? 0 }] });
        return before.status === "unmet" && after.status !== "unmet";
      }).map(c => c.code);
    if (unlocks.length) { score += 75; reasons.push(`Addresses a recorded prerequisite for ${unlocks.join(", ")}. Those courses still have their own eligibility and offering checks.`); }
    if (!reasons.length) reasons.push("An eligible option to consider at your preference; degree credit allocation still needs checking.");
    return { score, reasons, unlocks };
  };
  const candidates = supported ? input.courses.filter(c => !record.passed.some(r => r.code === c.code) && !record.enrolled.includes(c.code))
    .map(course => {
      const result = gate(course.code, course.rules, record);
      const offered = !!course.source && publishedTerms(course.source.evidence, input.year).includes(input.term as Term);
      const later = course.source?.evidence.offerings.flatMap(o => o.year !== null && o.year >= input.year && (o.session === "First Semester" || o.session === "Second Semester")
        && publishedTerms(course.source!.evidence, o.year).includes(o.session === "First Semester" ? "S1" : "S2")
        ? [{ year: o.year, term: o.session === "First Semester" ? "S1" : "S2" }] : [])
        .filter(o => semesterIndex(`${o.year} ${o.term}`)! > cutoff)
        .sort((a, b) => semesterIndex(`${a.year} ${a.term}`)! - semesterIndex(`${b.year} ${b.term}`)!)[0];
      return { course, result, offered, later, ...priorityFor(course), saved: saved.some(c => c.code === course.code) };
    }).sort((a, b) => {
      const preference = (code: string) => { const i = input.preferredCodes?.indexOf(code) ?? -1; return i < 0 ? 1000 : i; };
      return preference(a.course.code) - preference(b.course.code) || b.score - a.score || a.course.code.localeCompare(b.course.code);
    }) : [];
  const options: typeof candidates = [], attention: typeof candidates = [], later: typeof candidates = [];
  const optionExclusions: Record<string, string> = {};
  const proposed = [...reserved];
  // Hypothetical contributions choose useful options without filling space
  // reserved for the compulsory project. These are never eligibility facts.
  const anticipated: AcademicResult[] = [...dated,
    ...reserved.filter(c => c.year === input.year && c.term === input.term && c.units !== null).map(c => ({ code: c.code, units: c.units!,
      term: `${input.year} ${input.term}`, grade: "P", mark: null, program: input.program, institution: "ANU" }))];
  let constrained = false;
  for (const candidate of candidates) {
    if (!candidate.offered) { if (candidate.score > 0) later.push(candidate); continue; }
    if (candidate.saved) continue;
    if (candidate.result.outcome !== "eligible" || candidate.course.units === null) {
      if (candidate.score > 0) attention.push(candidate);
      continue;
    }
    const plannedRecord = { ...record, enrolled: [...new Set(proposed.filter(c => c.year === input.year && c.term === input.term).map(c => c.code))] };
    const load = loadCourse(candidate.course, input.year, input.term);
    const hypothetical: AcademicResult = { code: candidate.course.code, units: candidate.course.units, term: `${input.year} ${input.term}`,
      grade: "P", mark: null, program: input.program, institution: "ANU" };
    const beforeContribution = planningProgress(anticipated), afterContribution = planningProgress([...anticipated, hypothetical]);
    const projectRemaining = Math.max(0, 24 - beforeContribution.projectUnits);
    const usefulCredit = beforeContribution.allocated < 96 - projectRemaining && afterContribution.allocated > beforeContribution.allocated;
    const usefulLevel = beforeContribution.advancedUnits + projectRemaining < 48 && afterContribution.advancedUnits > beforeContribution.advancedUnits;
    const usefulAI = afterContribution.aiUnits > beforeContribution.aiUnits || afterContribution.aiAdvancedUnits > beforeContribution.aiAdvancedUnits && beforeContribution.aiAdvancedUnits < 12;
    if (!usefulCredit && !usefulLevel && !usefulAI && candidates.some(c => c.offered && c.score > 0)) {
      optionExclusions[candidate.course.code] = "Left out to preserve useful degree credit and space for the compulsory project."; continue;
    }
    const issue = gate(candidate.course.code, candidate.course.rules, plannedRecord).outcome !== "eligible"
      || plannedRecord.enrolled.some(code => byCode.get(code)?.rules?.incompatibleEnrolled?.includes(candidate.course.code));
    const projected = projectLoad(proposed, load, input.limit ?? 24);
    const exceedsPreference = input.targetUnits !== undefined && (projected.maximum === null || projected.maximum > input.targetUnits);
    if (issue || projected.state !== "within-limit" || exceedsPreference) {
      optionExclusions[candidate.course.code] = issue ? "Needs another check alongside the other courses in this combination." : "Does not fit the selected unit limit alongside the other courses, or its load cannot be confirmed.";
      constrained = true; continue;
    }
    if (options.length < 4) { options.push(candidate); proposed.push(load); anticipated.push(hypothetical); }
    else optionExclusions[candidate.course.code] = "Four options are already included in this suggestion.";
  }
  return { supported, progress, options, optionExclusions, attention: attention.slice(0, 4), later: later.slice(0, 5), saved,
    // Individually eligible candidates, not a jointly approved semester plan.
    adviserPool: candidates.filter(c => c.offered && !c.saved && c.result.outcome === "eligible" && c.course.units !== null),
    reservedUnits: sum(saved.filter(c => positive(c.units)).map(c => ({ units: c.units! }))), constrained,
    proposedUnits: sum(options.map(c => ({ units: c.course.units! }))),
    unknownDates: !record.complete, future: input.year !== policy.year,
    exceedsOneSemester: progress.minimumFurtherUnits > Math.min(input.limit ?? 24, input.targetUnits ?? 36),
    hasPriorities: candidates.some(c => c.offered && c.score > 0),
    attentionLabel: (result: ReturnType<typeof gate>) => result.outcome === "rules-not-met" ? "Prerequisite or incompatibility needs attention"
      : "checks" in result && result.checks.some(c => checkStatus(c) === "unknown") ? "Evidence or permission review needed"
      : "Permission required before enrolment",
  };
}
