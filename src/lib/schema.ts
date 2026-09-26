import { sql } from "drizzle-orm";
import { int, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { ACTIVE_YEAR } from "./academic-year";

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
  purpose: text().notNull().default("course"),
});

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  title: text().notNull(),
  /** Null for a variable/unknown credit value; published wording stays in the source. */
  units: int(),
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

/** Planning metadata is separate from transcript facts; legacy profiles stay intact. */
export const studyPlans = sqliteTable("study_plans", {
  studentId: int("student_id").primaryKey().references(() => students.id),
  ruleYear: int("rule_year").notNull(),
  specialisation: text().notNull(),
  planningYear: int("planning_year").notNull(),
  planningTerm: text("planning_term").notNull(),
  templateId: text("template_id"),
  templateSnapshot: text("template_snapshot"),
  createdAt: createdAt(),
});

export const studyPlanEvents = sqliteTable("study_plan_events", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id").notNull().references(() => students.id),
  detail: text().notNull(),
  createdAt: createdAt(),
});

/** Adviser exchanges preserve preferences and provenance, never academic facts. */
export const adviserRuns = sqliteTable("adviser_runs", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id").notNull().references(() => students.id),
  preferences: text().notNull(),
  targetUnits: int("target_units").notNull(),
  contextHash: text("context_hash").notNull(),
  snapshot: text().notNull(),
  status: text().notNull(),
  response: text(),
  model: text(),
  modelDigest: text("model_digest"),
  elapsedMs: int("elapsed_ms"),
  startedAt: int("started_at").notNull(),
  createdAt: createdAt(),
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
  /** Optional explicit evidence for overload assessment; never infer marks from grade bands. */
  mark: real(),
  program: text(),
  institution: text(),
});

export const overloadRequests = sqliteTable("overload_requests", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id").notNull().references(() => students.id),
  reviewerId: int("reviewer_id").notNull().references(() => convenors.id),
  courseId: int("course_id").notNull().references(() => courses.id),
  year: int().notNull(),
  term: text().notNull(),
  period: text().notNull(),
  requestedLimit: int("requested_limit"),
  approvedLimit: int("approved_limit"),
  statement: text().notNull(),
  reason: text().notNull(),
  status: text().notNull(),
  assessment: text().notNull(),
  requestKey: text("request_key").notNull().unique(),
  createdAt: createdAt(),
});

export const overloadEvents = sqliteTable("overload_events", {
  id: int().primaryKey({ autoIncrement: true }),
  requestId: int("request_id").notNull().references(() => overloadRequests.id),
  actor: text().notNull(),
  actorName: text("actor_name").notNull(),
  kind: text().notNull(),
  detail: text().notNull(),
  createdAt: createdAt(),
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
    year: int().notNull().default(ACTIVE_YEAR),
    /** "seed" (current load at boot), "direct" (gate said eligible) or
     *  "permission" (an approved application's code). */
    via: text().notNull(),
    /** Snapshot for new enrolments; null historical rows use their catalogue year. */
    units: int(),
    overloadRequestId: int("overload_request_id").references(() => overloadRequests.id),
    endedAt: text("ended_at"),
    endedReason: text("ended_reason"),
    revision: int().notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enrolments_student_course_term").on(t.studentId, t.courseId, t.year, t.term)],
);

export const enrolmentEvents = sqliteTable("enrolment_events", {
  id: int().primaryKey({ autoIncrement: true }),
  enrolmentId: int("enrolment_id").notNull().references(() => enrolments.id),
  studentId: int("student_id").notNull().references(() => students.id),
  revision: int().notNull(),
  kind: text().notNull(),
  detail: text().notNull(),
  createdAt: createdAt(),
});

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
  year: int().notNull().default(ACTIVE_YEAR),
  statement: text().notNull(),
  /** "auto-rejected" | "with-convenor" | "approved" | "rejected" | "assessment-incomplete" */
  status: text().notNull(),
  /** JSON Check[]: the checklist exactly as the gate saw it at submission. */
  checks: text().notNull(),
  /** Immutable AssessmentReport JSON; null for the historical staff workflow. */
  assessment: text(),
  /** A scenario permission is never usable for profile enrolment. */
  scenarioKey: text("scenario_key"),
  /** Content identity makes automated retries reuse their original result. */
  requestKey: text("request_key").unique(),
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

/** Receipt tests never activate accounts, change passwords or replace sessions. */
export const emailChecks = sqliteTable("email_checks", {
  id: int().primaryKey({ autoIncrement: true }),
  accountId: int("account_id").notNull().references(() => accounts.id),
  tokenHash: text("token_hash").notNull().unique(),
  status: text().notNull().default("pending"),
  requestedAt: int("requested_at").notNull(),
  expiresAt: int("expires_at").notNull(),
  sentAt: int("sent_at"),
  confirmedAt: int("confirmed_at"),
});

export const authLimits = sqliteTable("auth_limits", {
  key: text().primaryKey(),
  count: int().notNull(),
  resetsAt: int("resets_at").notNull(),
});

// Offline published catalogue evidence. Kept separate from the 2026 demo's
// executable gates, enrolments and offerings. A title is never an identity.
export const catalogueVersions = sqliteTable("catalogue_versions", {
  id: int().primaryKey({ autoIncrement: true }),
  kind: text().notNull(),
  code: text().notNull(),
  year: int().notNull(),
}, t => [uniqueIndex("catalogue_identity").on(t.kind, t.code, t.year)]);

/** Append-only semantic snapshots: changed source content does not overwrite
 * the old wording or inherit its review. JSON follows CatalogueEvidence. */
export const catalogueSnapshots = sqliteTable("catalogue_snapshots", {
  id: int().primaryKey({ autoIncrement: true }),
  versionId: int("version_id").notNull().references(() => catalogueVersions.id),
  hash: text().notNull().unique(),
  evidence: text().notNull(),
  createdAt: createdAt(),
});

export const catalogueSources = sqliteTable("catalogue_sources", {
  id: int().primaryKey({ autoIncrement: true }),
  snapshotId: int("snapshot_id").notNull().references(() => catalogueSnapshots.id),
  path: text().notNull(),
  sha256: text().notNull(),
  url: text(),
  urlBasis: text("url_basis").notNull(),
}, t => [uniqueIndex("catalogue_source_evidence").on(t.snapshotId, t.path, t.sha256)]);

/** A mention in a source block, NOT an inferred prerequisite/membership edge.
 * Targets can be absent or unversioned; retaining them exposes missing evidence. */
export const catalogueReferences = sqliteTable("catalogue_references", {
  id: int().primaryKey({ autoIncrement: true }),
  snapshotId: int("snapshot_id").notNull().references(() => catalogueSnapshots.id),
  position: int().notNull(),
  section: text().notNull(),
  block: int().notNull(),
  quote: text().notNull(),
  kind: text().notNull(),
  code: text().notNull(),
  year: int(),
  url: text(),
  basis: text().notNull(),
}, t => [uniqueIndex("catalogue_reference_position").on(t.snapshotId, t.position)]);

/** Review state is independent of imported text and survives every reseed.
 * No automatic eligibility or planning consumes this table yet. */
export const catalogueReviews = sqliteTable("catalogue_reviews", {
  snapshotId: int("snapshot_id").primaryKey().references(() => catalogueSnapshots.id),
  status: text().notNull().default("unreviewed"),
  notes: text().notNull().default(""),
  createdAt: createdAt(),
});
