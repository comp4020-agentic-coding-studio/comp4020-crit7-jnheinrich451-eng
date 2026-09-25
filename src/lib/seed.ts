import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { COURSES } from "../data/courses";
import { CONVENORS, convenorFor, STUDENTS } from "../data/people";
import { convenors, courses, enrolments, offerings, students, transcript } from "./schema";
import { LEGACY_YEAR } from "./academic-year";

// Brings the database's reference data in line with src/data/ on every boot.
// Convenors, courses and students are upserted by their natural keys, so ids
// (and every application pointing at them) survive a reseed. Transcripts and
// seed enrolments belong to the seed alone and are rewritten wholesale;
// applications and the enrolments people make are never touched.
export function seed(db: BetterSQLite3Database): void {
  db.transaction((tx) => {
    const convenorIds = new Map<string, number>();
    for (const c of CONVENORS) {
      const row = tx
        .insert(convenors)
        .values({ name: c.name, email: c.email, purpose: c.key === "load" ? "overload" : "course" })
        .onConflictDoUpdate({ target: convenors.email, set: { name: c.name, purpose: c.key === "load" ? "overload" : "course" } })
        .returning({ id: convenors.id })
        .get();
      convenorIds.set(c.key, row.id);
    }

    const courseIds = new Map<string, number>();
    const unitsByCode = new Map<string, number>();
    for (const c of COURSES) {
      const values = {
        code: c.code,
        title: c.title,
        units: c.units,
        terms: JSON.stringify(c.terms),
        convenorId: convenorIds.get(convenorFor(c.code)) as number,
      };
      const row = tx
        .insert(courses)
        .values(values)
        .onConflictDoUpdate({ target: courses.code, set: values })
        .returning({ id: courses.id })
        .get();
      courseIds.set(c.code, row.id);
      for (const term of c.terms) {
        tx.insert(offerings).values({ courseId: row.id, year: LEGACY_YEAR, term }).onConflictDoNothing().run();
      }
      unitsByCode.set(c.code, c.units);
    }

    for (const s of STUDENTS) {
      const row = tx
        .insert(students)
        .values({ uid: s.uid, name: s.name, program: s.program })
        .onConflictDoUpdate({ target: students.uid, set: { name: s.name, program: s.program } })
        .returning({ id: students.id })
        .get();

      tx.delete(transcript).where(eq(transcript.studentId, row.id)).run();
      for (const [code, grade, term] of s.results) {
        tx.insert(transcript)
          .values({ studentId: row.id, courseCode: code, grade, term, units: unitsByCode.get(code) ?? 6 })
          .run();
      }

      tx.delete(enrolments)
        .where(and(eq(enrolments.studentId, row.id), eq(enrolments.via, "seed")))
        .run();
      for (const code of s.enrolled) {
        tx.insert(enrolments)
          .values({ studentId: row.id, courseId: courseIds.get(code) as number, year: LEGACY_YEAR, term: "S2", via: "seed" })
          .onConflictDoNothing()
          .run();
      }
    }
  });
}
