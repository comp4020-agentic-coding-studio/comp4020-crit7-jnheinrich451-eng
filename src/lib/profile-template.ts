import { createHash } from "node:crypto";
import catalogue from "../data/catalogue-sources.json";
import planning from "../data/study-planning-2027.json";
import type { CatalogueSnapshot } from "./catalogue-types";
import { fixedUnits, publishedTerms } from "./course-evidence";
import { rulesForSource } from "./course-rules";
import { gate, type StudentRecord } from "./eligibility";
import { planningProgress, referencedCourses, remainingRequirements } from "./study-planning";
import type { CourseRules } from "../data/requisites";

export const PROFILE_TEMPLATE = "vcomp-ai-2027-s2-v1";
export const PROFILE_ASSUMPTION = "2026 course availability is a fictional scenario assumption, not verified historical ANU data. The saved 2027 requirements are used only to check this template's consistency.";
const schedule = [
  { term: "2026 S1", units: 24, courses: ["COMP6442", "COMP6262", "COMP6528", "COMP8610"] },
  { term: "2026 S2", units: 18, courses: ["COMP6670", "COMP6250", "COMP8280"] },
  { term: "2027 S1", units: 18, courses: ["COMP6445", "COMP6320", "COMP8600"] },
];

/** v1: versioned authored scenario, reproducible marks; never guesses missing
 * rules. Kept for existing accounts, fixtures and the adviser benchmark. */
export function generateAuthoredProfile(seed: string, snapshots: Pick<CatalogueSnapshot, "hash" | "evidence">[] = catalogue.snapshots as CatalogueSnapshot[]) {
  for (const expected of [planning.program, planning.specialisation]) {
    const matches = snapshots.filter(s => s.evidence.code === expected.code && s.evidence.year === planning.year);
    if (matches.length !== 1 || matches[0].hash !== expected.hash) throw new Error(`Review ${PROFILE_TEMPLATE}: degree/specialisation source changed.`);
  }
  const sources = new Map(snapshots.filter(s => s.evidence.kind === "course" && s.evidence.year === planning.year).map(s => [s.evidence.code, s]));
  const records: { courseCode: string; grade: string; mark: number; units: number; term: string; program: string; institution: string; sourceHash: string; availabilityEvidence: string }[] = [];
  for (const semester of schedule) {
    let load = 0;
    for (const code of semester.courses) {
      const source = sources.get(code);
      if (snapshots.filter(s => s.evidence.code === code && s.evidence.year === planning.year).length !== 1) throw new Error(`Review ${PROFILE_TEMPLATE}: conflicting source for ${code}.`);
      const rules = source && rulesForSource(code, planning.year, source);
      const units = source && fixedUnits(source.evidence);
      const record: StudentRecord = { program: "VCOMP", academicCareer: "postgraduate", complete: true,
        passed: records.filter(r => r.term !== semester.term).map(r => ({ code: r.courseCode, units: r.units })), failed: [],
        enrolled: semester.courses.filter(c => c !== code) };
      if (!source || !units || gate(code, rules, record).outcome !== "eligible") throw new Error(`Review ${PROFILE_TEMPLATE}: ${code} lacks a supported prerequisite/credit interpretation.`);
      if (semester.term.startsWith("2027") && !publishedTerms(source.evidence, 2027).includes("S1")) throw new Error(`Review ${PROFILE_TEMPLATE}: ${code} has no 2027 S1 offering.`);
      const mark = 72 + createHash("sha256").update(`${PROFILE_TEMPLATE}:${seed}:${code}`).digest()[0] % 13;
      records.push({ courseCode: code, grade: mark >= 80 ? "HD" : "D", mark, units, term: semester.term,
        program: "VCOMP", institution: "ANU", sourceHash: source.hash,
        availabilityEvidence: semester.term.startsWith("2027") ? "Saved 2027 class row" : source.evidence.availability === "explicit-none"
          ? "Historical assumption only; the 2027 page explicitly has no current offerings"
          : "Historical assumption; semester matches the saved 2027 pattern" });
      load += units;
    }
    if (load !== semester.units || load > 24) throw new Error(`Review ${PROFILE_TEMPLATE}: ${semester.term} has an invalid load.`);
  }
  if (records.filter(r => !/^COMP8/.test(r.courseCode)).reduce((n, r) => n + r.units, 0) > 48)
    throw new Error(`Review ${PROFILE_TEMPLATE}: too much lower-level credit for the degree's 48-unit advanced minimum.`);
  return { id: PROFILE_TEMPLATE, seed, program: "VCOMP", specialisation: planning.specialisation.code,
    ruleYear: planning.year, planningYear: 2027, planningTerm: "S2", scenarioDate: "2027-07-01",
    assumption: PROFILE_ASSUMPTION, completedThrough: "2027 S1", s1State: "completed", records,
    semesterLoads: schedule.map(s => ({ term: s.term, units: s.units })),
    professionalPracticeAssumption: "COMP6250 is a fictional 2026 S2 completion. Its saved 2027 page explicitly lists no current offerings; this is not evidence of a historical offering or permission to enrol now.",
    programSourceHash: planning.program.hash, specialisationSourceHash: planning.specialisation.hash,
    validation: "Each semester uses earlier completed results and explicitly concurrent courses. Loads are 24, 18 and 18 units, with a complete fictional record of the lighter semesters. 2027 S1 availability is checked against saved class rows. Marks and all academic results are fictional. COMP8490 remains unknown because its two prerequisite readings disagree. Project approval and GPA remain unresolved." };
}

