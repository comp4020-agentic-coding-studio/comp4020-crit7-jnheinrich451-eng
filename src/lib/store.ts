import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
import type { Term } from "../data/courses";
import { REQUISITES } from "../data/requisites";
import { db } from "./db";
import { type Check, firstRound, type Gate, gate, type StudentRecord } from "./eligibility";
import { bus } from "./events";
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
} from "./schema";
import { UserError } from "./errors";
export { UserError } from "./errors";
export { actorFrom } from "./auth";

// Everything the pages read and write. Eligibility is never decided here —
// it's asked of src/lib/eligibility.ts — and every status change writes an
// application event in the same transaction.

export const TERM_LABELS: Record<Term, string> = {
  Summer: "Summer Session",
  S1: "First Semester",
  Autumn: "Autumn Session",
  Winter: "Winter Session",
  S2: "Second Semester",
  Spring: "Spring Session",
};

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

export type CourseRow = Course & { convenor: Convenor; termList: Term[] };

function withConvenor(rows: { courses: Course; convenors: Convenor }[]): CourseRow[] {
  return rows.map((r) => ({ ...r.courses, convenor: r.convenors, termList: JSON.parse(r.courses.terms) }));
}

export function listCourses(query = "", subject = ""): CourseRow[] {
  const normal = query.trim().replace(/^([a-z]{4})\s+(\d)/i, "$1$2");
  const q = `%${normal.replace(/[\\%_]/g, "")}%`;
  const rows = db
    .select()
    .from(courses)
    .innerJoin(convenors, eq(courses.convenorId, convenors.id))
    .where(
      and(
        normal ? or(like(courses.code, q), like(courses.title, q)) : undefined,
        /^[A-Z]{4}$/.test(subject) ? like(courses.code, `${subject}%`) : undefined,
      ),
    )
    .orderBy(asc(courses.code))
    .all();
  return withConvenor(rows).sort(
    (a, b) => Number(b.code === normal.toUpperCase()) - Number(a.code === normal.toUpperCase()),
  );
}

export function getCourse(code: string): CourseRow | undefined {
  const rows = db
    .select()
    .from(courses)
    .innerJoin(convenors, eq(courses.convenorId, convenors.id))
    .where(eq(courses.code, code.toUpperCase()))
    .all();
  return withConvenor(rows)[0];
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
    .all();
}

export function recordOf(student: Student, term?: string, year = 2026): StudentRecord {
  const results = transcriptOf(student.id);
  return {
    program: student.program as StudentRecord["program"],
    passed: results.filter((r) => PASSING.has(r.grade)).map((r) => ({ code: r.courseCode, units: r.units })),
    failed: results.filter((r) => !PASSING.has(r.grade)).map((r) => r.courseCode),
    enrolled: enrolmentsOf(student.id)
      .filter((e) => !term || (e.term === term && e.year === year))
      .map((e) => e.code),
  };
}

export function gateFor(student: Student, courseCode: string, term?: string, year = 2026): Gate {
  return gate(courseCode, REQUISITES[courseCode], recordOf(student, term, year));
}

// --- applications ------------------------------------------------------------

export type ApplicationView = Application & {
  course: Course;
  student: Student;
  convenor: Convenor;
  checkList: Check[];
};

function views(where: SQL) {
  return db
    .select()
    .from(applications)
    .innerJoin(courses, eq(applications.courseId, courses.id))
    .innerJoin(students, eq(applications.studentId, students.id))
    .innerJoin(convenors, eq(applications.convenorId, convenors.id))
    .where(where)
    .orderBy(desc(applications.id))
    .all()
    .map((r): ApplicationView => ({
      ...r.applications,
      course: r.courses,
      student: r.students,
      convenor: r.convenors,
      checkList: JSON.parse(r.applications.checks),
    }));
}

export function applicationsOfStudent(studentId: number): ApplicationView[] {
  return views(eq(applications.studentId, studentId));
}

export function queueOf(convenorId: number): ApplicationView[] {
  return views(eq(applications.convenorId, convenorId));
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

/** The application a student already has open (or approved) for a course. */
export function liveApplication(
  studentId: number,
  courseId: number,
  term: string,
  year = 2026,
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
}): Application {
  const course = getCourse(input.courseCode);
  if (!course) throw new UserError("That course isn't in the catalogue.");
  const year = input.year ?? 2026;
  const offering = offeringFor(course.id, input.term, year);
  if (!offering) {
    throw new UserError(`${course.code} isn't offered in that term.`);
  }
  const statement = input.statement.trim().slice(0, 2000);
  if (!statement) throw new UserError("Tell the convenor why you're applying.");
  const existing = liveApplication(input.student.id, course.id, input.term, year);
  if (existing) return existing;

  const g = gateFor(input.student, course.code, input.term, year);
  const round = firstRound(course.code, g);
  const checks: Check[] = "checks" in g ? g.checks : [];
  if (g.outcome === "already" || g.outcome === "not-recorded" || g.outcome === "eligible")
    throw new UserError(round.reasons.join(" "));
  const status = round.decision === "auto-reject" && !input.dispute ? "auto-rejected" : "with-convenor";

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
      `Requested a permission code for ${course.code}, ${TERM_LABELS[input.term as Term]}.`,
    );
    if (input.dispute)
      event(
        "student",
        input.student.name,
        "record-disputed",
        "Asked for human review of the recorded eligibility information. See the student's explanation.",
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

// --- enrolment ---------------------------------------------------------------

/** Enrol if the gate says eligible, or with an approved application's code. */
export function enrol(input: {
  student: Student;
  courseCode: string;
  term: string;
  year?: number;
}): "direct" | "permission" {
  const course = getCourse(input.courseCode);
  if (!course) throw new UserError("That course isn't in the catalogue.");
  const year = input.year ?? 2026;
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
      ),
    )
    .get();
  const g = gateFor(input.student, course.code, input.term, year);
  if (g.outcome === "already") throw new UserError(g.text);
  const via = approved ? "permission" : g.outcome === "eligible" ? "direct" : null;
  if (!via) throw new UserError(`You need a permission code for ${course.code}.`);

  db.transaction((tx) => {
    tx.insert(enrolments)
      .values({ studentId: input.student.id, courseId: course.id, term: input.term, year, via })
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
          detail: `Enrolled in ${course.code}, ${TERM_LABELS[input.term as Term]}, with code ${approved.permissionCode}.`,
        })
        .run();
    }
  });
  if (approved) {
    bus.emit("change", {
      applicationId: approved.id,
      convenorId: approved.convenorId,
      studentId: approved.studentId,
    });
  }
  return via;
}

export function offeringFor(courseId: number, term: string, year = 2026) {
  return db
    .select()
    .from(offerings)
    .where(and(eq(offerings.courseId, courseId), eq(offerings.term, term), eq(offerings.year, year)))
    .get();
}

export function saveSelection(studentId: number, offeringId: number): void {
  if (!db.select().from(offerings).where(eq(offerings.id, offeringId)).get())
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
    .all();
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
