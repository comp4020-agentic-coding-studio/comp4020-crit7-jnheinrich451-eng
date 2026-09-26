import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { studyPlans, studyPlanEvents, type Student } from "./schema";
import { catalogueEntries } from "./catalogue";
import { enrolmentsOf, listCourses, selectionsOf, transcriptOf } from "./store";
import { loadApproval, loadCoursesOf } from "./overload-store";
import { halfOf } from "./study-load";
import { planStudy, PLANNING_POLICY, PLANNING_PERIODS } from "./study-planning";
import { UserError } from "./errors";

export function studyPlanOf(studentId: number) {
  return db.select().from(studyPlans).where(eq(studyPlans.studentId, studentId)).get();
}
export function saveStudyPlan(student: Student, period: string) {
  if (student.program !== "VCOMP") throw new UserError("This guided example currently supports Computing (Advanced).");
  if (!PLANNING_PERIODS.includes(period)) throw new UserError("Choose one of the available planning semesters.");
  const [year, planningTerm] = period.split(" ");
  db.transaction(tx => {
    const old = tx.select().from(studyPlans).where(eq(studyPlans.studentId, student.id)).get();
    if (old?.planningYear === Number(year) && old.planningTerm === planningTerm) return;
    const values = { ruleYear: PLANNING_POLICY.year, specialisation: PLANNING_POLICY.specialisation.code, planningYear: Number(year), planningTerm };
    tx.insert(studyPlans).values({ studentId: student.id, ...values })
      .onConflictDoUpdate({ target: studyPlans.studentId, set: values }).run();
    tx.insert(studyPlanEvents).values({ studentId: student.id, detail: `Selected Artificial Intelligence as the fictional study focus; planning ${period} using the 2027 catalogue. Academic history and enrolments are unchanged.` }).run();
  }, { behavior: "immediate" });
}
export function profileGuidance(student: Student) {
  const plan = studyPlanOf(student.id);
  const year = plan?.planningYear ?? 2027, term = plan?.planningTerm ?? "S2";
  const courses = listCourses("", "", PLANNING_POLICY.year);
  const current = enrolmentsOf(student.id);
  const selected = selectionsOf(student.id).filter(s => s.offering.year === year && s.offering.term === term
    && !current.some(e => e.code === s.course.code && e.year === year && e.term === term));
  const guidance = planStudy({ program: student.program, year, term, sources: catalogueEntries(), courses,
    results: transcriptOf(student.id).map(r => ({ ...r, code: r.courseCode })),
    confirmed: loadCoursesOf(student.id), savedCodes: selected.map(s => s.course.code), limit: loadApproval(student.id, year, halfOf(term))?.approvedLimit ?? 24 });
  const events = db.select().from(studyPlanEvents).where(eq(studyPlanEvents.studentId, student.id)).orderBy(desc(studyPlanEvents.id)).all();
  return { ...guidance, plan, year, term, courses, events };
}
