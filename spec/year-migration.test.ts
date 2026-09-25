import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { migrateDatabase } from "../src/lib/migrate";
import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import catalogue from "../src/data/catalogue-sources.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { seed } from "../src/lib/seed";
import { seedCatalogue } from "../src/lib/seed-catalogue";
import { seedPublishedOfferings } from "../src/lib/seed-offerings";
import { accounts, applicationEvents, applications, courses, enrolments, offerings, selections, students, transcript } from "../src/lib/schema";

it("upgrades a populated 2026 database without changing profiles, approvals, events or enrolments", () => {
  const directory = mkdtempSync(join(tmpdir(), "year-migration-"));
  const oldFolder = join(directory, "old-migrations");
  mkdirSync(join(oldFolder, "meta"), { recursive: true });
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx < 5);
  writeFileSync(join(oldFolder, "meta/_journal.json"), JSON.stringify(journal));
  for (const entry of journal.entries) cpSync(`drizzle/${entry.tag}.sql`, join(oldFolder, `${entry.tag}.sql`));
  const client = new Database(join(directory, "app.db"));
  const db = drizzle(client);
  client.pragma("foreign_keys = ON");
  try {
    migrate(db, { migrationsFolder: oldFolder });
    seed(db);
    const student = db.insert(students).values({ uid: "historic-user", name: "Existing fictional user", program: "VCOMP" }).returning().get();
    db.insert(accounts).values({ email: "historic-user@anu.edu.au", passwordHash: "fixture-hash-preserved", studentId: student.id, verifiedAt: 1234 }).run();
    db.insert(transcript).values({ studentId: student.id, courseCode: "COMP6320", units: 6, grade: "HD", term: "2025 S1" }).run();
    const course = db.select().from(courses).where(eq(courses.code, "COMP8620")).get()!;
    const offering = db.select().from(offerings).where(eq(offerings.courseId, course.id)).get()!;
    // Use the OLD schema for the fixture, before new assessment columns exist.
    const app = client.prepare("INSERT INTO applications (student_id, course_id, convenor_id, year, term, status, permission_code, checks, statement) VALUES (?, ?, ?, 2026, 'S2', 'approved', 'HISTORICAL-PERMISSION', ?, 'Original request') RETURNING id")
      .get(student.id, course.id, course.convenorId, '[{"met":true,"text":"Original check"}]') as { id: number };
    db.insert(applicationEvents).values({ applicationId: app.id, actor: "convenor", actorName: "Fictional reviewer", kind: "approved", detail: "Original decision" }).run();
    db.insert(enrolments).values({ studentId: student.id, courseId: course.id, year: 2026, term: "S2", via: "permission" }).run();
    db.insert(selections).values({ studentId: student.id, offeringId: offering.id }).run();
    const state = () => ({
      profile: db.select().from(students).where(eq(students.id, student.id)).get(),
      account: db.select().from(accounts).where(eq(accounts.studentId, student.id)).get(),
      transcript: db.select().from(transcript).where(eq(transcript.studentId, student.id)).all(),
      requests: client.prepare("SELECT id, student_id, course_id, convenor_id, year, term, status, permission_code, checks, statement, created_at FROM applications").all(), events: db.select().from(applicationEvents).all(),
      enrolments: db.select().from(enrolments).where(eq(enrolments.studentId, student.id)).all(),
      selections: db.select().from(selections).all(),
    });
    const before = state();
    migrateDatabase(client);
    expect(db.select().from(applications).where(eq(applications.id, app.id)).get()).toMatchObject({ assessment: null, scenarioKey: null, requestKey: null });
    for (let boot = 0; boot < 2; boot++) {
      seed(db);
      seedCatalogue(db, catalogue.snapshots as CatalogueSnapshot[]);
      seedPublishedOfferings(db);
      expect(state()).toEqual(before);
    }
    expect(db.select().from(courses).where(eq(courses.code, "COMP8620")).get()?.id).toBe(course.id);
    expect(db.select().from(offerings).where(eq(offerings.year, 2027)).all().length).toBeGreaterThan(60);
    expect(client.pragma("foreign_key_check")).toEqual([]);
    expect(client.pragma("foreign_keys", { simple: true })).toBe(1);
  } finally { client.close(); }
});

it("rolls back a failed migration and restores foreign-key enforcement", () => {
  const directory = mkdtempSync(join(tmpdir(), "failed-migration-"));
  mkdirSync(join(directory, "meta"));
  writeFileSync(join(directory, "meta/_journal.json"), JSON.stringify({ version: "7", dialect: "sqlite", entries: [{ idx: 0, version: "6", when: 1, tag: "0000_failure", breakpoints: true }] }));
  writeFileSync(join(directory, "0000_failure.sql"), "CREATE TABLE transient_fixture (id integer);--> statement-breakpoint\nINSERT INTO missing_table VALUES (1);");
  const client = new Database(":memory:");
  try {
    expect(() => migrateDatabase(client, directory)).toThrow();
    expect(client.prepare("SELECT name FROM sqlite_master WHERE name = 'transient_fixture'").get()).toBeUndefined();
    expect(client.inTransaction).toBe(false);
    expect(client.pragma("foreign_keys", { simple: true })).toBe(1);
  } finally { client.close(); }
});
