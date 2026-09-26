import { createHash } from "node:crypto";
import catalogue from "../data/catalogue-sources.json";
import planning from "../data/study-planning-2027.json";
import type { CatalogueSnapshot } from "./catalogue-types";
import { fixedUnits, publishedTerms } from "./course-evidence";
import { rulesForSource } from "./course-rules";
import { gate, type StudentRecord } from "./eligibility";

export const PROFILE_TEMPLATE = "vcomp-ai-2027-s2-v1";
export const PROFILE_ASSUMPTION = "2026 course availability is a fictional scenario assumption, not verified historical ANU data. The saved 2027 requirements are used only to check this template's consistency.";
const schedule = [
  { term: "2026 S1", units: 24, courses: ["COMP6442", "COMP6262", "COMP6528", "COMP8610"] },
  { term: "2026 S2", units: 18, courses: ["COMP6670", "COMP6250", "COMP8280"] },
  { term: "2027 S1", units: 18, courses: ["COMP6445", "COMP6320", "COMP8600"] },
];

/** Versioned authored scenario, reproducible marks; never guesses missing rules. */
export function generateProfile(seed: string, snapshots: Pick<CatalogueSnapshot, "hash" | "evidence">[] = catalogue.snapshots as CatalogueSnapshot[]) {
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
