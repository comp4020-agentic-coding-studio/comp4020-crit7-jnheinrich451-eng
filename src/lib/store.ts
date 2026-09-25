import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { COURSES, type Term } from "../data/courses";
import { ACTIVE_YEAR, LEGACY_YEAR } from "./academic-year";
import { catalogueEntries } from "./catalogue";
import { fixedUnits, publishedTerms, TERM_LABELS } from "./course-evidence";
import { rulesForSource } from "./course-rules";
import { db } from "./db";
import { canRequestAssessment, type Check, firstRound, type Gate, gate, type StudentRecord } from "./eligibility";
import { bus } from "./events";
import { assessDemo, REQUEST_REASONS, requestReason, SCENARIO, scenarioEvidence, snapshotHash, type AssessmentReport } from "./demo-assessment";
import {
  type Application,
  type ApplicationEvent,
  applicationEvents,
  applications,
  type Convenor,
  type Course,
  convenors,
  courses,
  enrolments,
  type Student,
  students,
  transcript,
  offerings,
  selections,
  overloadEvents,
} from "./schema";
import { UserError } from "./errors";
import { studyLoadFor } from "./overload-store";
import { loadText } from "./study-load";
export { UserError } from "./errors";
export { actorFrom } from "./auth";

// Everything the pages read and write. Eligibility is never decided here —
// it's asked of src/lib/eligibility.ts — and every status change writes an
// application event in the same transaction.

export { TERM_LABELS } from "./course-evidence";

export const PASSING = new Set(["HD", "D", "CR", "P"]);

// --- who's acting ----------------------------------------------------------

export type Actor = { kind: "student"; student: Student } | { kind: "convenor"; convenor: Convenor };

export function people() {
  return {
    students: db.select().from(students).orderBy(asc(students.id)).all(),
    convenors: db.select().from(convenors).orderBy(asc(convenors.name)).all(),
  };
}

// --- courses and the gate ----------------------------------------------------

export type CourseRow = Course & {
  convenor: Convenor; termList: Term[]; year: number; unitsText: string;
  source?: ReturnType<typeof catalogueEntries>[number]; conflicted: boolean;
  rules: ReturnType<typeof rulesForSource>;
};

export function listCourses(query = "", subject = "", year = ACTIVE_YEAR): CourseRow[] {
  if (year !== ACTIVE_YEAR && year !== LEGACY_YEAR) return [];
  const normal = query.trim().replace(/^([a-z]{4})\s+(\d)/i, "$1$2").toUpperCase();
  // Historical checks stay on their original transcription even if additional
  // old source pages are imported later.
  const sources = year === ACTIVE_YEAR ? catalogueEntries().filter(e => e.kind === "course" && e.year === year) : [];
  const rows = db.select().from(courses).innerJoin(convenors, eq(courses.convenorId, convenors.id)).orderBy(asc(courses.code)).all();
  return rows.flatMap(({ courses: course, convenors: convenor }): CourseRow[] => {
    const variants = sources.filter(s => s.code === course.code);
    const source = variants[0];
    const legacy = year === LEGACY_YEAR ? COURSES.find(c => c.code === course.code) : undefined;
    if ((year === LEGACY_YEAR && !legacy) || (year === ACTIVE_YEAR && !source)) return [];
    const conflicted = variants.length > 1;
    const title = source?.evidence.title ?? legacy!.title;
    if (normal && !course.code.includes(normal) && !title.toUpperCase().includes(normal)) return [];
    if (subject && !course.code.startsWith(subject)) return [];
    return [{ ...course, title, convenor, year, source, conflicted,
      units: source ? fixedUnits(source.evidence) : legacy!.units,
      unitsText: source?.evidence.units ?? (legacy ? `${legacy.units} units` : "Units not published"),
      termList: source ? (conflicted ? [] : publishedTerms(source.evidence, year)) : legacy!.terms,
      rules: rulesForSource(course.code, year, source, conflicted),
    }];
  }).sort((a, b) => Number(b.code === normal) - Number(a.code === normal));
}

export function getCourse(code: string, year = ACTIVE_YEAR): CourseRow | undefined {
  return listCourses(code, "", year).find(c => c.code === code.toUpperCase());
}