export const GENERATED_TEMPLATE = "vcomp-ai-2027-s2-v2";
const GENERATED_TERMS = ["2026 S1", "2026 S2", "2027 S1"] as const;
// Every pattern totals 60 units, so each profile leaves the same 36-unit
// remainder for the project and final study, whatever its course mix.
const LOAD_PATTERNS = [[24, 18, 18], [18, 24, 18], [18, 18, 24]];
const gradeFor = (mark: number) => mark >= 80 ? "HD" : mark >= 70 ? "D" : "CR";
const gradePoints = (grade: string) => ({ HD: 7, D: 6, CR: 5 } as Record<string, number>)[grade] ?? 0;

/** v2: a seeded search over the saved rules themselves. Each course is placed
 * only where its recorded prerequisites are met by earlier results or allowed
 * concurrent study, in a semester matching its saved 2027 offering pattern.
 * Degree and specialisation groups weight the choice; the planner then reports
 * what the record still leaves outstanding. Never guesses a missing rule. */
export function generateProfile(seed: string, snapshots: Pick<CatalogueSnapshot, "hash" | "evidence">[] = catalogue.snapshots as CatalogueSnapshot[]) {
  for (const expected of [planning.program, planning.specialisation]) {
    const matches = snapshots.filter(s => s.evidence.code === expected.code && s.evidence.year === planning.year);
    if (matches.length !== 1 || matches[0].hash !== expected.hash) throw new Error(`Review ${GENERATED_TEMPLATE}: degree/specialisation source changed.`);
  }
  let counter = 0;
  const draw = () => createHash("sha256").update(`${GENERATED_TEMPLATE}:${seed}:${counter++}`).digest().readUInt32BE(0) / 2 ** 32;
  const byCode = new Map<string, Pick<CatalogueSnapshot, "hash" | "evidence">[]>();
  for (const s of snapshots) if (s.evidence.kind === "course" && s.evidence.year === planning.year) byCode.set(s.evidence.code, [...(byCode.get(s.evidence.code) ?? []), s]);
  // Only a single, reviewed, fixed-unit source can take part. Conflicting
  // versions, unreviewed rules and variable credit are left out, not guessed.
  const pool = [...byCode.values()].filter(rows => rows.length === 1).map(([source]) => ({ code: source.evidence.code, source,
    rules: rulesForSource(source.evidence.code, planning.year, source) as CourseRules | undefined, units: fixedUnits(source.evidence) }))
    .filter((c): c is typeof c & { rules: CourseRules; units: number } => !!c.rules && !!c.units && c.code !== planning.program.project)
    .sort((a, b) => a.code.localeCompare(b.code));
  type Candidate = (typeof pool)[number];
  const advancedTargets = pool.filter(c => planning.specialisation.advanced.includes(c.code));
  const lowerLevel = (code: string) => !/^COMP8/.test(code);
  const loads = LOAD_PATTERNS[Math.floor(draw() * LOAD_PATTERNS.length)];
  const placed: { code: string; units: number; term: string; source: Candidate["source"] }[] = [];
  const recordFor = (term: string, concurrent: string[]): StudentRecord => ({ program: "VCOMP", academicCareer: "postgraduate", complete: true,
    passed: placed.filter(p => p.term !== term).map(p => ({ code: p.code, units: p.units })), failed: [], enrolled: concurrent });
  const weight = (course: Candidate, chosen: string[]) => {
    const taken = [...placed.map(p => p.code), ...chosen];
    const foundationUnits = pool.filter(c => taken.includes(c.code) && planning.specialisation.foundation.includes(c.code)).reduce((n, c) => n + c.units, 0);
    let w = /^(COMP|ENGN)/.test(course.code) ? 1 : 0.4;
    if (planning.program.core.includes(course.code)) w += 20;
    if (planning.program.professional.includes(course.code)) w += 10;
    if (planning.specialisation.advanced.includes(course.code)) w += 6;
    if (planning.specialisation.foundation.includes(course.code) && foundationUnits < planning.specialisation.foundationMaximum) w += 5;
    if (/^COMP8/.test(course.code)) w += 2;
    if (advancedTargets.some(t => !taken.includes(t.code) && referencedCourses(t.rules.requires).includes(course.code))) w += 3;
    return w;
  };
  GENERATED_TERMS.forEach((term, index) => {
    const semester = term.endsWith("S1") ? "S1" : "S2", load = loads[index];
    for (let attempt = 0; attempt < 60; attempt++) {
      const chosen: Candidate[] = [];
      let units = 0;
      for (;;) {
        const lower = [...placed, ...chosen].filter(p => lowerLevel(p.code)).reduce((n, p) => n + p.units, 0);
        const candidates = pool.filter(c => !placed.some(p => p.code === c.code) && !chosen.includes(c) && units + c.units <= load
          && publishedTerms(c.source.evidence, planning.year).includes(semester)
          && (!lowerLevel(c.code) || lower + c.units <= 48)
          && !chosen.some(o => o.rules.incompatibleEnrolled?.includes(c.code))
          && gate(c.code, c.rules, recordFor(term, chosen.map(o => o.code))).outcome === "eligible");
        if (!candidates.length) break;
        const weights = candidates.map(c => weight(c, chosen.map(o => o.code)));
        let target = draw() * weights.reduce((a, b) => a + b, 0), pick = candidates[candidates.length - 1];
        for (let i = 0; i < candidates.length; i++) { target -= weights[i]; if (target < 0) { pick = candidates[i]; break; } }
        chosen.push(pick); units += pick.units;
        if (units === load) break;
      }
      // Each course must still be eligible alongside the final combination.
      const combined = chosen.map(c => c.code);
      if (units === load && chosen.every(c => gate(c.code, c.rules, recordFor(term, combined.filter(o => o !== c.code))).outcome === "eligible")) {
        placed.push(...chosen.map(c => ({ code: c.code, units: c.units, term, source: c.source }))); return;
      }
    }
    throw new Error(`Review ${GENERATED_TEMPLATE}: no rule-consistent ${load}-unit combination for ${term}.`);
  });
  const records = placed.map(p => {
    const mark = 65 + createHash("sha256").update(`${GENERATED_TEMPLATE}:${seed}:mark:${p.code}`).digest()[0] % 28;
    return { courseCode: p.code, grade: gradeFor(mark), mark, units: p.units, term: p.term, program: "VCOMP", institution: "ANU", sourceHash: p.source.hash,
      availabilityEvidence: p.term.startsWith("2027") ? "Saved 2027 class row" : "Historical assumption; semester matches the saved 2027 pattern" };
  });
  // The degree expects a GPA of 6 over the first 48 attempted units. A fictional
  // record should not quietly fail that, so the lowest Credit marks rise to 70.
  const first: typeof records = [];
  for (const r of records) { if (first.reduce((n, f) => n + f.units, 0) >= 48) break; first.push(r); }
  const gpa = () => first.reduce((n, r) => n + gradePoints(r.grade) * r.units, 0) / first.reduce((n, r) => n + r.units, 0);
  while (gpa() < 6) { const low = first.filter(r => r.grade === "CR").sort((a, b) => a.mark - b.mark)[0]; low.mark = 70; low.grade = "D"; }
  const progress = planningProgress(records.map(r => ({ code: r.courseCode, units: r.units, term: r.term, grade: r.grade, mark: r.mark, program: r.program, institution: r.institution })));
  const professionalPlaced = records.some(r => planning.program.professional.includes(r.courseCode));
  return { id: GENERATED_TEMPLATE, seed, program: "VCOMP", specialisation: planning.specialisation.code,
    ruleYear: planning.year, planningYear: 2027, planningTerm: "S2", scenarioDate: "2027-07-01",
    assumption: PROFILE_ASSUMPTION, completedThrough: "2027 S1", s1State: "completed", records,
    semesterLoads: GENERATED_TERMS.map((term, i) => ({ term, units: loads[i] })),
    professionalPracticeAssumption: professionalPlaced ? "A professional-practice course appears as fictional historical study; this is not evidence of a current offering."
      : `Neither professional-practice course (${planning.program.professional.join(" or ")}) has a published 2027 offering, so the generator could not place one. It remains an outstanding requirement.`,
    programSourceHash: planning.program.hash, specialisationSourceHash: planning.specialisation.hash, remaining: remainingRequirements(progress),
    validation: `Generated from the saved rules: every course's recorded prerequisites were met by earlier results or allowed concurrent study, each sits in a semester matching its saved 2027 offering pattern, and courses needing permission, project approval, unreviewed rules or variable credit were excluded. Loads are ${loads.join(", ")} units, with at most 48 units below 8000 level. Marks range from 65 to 92 and keep a GPA of at least 6 over the first 48 units. All results are fictional; GPA certification, project approval and a graduation audit remain unverified.` };
}
