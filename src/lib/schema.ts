import { sql } from "drizzle-orm";
import { int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
//
// Reference data (convenors, courses, seeded students and their records) is
// upserted at boot from src/data/ by src/lib/seed.ts; applications, their
// events and non-seed enrolments are what people create.

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`);

export const convenors = sqliteTable("convenors", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
});

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  title: text().notNull(),
  units: int().notNull(),
  /** JSON array of Term, from src/data/courses.ts. */
  terms: text().notNull(),
  convenorId: int("convenor_id")
    .notNull()
    .references(() => convenors.id),
});

export const students = sqliteTable("students", {
  id: int().primaryKey({ autoIncrement: true }),
  uid: text().notNull().unique(),
  name: text().notNull(),
  /** A ProgramKey from src/data/requisites.ts. */
  program: text().notNull(),
  recordSource: text("record_source").notNull().default("Fictional demonstration record"),
});

/** Past results. Codes are text, not course ids: a transcript holds
 *  undergraduate and other courses the postgraduate catalogue doesn't list. */
export const transcript = sqliteTable("transcript", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id")
    .notNull()
    .references(() => students.id),
  courseCode: text("course_code").notNull(),
  grade: text().notNull(),
  units: int().notNull(),
  term: text().notNull(),
});

export const enrolments = sqliteTable(
  "enrolments",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    term: text().notNull(),
    year: int().notNull().default(2026),
    /** "seed" (current load at boot), "direct" (gate said eligible) or
     *  "permission" (an approved application's code). */
    via: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enrolments_student_course_term").on(t.studentId, t.courseId, t.year, t.term)],
);

export const applications = sqliteTable("applications", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id")
    .notNull()
    .references(() => students.id),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
  /** Copied from the course row at submission: this is the routing, and it
   *  never comes from anything the student typed. */
  convenorId: int("convenor_id")
    .notNull()
    .references(() => convenors.id),
  term: text().notNull(),
  year: int().notNull().default(2026),
  statement: text().notNull(),
  /** "auto-rejected" | "with-convenor" | "approved" | "rejected" */
  status: text().notNull(),
  /** JSON Check[]: the checklist exactly as the gate saw it at submission. */
  checks: text().notNull(),
  permissionCode: text("permission_code"),
  createdAt: createdAt(),
});

/** The timeline. Every status change writes one; nothing changes without. */
export const applicationEvents = sqliteTable("application_events", {
  id: int().primaryKey({ autoIncrement: true }),
  applicationId: int("application_id")
    .notNull()
    .references(() => applications.id),
  /** "student" | "system" | "convenor" */
  actor: text().notNull(),
  actorName: text("actor_name").notNull(),
  kind: text().notNull(),
  detail: text().notNull(),
  createdAt: createdAt(),
});

export type Convenor = typeof convenors.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;

export const offerings = sqliteTable(
  "offerings",
  {
    id: int().primaryKey({ autoIncrement: true }),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    year: int().notNull(),
    term: text().notNull(),
  },
  (t) => [uniqueIndex("offering_course_year_term").on(t.courseId, t.year, t.term)],
);

export const selections = sqliteTable(
  "selections",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id),
    offeringId: int("offering_id")
      .notNull()
      .references(() => offerings.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("selection_student_offering").on(t.studentId, t.offeringId)],
);

// Public registration creates students only. Convenor accounts are provisioned
// through scripts/invite-staff.ts, never from a browser-supplied role.
export const accounts = sqliteTable("accounts", {
  id: int().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  passwordHash: text("password_hash"),
  studentId: int("student_id")
    .unique()
    .references(() => students.id),
  convenorId: int("convenor_id")
    .unique()
    .references(() => convenors.id),
  verifiedAt: int("verified_at"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: int("account_id")
    .notNull()
    .references(() => accounts.id),
  expiresAt: int("expires_at").notNull(),
});

export const emailTokens = sqliteTable("email_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: int("account_id")
    .notNull()
    .references(() => accounts.id),
  purpose: text().notNull(),
  expiresAt: int("expires_at").notNull(),
});

export const authLimits = sqliteTable("auth_limits", {
  key: text().primaryKey(),
  count: int().notNull(),
  resetsAt: int("resets_at").notNull(),
});
