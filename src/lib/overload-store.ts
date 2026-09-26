import { createHash } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { accounts, courses, convenors, enrolments, offerings, overloadEvents, overloadRequests, students, transcript, type Student, type Convenor } from "./schema";
import { catalogueEntries } from "./catalogue";
import { ACTIVE_YEAR, LEGACY_YEAR } from "./academic-year";
import { COURSES, type Term } from "../data/courses";
import { publishedTerms, TERM_LABELS } from "./course-evidence";
import { UserError } from "./errors";
import { assessOverload, halfOf, loadText, projectLoad, publishedDate, selectedUnits, type HalfYear, type LoadCourse, type OverloadRecord, type OverloadReport } from "./study-load";

function sourceFor(code: string, year: number) {
  const matches = catalogueEntries().filter(e => e.kind === "course" && e.code === code && e.year === year);
  return matches.length === 1 ? matches[0] : undefined;
}
export function courseLoad(code: string, year: number, term: string, units?: number | null, selection?: number): LoadCourse {
  const source = sourceFor(code, year);
  const rows = source?.evidence.offerings.filter(o => o.year === year && o.session === TERM_LABELS[term as Term]) ?? [];
  const windows = rows.map(o => ({ start: publishedDate(o.fields["Class start date"]), end: publishedDate(o.fields["Class end date"]) }));
  return { code, year, term,
    units: units ?? (source ? selectedUnits(source.evidence.units, selection) : year === LEGACY_YEAR ? COURSES.find(c => c.code === code)?.units ?? null : null),
    windows: windows.length && windows.every(w => w.start && w.end && w.start <= w.end)
      ? windows as { start: string; end: string }[] : null,
    ...(source ? { sourceHash: source.hash } : {}),
  };
}
export function loadCoursesOf(studentId: number): LoadCourse[] {
  return db.select({ code: courses.code, year: enrolments.year, term: enrolments.term, units: enrolments.units })
    .from(enrolments).innerJoin(courses, eq(courses.id, enrolments.courseId)).where(and(eq(enrolments.studentId, studentId), isNull(enrolments.endedAt))).all()
    .map(e => courseLoad(e.code, e.year, e.term, e.units));
}
export function loadApproval(studentId: number, year: number, period: HalfYear | null) {
  if (!period) return undefined;
  return db.select().from(overloadRequests).where(and(eq(overloadRequests.studentId, studentId), eq(overloadRequests.year, year),
    eq(overloadRequests.period, period), eq(overloadRequests.status, "approved"))).orderBy(desc(overloadRequests.approvedLimit)).get();
}
export function studyLoadFor(studentId: number, code: string, year: number, term: string, units?: number, excludingCode?: string) {
  const approval = loadApproval(studentId, year, halfOf(term));
  const current = loadCoursesOf(studentId).filter(c => !(c.code === excludingCode && c.year === year && c.term === term));
  return { ...projectLoad(current, courseLoad(code, year, term, undefined, units), approval?.approvedLimit ?? 24), approval };
}
export function studyLoadsOf(studentId: number) {
  const courses = loadCoursesOf(studentId);
  return [...new Set(courses.map(c => `${c.year}:${halfOf(c.term)}`))].flatMap(key => {
    const entries = courses.filter(c => `${c.year}:${halfOf(c.term)}` === key), target = entries[0];
    if (!target) return [];
    const approval = loadApproval(studentId, target.year, halfOf(target.term));
    return [{ ...projectLoad(entries, target, approval?.approvedLimit ?? 24), approval }];
  });
}
export function overloadRecordOf(student: Student): OverloadRecord {
  return { program: student.program, career: ["GDCOMP", "MCOMP", "VCOMP", "MMLCV"].includes(student.program) ? "postgraduate" : null,
    complete: true, results: db.select().from(transcript).where(eq(transcript.studentId, student.id)).orderBy(asc(transcript.id)).all()
      .map(r => ({ code: r.courseCode, grade: r.grade, units: r.units, term: r.term, mark: r.mark, program: r.program, institution: r.institution })),
  };
}
export function overloadReviewer() {
  return db.select().from(convenors).where(eq(convenors.purpose, "overload")).get();
}
export function getOverload(id: number) {
  const row = db.select({ request: overloadRequests, student: students, reviewer: convenors, course: courses }).from(overloadRequests)
    .innerJoin(students, eq(students.id, overloadRequests.studentId)).innerJoin(convenors, eq(convenors.id, overloadRequests.reviewerId))
    .innerJoin(courses, eq(courses.id, overloadRequests.courseId)).where(eq(overloadRequests.id, id)).get();
  return row ? { ...row, report: JSON.parse(row.request.assessment) as OverloadReport,
    events: db.select().from(overloadEvents).where(eq(overloadEvents.requestId, id)).orderBy(asc(overloadEvents.id)).all() } : undefined;
}
export function overloadsFor(actor: { kind: "student"; student: Student } | { kind: "convenor"; convenor: Convenor }) {
  const condition = actor.kind === "student" ? eq(overloadRequests.studentId, actor.student.id) : eq(overloadRequests.reviewerId, actor.convenor.id);
  return db.select({ id: overloadRequests.id }).from(overloadRequests).where(condition).orderBy(desc(overloadRequests.id)).all()
    .map(r => getOverload(r.id)!).filter(r => actor.kind === "student" || r.events.some(e => e.kind === "review-requested"));
}
export function submitOverload(input: { student: Student; code: string; year: number; term: string; statement: string; reason: string; units?: number }) {
  const course = db.select().from(courses).where(eq(courses.code, input.code)).get();
  const source = sourceFor(input.code, input.year);
  const terms = source ? publishedTerms(source.evidence, input.year) : input.year === LEGACY_YEAR ? COURSES.find(c => c.code === input.code)?.terms ?? [] : [];
  if (!course || ![ACTIVE_YEAR, LEGACY_YEAR].includes(input.year) || !terms.includes(input.term as Term)
    || !db.select().from(offerings).where(and(eq(offerings.courseId, course.id), eq(offerings.year, input.year), eq(offerings.term, input.term))).get())
    throw new UserError("That course offering is unavailable.");
  if (db.select().from(enrolments).where(and(eq(enrolments.studentId, input.student.id), eq(enrolments.courseId, course.id), eq(enrolments.year, input.year), eq(enrolments.term, input.term), isNull(enrolments.endedAt))).get())
    throw new UserError("You are already enrolled in this offering.");
  if (input.reason !== "standard" && input.reason !== "final-30") throw new UserError("Choose a valid overload reason.");
  const statement = input.statement.trim();
  if (!statement || statement.length > 2000) throw new UserError("Explain your overload request in 1–2000 characters.");
  const live = studyLoadFor(input.student.id, input.code, input.year, input.term, input.units);
  if (live.state === "within-limit") throw new UserError("This offering is within your approved study-load limit. Check its course requirements and confirm enrolment.");
  const reviewer = overloadReviewer();
  if (!reviewer || !live.period) throw new UserError("No supported overload review route is configured for this study period.");
  const pending = db.select().from(overloadRequests).where(and(eq(overloadRequests.studentId, input.student.id), eq(overloadRequests.year, input.year),
    eq(overloadRequests.period, live.period), eq(overloadRequests.status, "with-reviewer"))).get();
  if (pending) return pending;
  const { approval: _approval, ...load } = live;
  const dates = source?.evidence.offerings.filter(o => o.year === input.year && o.session === TERM_LABELS[input.term as Term])
    .map(o => publishedDate(o.fields["Last day to enrol"])) ?? [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const deadline = dates.length && dates.every(date => date && today <= date) ? "met" : "unknown";
  const report = assessOverload({ load, record: overloadRecordOf(input.student), deadline, reason: input.reason, statement });
  const requestKey = createHash("sha256").update(JSON.stringify({ studentId: input.student.id, report })).digest("hex");
  const existing = db.select().from(overloadRequests).where(eq(overloadRequests.requestKey, requestKey)).get();
  if (existing) return existing;
  return db.transaction(tx => {
    const request = tx.insert(overloadRequests).values({ studentId: input.student.id, reviewerId: reviewer.id, courseId: course.id,
      year: input.year, term: input.term, period: load.period!, requestedLimit: load.requestedLimit, approvedLimit: report.approvedLimit,
      statement, reason: input.reason, status: report.outcome, assessment: JSON.stringify(report), requestKey }).returning().get();
    tx.insert(overloadEvents).values([
      { requestId: request.id, actor: "student", actorName: input.student.name, kind: "submitted", detail: `Requested overload assessment for ${input.code}: ${loadText(load)} in ${input.year} ${load.period}.` },
      { requestId: request.id, actor: "system", actorName: "Automated overload assessment", kind: report.outcome, detail: report.explanation },
    ]).run();
    return request;
  });
}
export function requestOverloadReview(student: Student, id: number) {
  return db.transaction(tx => {
    const row = tx.select().from(overloadRequests).where(eq(overloadRequests.id, id)).get();
    if (!row || row.studentId !== student.id) throw new UserError("This overload request is not yours.");
    if (row.status === "with-reviewer") return;
    if (row.status !== "assessment-incomplete" && row.status !== "auto-rejected") throw new UserError("This request has already been decided.");
    const report = JSON.parse(row.assessment) as OverloadReport;
    if (report.load.minimum > 36 || (row.reason === "final-30" && (row.requestedLimit ?? 0) > 30))
      throw new UserError("This request exceeds the applicable maximum and cannot be approved. Reduce the proposed load.");
    const pending = tx.select().from(overloadRequests).where(and(eq(overloadRequests.studentId, student.id), eq(overloadRequests.year, row.year),
      eq(overloadRequests.period, row.period), eq(overloadRequests.status, "with-reviewer"))).get();
    if (pending) throw new UserError("You already have an overload request being reviewed for this half-year.");
    tx.update(overloadRequests).set({ status: "with-reviewer" }).where(eq(overloadRequests.id, id)).run();
    tx.insert(overloadEvents).values({ requestId: id, actor: "student", actorName: student.name, kind: "review-requested",
      detail: "Requested human review of the saved explanation and assessment. Academic checks and enrolments are unchanged." }).run();
  });
}
export function decideOverload(reviewer: Convenor, id: number, approve: boolean, note: string, demoStudentId?: number) {
  return db.transaction(tx => {
    const row = tx.select().from(overloadRequests).where(eq(overloadRequests.id, id)).get();
    if (!row || reviewer.purpose !== "overload" || row.reviewerId !== reviewer.id) throw new UserError("Only the assigned program-load reviewer can decide this request.");
    if (demoStudentId !== undefined && (row.studentId !== demoStudentId ||
      !tx.select().from(accounts).where(and(eq(accounts.studentId, demoStudentId), eq(accounts.kind, "demo"))).get()))
      throw new UserError("Demo reviewers can decide only their own demo requests.");
    if (row.status !== "with-reviewer") throw new UserError("This overload request is no longer waiting for review.");
    if (!note.trim() || note.trim().length > 2000) throw new UserError("Explain the decision and evidence in 1–2000 characters.");
    const report = JSON.parse(row.assessment) as OverloadReport;
    if (approve && (row.requestedLimit === null || report.load.maximum === null || report.load.maximum > 36
      || (row.reason === "final-30" && row.requestedLimit > 30))) throw new UserError("Resolve credit values and the applicable maximum before approval.");
    const status = approve ? "approved" : "rejected";
    tx.update(overloadRequests).set({ status, approvedLimit: approve ? row.requestedLimit : null }).where(eq(overloadRequests.id, id)).run();
    tx.insert(overloadEvents).values({ requestId: id, actor: demoStudentId !== undefined ? "demo-reviewer" : "reviewer",
      actorName: demoStudentId !== undefined ? "Demo reviewer — own profile" : reviewer.name, kind: status,
      detail: `${approve ? `Approved a demo load limit of ${row.requestedLimit} units for ${row.year} ${row.period}.` : "Overload request rejected."} ${note.trim()}` }).run();
  });
}

export const OVERLOAD_STATUS: Record<string, string> = {
  approved: "Overload approved", "auto-rejected": "Not approved under the demo policy", "assessment-incomplete": "Evidence or decision needed",
  "with-reviewer": "With the program-load reviewer", rejected: "Overload rejected",
};