export function transcriptOf(studentId: number) {
  return db
    .select()
    .from(transcript)
    .where(eq(transcript.studentId, studentId))
    .orderBy(asc(transcript.id))
    .all();
}

export function enrolmentsOf(studentId: number) {
  return db
    .select({
      code: courses.code,
      title: courses.title,
      year: enrolments.year,
      term: enrolments.term,
      via: enrolments.via,
    })
    .from(enrolments)
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .where(eq(enrolments.studentId, studentId))
    .orderBy(asc(courses.code))
    .all().map(e => ({ ...e, title: getCourse(e.code, e.year)?.title ?? e.title }));
}

export function recordOf(student: Student, term?: string, year = ACTIVE_YEAR): StudentRecord {
  const results = transcriptOf(student.id);
  return {
    program: student.program as StudentRecord["program"],
    ...(["GDCOMP", "MCOMP", "VCOMP", "MMLCV"].includes(student.program) ? { academicCareer: "postgraduate" as const } : {}),
    complete: true, // The DB defines the whole fictional scenario, not real ANU history.
    passed: results.filter((r) => PASSING.has(r.grade)).map((r) => ({ code: r.courseCode, units: r.units })),
    failed: results.filter((r) => !PASSING.has(r.grade)).map((r) => r.courseCode),
    enrolled: enrolmentsOf(student.id)
      .filter((e) => e.year === year && (!term || e.term === term))
      .map((e) => e.code),
  };
}

export function gateFor(student: Student, courseCode: string, term?: string, year = ACTIVE_YEAR): Gate {
  const course = getCourse(courseCode, year);
  const source = course?.source;
  const section = source?.evidence.sections.find(s => s.key === "incompatibility");
  return gate(courseCode, course?.rules, recordOf(student, term, year), source ? {
    code: courseCode, year, hash: source.hash, section: "incompatibility", blocks: section?.blocks.map((_, i) => i) ?? [],
  } : undefined);
}

// --- applications ------------------------------------------------------------

export type ApplicationView = Application & {
  course: Course;
  student: Student;
  convenor: Convenor;
  checkList: Check[];
  report: AssessmentReport | null;
  enrolmentConfirmed: boolean;
};

function views(where: SQL) {
  return db
    .select({ applications, courses, students, convenors,
      confirmed: sql<number>`case when ${applications.scenarioKey} is not null then exists (
        select 1 from ${applicationEvents} where ${applicationEvents.applicationId} = ${applications.id}
        and ${applicationEvents.kind} = 'scenario-enrolled'
      ) else exists (
        select 1 from ${enrolments} where ${enrolments.studentId} = ${applications.studentId}
        and ${enrolments.courseId} = ${applications.courseId} and ${enrolments.year} = ${applications.year}
        and ${enrolments.term} = ${applications.term}
      ) end`,
    })
    .from(applications)
    .innerJoin(courses, eq(applications.courseId, courses.id))
    .innerJoin(students, eq(applications.studentId, students.id))
    .innerJoin(convenors, eq(applications.convenorId, convenors.id))
    .where(where)
    .orderBy(desc(applications.id))
    .all()
    .map((r): ApplicationView => {
      const report: AssessmentReport | null = r.applications.assessment ? JSON.parse(r.applications.assessment) : null;
      return {
        ...r.applications,
        course: getCourse(r.courses.code, r.applications.year) ?? r.courses,
        student: r.students, convenor: r.convenors, report,
        enrolmentConfirmed: r.applications.status === "approved" && !!r.confirmed,
        checkList: report ? ("checks" in report.gate ? report.gate.checks : []) : JSON.parse(r.applications.checks),
      };
    });
}

export function applicationsOfStudent(studentId: number): ApplicationView[] {
  return views(eq(applications.studentId, studentId));
}

/** Scenario completions are visible history, never academic enrolment evidence. */
export function completedScenariosOf(studentId: number): ApplicationView[] {
  return views(and(eq(applications.studentId, studentId), isNotNull(applications.scenarioKey), eq(applications.status, "approved"))!)
    .filter(app => app.enrolmentConfirmed);
}

export function queueOf(convenorId: number): ApplicationView[] {
  return views(and(eq(applications.convenorId, convenorId), isNull(applications.assessment))!);
}

