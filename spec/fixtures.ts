// Executed ONLY by global-setup against its throwaway database. There is no
// browser endpoint that creates verified accounts or grants these sessions.
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { accounts, emailTokens, sessions, students, transcript } from "../src/lib/schema";
import { createSession, digest, inviteStaff } from "../src/lib/auth";
import { hashPassword } from "../src/lib/passwords";
import { decide, getCourse, people, submitApplication } from "../src/lib/store";
if (process.env.SPEC_FIXTURE !== "1" || !process.env.SPEC_FIXTURE_FILE)
  throw new Error("Test fixture context required");
const passwordHash = await hashPassword("Fixture-only password 2026!");
for (const [uid, name] of [
  ["fixture-assessment-approve", "Assessment approval student"],
  ["fixture-assessment-decline", "Assessment decline student"],
  ["fixture-demo", "Demo assessment student"],
  ["fixture-demo-other", "Other demo student"],
]) {
  db.insert(students).values({ uid, name, program: "VCOMP" }).run();
}
const termStudent = db
  .insert(students)
  .values({ uid: "fixture-offering", name: "Offering test student", program: "MCOMP" })
  .returning()
  .get();
db.insert(transcript)
  .values({ studentId: termStudent.id, courseCode: "COMP2400", grade: "P", units: 6, term: "2025 S2" })
  .run();
const historicalStudent = db.insert(students).values({ uid: "fixture-historical", name: "Historical approval student", program: "MCOMP" }).returning().get();
db.insert(transcript).values({ studentId: historicalStudent.id, courseCode: "COMP2400", grade: "P", units: 6, term: "2025 S2" }).run();
const historicalRequest = submitApplication({ student: historicalStudent, courseCode: "COMP6240", year: 2026, term: "S1", statement: "Historical offering only", dispute: true });
decide({ convenor: getCourse("COMP6240", 2026)!.convenor, applicationId: historicalRequest.id, approve: true, note: "Fictional 2026 exception" });
const all = people();
const cookies: Record<string, string> = {};
for (const person of [
  ...all.students.map((s) => ({ ...s, studentId: s.id, convenorId: undefined })),
  ...all.convenors.map((c) => ({ ...c, studentId: undefined, convenorId: c.id })),
]) {
  const email = `fixture-${person.studentId ? "student" : "staff"}-${person.id}@anu.edu.au`;
  const account = db
    .insert(accounts)
    .values({
      email,
      passwordHash,
      studentId: person.studentId,
      convenorId: person.convenorId,
      verifiedAt: Date.now(),
    })
    .returning()
    .get();
  cookies[person.name] = `enrol_session=${createSession(account.id)}`;
}
const first = db.select().from(accounts).get()!;
const expiredToken = randomBytes(32).toString("hex");
db.insert(emailTokens)
  .values({
    tokenHash: digest(expiredToken),
    accountId: first.id,
    purpose: "verify",
    expiresAt: Date.now() - 60_000,
  })
  .run();
const expiredSession = createSession(first.id);
db.update(sessions)
  .set({ expiresAt: Date.now() - 60_000 })
  .where(eq(sessions.tokenHash, digest(expiredSession)))
  .run();
// A distinct fictional reviewer proves the administrator's invitation flow.
const { convenors } = await import("../src/lib/schema");
const reviewer = db
  .insert(convenors)
  .values({ name: "Invitation test reviewer", email: "invited-reviewer@example.edu" })
  .returning()
  .get();
await inviteStaff("invited-reviewer@anu.edu.au", reviewer.id);
writeFileSync(process.env.SPEC_FIXTURE_FILE, JSON.stringify({ cookies, expiredToken, expiredSession }));