export function getApplication(id: number): (ApplicationView & { events: ApplicationEvent[] }) | undefined {
  const view = views(eq(applications.id, id))[0];
  if (!view) return undefined;
  const events = db
    .select()
    .from(applicationEvents)
    .where(eq(applicationEvents.applicationId, id))
    .orderBy(asc(applicationEvents.id))
    .all();
  return { ...view, events };
}

export function latestAssessment(studentId: number, courseId: number, term: string, year: number): Application | undefined {
  return db.select().from(applications).where(and(eq(applications.studentId, studentId), eq(applications.courseId, courseId),
    eq(applications.term, term), eq(applications.year, year), isNull(applications.scenarioKey),
    inArray(applications.status, ["assessment-incomplete", "auto-rejected"]))).orderBy(desc(applications.id)).get();
}

/** The application a student already has open (or approved) for a course. */
export function liveApplication(
  studentId: number,
  courseId: number,
  term: string,
  year = ACTIVE_YEAR,
): Application | undefined {
  return db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.studentId, studentId),
        eq(applications.courseId, courseId),
        eq(applications.term, term),
        eq(applications.year, year),
        isNull(applications.scenarioKey),
        inArray(applications.status, ["with-convenor", "approved"]),
      ),
    )
    .get();
}

export function submitApplication(input: {
  student: Student;
  courseCode: string;
  term: string;
  statement: string;
  year?: number;
  dispute?: boolean;
  reviewMode?: "automatic" | "convenor";
  reason?: string;
  scenarioKey?: string;
}): Application {
  const year = input.year ?? ACTIVE_YEAR;
  const course = getCourse(input.courseCode, year);
  if (!course) throw new UserError("That course isn't in the catalogue.");
  const offering = offeringFor(course.id, input.term, year);
  if (!offering) {
    throw new UserError(`${course.code} isn't offered in that term.`);
  }
  if (input.reviewMode === "automatic") return submitAutomatic(input, course, offering);
  if (input.scenarioKey) throw new UserError("Scenarios use automatic demo assessment only.");
  const existing = liveApplication(input.student.id, course.id, input.term, year);
  if (existing) return existing;
  const statement = input.statement.trim().slice(0, 2000);
  if (!statement) throw new UserError("Explain why you are requesting an assessment or permission.");

  const g = gateFor(input.student, course.code, input.term, year);
  const round = firstRound(course.code, g);
  const checks: Check[] = "checks" in g ? g.checks : [];
  if (!canRequestAssessment(g))
    throw new UserError(round.reasons.join(" "));
  const reason = requestReason(input.reason ?? (input.dispute ? "record-correction" : "recorded-checks"));
  const asksForJudgement = input.dispute || reason !== "recorded-checks";
  const status = round.decision === "auto-reject" && !asksForJudgement ? "auto-rejected" : "with-convenor";

  const app = db.transaction((tx) => {
    tx.insert(selections)
      .values({ studentId: input.student.id, offeringId: offering.id })
      .onConflictDoNothing()
      .run();
    const app = tx
      .insert(applications)
      .values({
        studentId: input.student.id,
        courseId: course.id,
        // the routing: from the course row, never from anything typed
        convenorId: course.convenorId,
        term: input.term,
        year,
        statement,
        status,
        checks: JSON.stringify(checks),
      })
      .returning()
      .get();
    const event = (actor: string, actorName: string, kind: string, detail: string) =>
      tx.insert(applicationEvents).values({ applicationId: app.id, actor, actorName, kind, detail }).run();

    event(
      "student",
      input.student.name,
      "submitted",
      `Requested ${g.outcome === "not-recorded" ? "an eligibility assessment" : "a permission code"} for ${course.code}, ${year} ${TERM_LABELS[input.term as Term]}.`,
    );
    if (asksForJudgement)
      event(
        "student",
        input.student.name,
        reason === "exception" ? "exception-requested" : reason === "equivalent-study" ? "equivalence-requested" : "record-disputed",
        `Asked for human review: ${REQUEST_REASONS[reason === "recorded-checks" ? "record-correction" : reason]}. See the student's explanation. The recorded checks are unchanged.`,
      );
    if (status === "auto-rejected") {
      event("system", "Automatic first round", "auto-rejected", round.reasons.join("\n"));
    } else {
      event("system", "Automatic first round", "checked", round.reasons.join("\n"));
      event(
        "system",
        "Automatic first round",
        "routed",
        `Sent to ${course.convenor.name}, convenor of ${course.code}.`,
      );
    }
    return app;
  });
  bus.emit("change", { applicationId: app.id, convenorId: app.convenorId, studentId: app.studentId });
  return app;
}

export function decide(input: {
  convenor: Convenor;
  applicationId: number;
  approve: boolean;
  note: string;
}): Application {
  const app = db.select().from(applications).where(eq(applications.id, input.applicationId)).get();
  if (!app) throw new UserError("No such application.");
  if (app.convenorId !== input.convenor.id) {
    throw new UserError("Only the convenor this request was routed to can decide it.");
  }
  if (app.status !== "with-convenor") throw new UserError("This request has already been decided.");
  const note = input.note.trim().slice(0, 2000);
  if (!input.approve && !note) throw new UserError("Say why, so the student isn't left guessing.");

  const course = db.select().from(courses).where(eq(courses.id, app.courseId)).get() as Course;
  const code = input.approve ? permissionCode(course.code) : null;
  const updated = db.transaction((tx) => {
    const updated = tx
      .update(applications)
      .set({ status: input.approve ? "approved" : "rejected", permissionCode: code })
      .where(eq(applications.id, app.id))
      .returning()
      .get();
    tx.insert(applicationEvents)
      .values({
        applicationId: app.id,
        actor: "convenor",
        actorName: input.convenor.name,
        kind: input.approve ? "approved" : "rejected",
        detail: [input.approve ? `Permission code issued: ${code}` : "", note].filter(Boolean).join("\n"),
      })
      .run();
    return updated;
  });
  bus.emit("change", { applicationId: app.id, convenorId: app.convenorId, studentId: app.studentId });
  return updated;
}

function permissionCode(courseCode: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tail = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");
  return `${courseCode}-${tail}`;
}

function submitAutomatic(
  input: Parameters<typeof submitApplication>[0], course: CourseRow, offering: typeof offerings.$inferSelect, pending?: Application,
): Application {
  const reason = requestReason(input.reason ?? (input.dispute ? "record-correction" : "recorded-checks"));
  const scenario = input.scenarioKey ? SCENARIO : undefined;
  if (scenario && (input.scenarioKey !== scenario.key || course.code !== scenario.courseCode || offering.year !== scenario.year || offering.term !== scenario.term))
    throw new UserError("That scenario does not belong to this offering.");
  const existing = scenario ? db.select().from(applications).where(and(
    eq(applications.studentId, input.student.id), eq(applications.scenarioKey, scenario.key), eq(applications.status, "approved"),
  )).get() : liveApplication(input.student.id, course.id, offering.term, offering.year);
  if (existing && !pending) return existing;
  const statement = input.statement.trim().slice(0, 2000);
  if (!statement) throw new UserError("Explain why you are requesting an assessment or permission.");
  const evidence = scenario ? scenarioEvidence(course.rules) : { record: recordOf(input.student, offering.term, offering.year), rules: course.rules };
  const publishedGate = gateFor(input.student, course.code, offering.term, offering.year);
  if (!scenario && !canRequestAssessment(publishedGate)) throw new UserError(firstRound(course.code, publishedGate).reasons.join(" "));
  const section = course.source?.evidence.sections.find(s => s.key === "incompatibility");
  const report = assessDemo({
    offering: { courseId: course.id, code: course.code, year: offering.year, term: offering.term },
    ...evidence, reason, statement, scenario,
    source: course.source ? { code: course.code, year: offering.year, hash: course.source.hash, section: "incompatibility", blocks: section?.blocks.map((_, i) => i) ?? [] } : undefined,
  });
  const requestKey = snapshotHash({ studentId: input.student.id, report, pendingId: pending?.id });
  const app = db.transaction((tx) => {
    const retry = tx.select().from(applications).where(eq(applications.requestKey, requestKey)).get();
    if (retry) return retry;
    if (!scenario) tx.insert(selections).values({ studentId: input.student.id, offeringId: offering.id }).onConflictDoNothing().run();
    const values = {
      studentId: input.student.id, courseId: course.id, convenorId: pending?.convenorId ?? course.convenorId,
      term: offering.term, year: offering.year, statement, status: report.outcome,
      checks: pending?.checks ?? JSON.stringify("checks" in report.gate ? report.gate.checks : []),
      assessment: JSON.stringify(report), scenarioKey: scenario?.key ?? null, requestKey,
      permissionCode: report.outcome === "approved" ? `${scenario ? "SCENARIO-" : "DEMO-"}${permissionCode(course.code)}` : null,
    };
    const app = pending ? tx.update(applications).set(values).where(and(eq(applications.id, pending.id), eq(applications.status, "with-convenor"))).returning().get()
      : tx.insert(applications).values(values).returning().get();
    if (!app) throw new UserError("This request has already been decided. Reload its result.");
    tx.insert(applicationEvents).values([
      { applicationId: app.id, actor: "student", actorName: input.student.name, kind: pending ? "automatic-requested" : "submitted",
        detail: `Requested automated demo assessment for ${course.code}, ${offering.year} ${TERM_LABELS[offering.term as Term]}.${pending ? " Replaces the pending staff review; earlier events are preserved." : ""}${scenario ? " Fictional topic scenario; separate from the student's profile." : ""}` },
      { applicationId: app.id, actor: "system", actorName: "Automated demo review", kind: "assessed",
        detail: `Saved the rule, record, statement and offering snapshots under ${report.policy}. ${report.context.treatment}` },
      { applicationId: app.id, actor: "system", actorName: "Automated demo review", kind: report.outcome,
        detail: [...report.reasons, ...report.nextActions].join("\n") },
    ]).run();
    return app;
  });
  bus.emit("change", { applicationId: app.id, convenorId: app.convenorId, studentId: app.studentId });
  return app;
}

/** The owner can explicitly move a pending request out of the unstaffed queue. */
export function assessPending(student: Student, applicationId: number, reason: string): Application {
  const app = db.select().from(applications).where(eq(applications.id, applicationId)).get();
  if (!app || app.studentId !== student.id) throw new UserError("This request isn't yours.");
  if (app.assessment) return app; // Retrying the conversion does not add events.
  if (app.status !== "with-convenor") throw new UserError("This request has already been decided.");
  const course = db.select().from(courses).where(eq(courses.id, app.courseId)).get();
  const current = course && getCourse(course.code, app.year);
  const offering = current && offeringFor(current.id, app.term, app.year);
  if (!current || !offering) throw new UserError("This offering is no longer available for automatic assessment.");
  return submitAutomatic({ student, courseCode: current.code, term: app.term, year: app.year, statement: app.statement, reason, reviewMode: "automatic" }, current, offering, app);
}

/** Scenario confirmation is deliberately NOT an enrolment in the user's profile. */
export function confirmScenario(student: Student, applicationId: number): void {
  db.transaction((tx) => {
    const app = tx.select().from(applications).where(eq(applications.id, applicationId)).get();
    if (!app || app.studentId !== student.id) throw new UserError("This scenario request isn't yours.");
    if (app.scenarioKey !== SCENARIO.key || app.status !== "approved" || !app.permissionCode)
      throw new UserError("This is not an approved scenario request.");
    if (tx.select().from(applicationEvents).where(and(eq(applicationEvents.applicationId, app.id), eq(applicationEvents.kind, "scenario-enrolled"))).get()) return;
    tx.insert(applicationEvents).values({ applicationId: app.id, actor: "student", actorName: student.name,
      kind: "scenario-enrolled", detail: `Confirmed scenario enrolment for ${SCENARIO.courseCode}, ${app.year} ${TERM_LABELS[app.term as Term]}. Your profile and semester enrolments are unchanged.` }).run();
  });
}

// --- enrolment ---------------------------------------------------------------

/** Enrol if the gate says eligible, or with an approved application's code. */
export function enrol(input: {
  student: Student;
  courseCode: string;
  term: string;
  year?: number;
  units?: number;
}): "direct" | "permission" {
  const year = input.year ?? ACTIVE_YEAR;
  const course = getCourse(input.courseCode, year);
  if (!course) throw new UserError("That course isn't in the catalogue.");
  const offering = offeringFor(course.id, input.term, year);
  if (!offering) {
    throw new UserError(`${course.code} isn't offered in that term.`);
  }
  const approved = db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.studentId, input.student.id),
        eq(applications.courseId, course.id),
        eq(applications.term, input.term),
        eq(applications.year, year),
        eq(applications.status, "approved"),
        isNull(applications.scenarioKey),
      ),
    )
    .get();
  const g = gateFor(input.student, course.code, input.term, year);
  if (g.outcome === "already") throw new UserError(g.text);
  if (!approved && g.outcome === "not-recorded") throw new UserError(`Eligibility for ${course.code} is unknown. Request an assessment before enrolling.`);
  const via = approved ? "permission" : g.outcome === "eligible" ? "direct" : null;
  if (!via) throw new UserError(`You need a permission code for ${course.code}.`);

  db.transaction((tx) => {
    // The load check and insert share one write transaction, including permission
    // enrolments. Two simultaneous confirmations cannot both consume the last units.
    const load = studyLoadFor(input.student.id, course.code, year, input.term, input.units);
    if (load.state !== "within-limit") throw new UserError(
      `Cannot confirm enrolment: ${loadText(load)} against a ${load.limit}-unit limit. ${load.state === "over-maximum" ? "The maximum is 36 units." : "Open Study load to request an overload assessment or resolve missing load information."}`);
    tx.insert(enrolments)
      .values({ studentId: input.student.id, courseId: course.id, term: input.term, year, via,
        units: load.target.units, overloadRequestId: load.maximum! > 24 ? load.approval?.id : null })
      .run();
    tx.insert(selections)
      .values({ studentId: input.student.id, offeringId: offering.id })
      .onConflictDoNothing()
      .run();
    if (approved) {
      tx.insert(applicationEvents)
        .values({
          applicationId: approved.id,
          actor: "student",
          actorName: input.student.name,
          kind: "enrolled",
          detail: `Enrolled in ${course.code}, ${year} ${TERM_LABELS[input.term as Term]}, with code ${approved.permissionCode}.`,
        })
        .run();
    }
    if (load.maximum! > 24 && load.approval) tx.insert(overloadEvents).values({ requestId: load.approval.id,
      actor: "student", actorName: input.student.name, kind: "enrolled", detail: `Confirmed ${course.code}, ${year} ${input.term}; counted load ${loadText(load)} under the approved limit.` }).run();
  }, { behavior: "immediate" });
  if (approved) {
    bus.emit("change", {
      applicationId: approved.id,
      convenorId: approved.convenorId,
      studentId: approved.studentId,
    });
  }
  return via;
}

export function offeringFor(courseId: number, term: string, year = ACTIVE_YEAR) {
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course || !getCourse(course.code, year)?.termList.includes(term as Term)) return undefined;
  return db
    .select()
    .from(offerings)
    .where(and(eq(offerings.courseId, courseId), eq(offerings.term, term), eq(offerings.year, year)))
    .get();
}

export function saveSelection(studentId: number, offeringId: number): void {
  const offering = db.select().from(offerings).where(eq(offerings.id, offeringId)).get();
  if (!offering || !offeringFor(offering.courseId, offering.term, offering.year))
    throw new UserError("That course offering is unavailable.");
  db.insert(selections).values({ studentId, offeringId }).onConflictDoNothing().run();
}

export function removeSelection(studentId: number, offeringId: number): void {
  db.delete(selections)
    .where(and(eq(selections.studentId, studentId), eq(selections.offeringId, offeringId)))
    .run();
}

export function selectionsOf(studentId: number) {
  return db
    .select({ offering: offerings, course: courses })
    .from(selections)
    .innerJoin(offerings, eq(selections.offeringId, offerings.id))
    .innerJoin(courses, eq(offerings.courseId, courses.id))
    .where(eq(selections.studentId, studentId))
    .all().map(r => ({ ...r, course: getCourse(r.course.code, r.offering.year) ?? { ...r.course, unitsText: r.course.units === null ? "Units not published" : `${r.course.units} units` } }));
}

// --- the demo state ----------------------------------------------------------

// A fresh database gets one request already waiting, so a convenor's queue
// isn't empty on first look. It goes through submitApplication like any other,
// so its timeline is real.
if (db.select({ id: applications.id }).from(applications).limit(1).all().length === 0) {
  const olivia = db.select().from(students).where(eq(students.uid, "u7000105")).get();
  if (olivia) {
    submitApplication({
      student: olivia,
      courseCode: "COMP8620",
      term: "S2",
      statement:
        "I passed COMP3620 in my undergraduate degree and would like to take this semester's advanced topic in AI.",
    });
  }
}
