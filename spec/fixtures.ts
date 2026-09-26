// Executed ONLY by global-setup against its throwaway database. There is no
// browser endpoint that creates verified accounts or grants these sessions.
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { accounts, emailChecks, emailTokens, enrolments, sessions, students, transcript } from "../src/lib/schema";
import { createSession, digest, inviteStaff } from "../src/lib/auth";
import { hashPassword } from "../src/lib/passwords";
import { decide, getCourse, people, submitApplication } from "../src/lib/store";
import { submitOverload } from "../src/lib/overload-store";
import { generateAuthoredProfile } from "../src/lib/profile-template";
if (process.env.SPEC_FIXTURE !== "1" || !process.env.SPEC_FIXTURE_FILE)
  throw new Error("Test fixture context required");
const passwordHash = await hashPassword("Fixture-only password 2026!");
for (const [uid, name] of [
  ["fixture-assessment-approve", "Assessment approval student"],
  ["fixture-assessment-decline", "Assessment decline student"],
  ["fixture-demo", "Demo assessment student"],
  ["fixture-demo-other", "Other demo student"],
  ["fixture-programming-clear", "Programming eligibility student"],
  ["fixture-programming-conflict", "Programming conflict student"],
  ["fixture-programming-current", "Programming current student"],
  ["fixture-course-overview", "Course overview student"],
  ["fixture-rule-coverage", "Course rule coverage student"],
  ["fixture-staff-exception", "Staff exception student"],
  ["fixture-staff-equivalence", "Staff equivalence student"],
  ["fixture-staff-correction", "Staff correction student"],
  ["fixture-overload-page", "Overload page student"],
  ["fixture-overload-review", "Overload review student"],
  ["fixture-overload-auto", "Overload auto student"],
  ["fixture-overload-race", "Overload race student"],
  ["fixture-overload-permission", "Overload permission student"],
  ["fixture-course-changes", "Course changes student"],
  ["fixture-course-dependency", "Course dependency student"],
  ["fixture-swap-failure", "Swap failure student"],
  ["fixture-change-race", "Course change race student"],
  ["fixture-swap-incompat", "Swap incompatibility student"],
  ["fixture-planning-legacy", "Planning legacy student"],
  ["fixture-adviser", "Adviser student"],
]) {
  db.insert(students).values({ uid, name, program: uid === "fixture-swap-incompat" ? "MCOMP" : "VCOMP" }).run();
}
const adviserStudent = db.select().from(students).where(eq(students.uid, "fixture-adviser")).get()!;
for (const { courseCode, grade, units, term, mark, program, institution } of generateAuthoredProfile("adviser-http").records)
  db.insert(transcript).values({ studentId: adviserStudent.id, courseCode, grade, units, term, mark, program, institution }).run();
const programmingConflict = db.select().from(students).where(eq(students.uid, "fixture-programming-conflict")).get()!;
for (const uid of ["fixture-staff-exception", "fixture-staff-equivalence", "fixture-staff-correction"]) {
  const student = db.select().from(students).where(eq(students.uid, uid)).get()!;
  db.insert(transcript).values({ studentId: student.id, courseCode: "COMP6710", units: 6, grade: "HD", term: "2026 S1" }).run();
}
db.insert(transcript).values({ studentId: programmingConflict.id, courseCode: "COMP6710", units: 6, grade: "HD", term: "2026 S1" }).run();
const programmingCurrent = db.select().from(students).where(eq(students.uid, "fixture-programming-current")).get()!;
db.insert(enrolments).values({ studentId: programmingCurrent.id, courseId: getCourse("COMP6710")!.id, year: 2027, term: "S1", via: "direct" }).run();
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
for (const name of ["Course changes student", "Swap failure student"]) {
  const student = all.students.find(s => s.name === name)!;
  for (const code of ["COMP6442", "COMP6242", "COMP6262", "COMP6300"])
    db.insert(enrolments).values({ studentId: student.id, courseId: getCourse(code)!.id, year: 2027, term: "S1", units: 6, via: "direct" }).run();
}
const dependencyStudent = all.students.find(s => s.name === "Course dependency student")!;
for (const code of ["COMP6442", "COMP6120"])
  db.insert(enrolments).values({ studentId: dependencyStudent.id, courseId: getCourse(code)!.id, year: 2027, term: "S2", units: 6, via: "direct" }).run();
for (const name of ["Overload page student", "Overload review student", "Overload auto student", "Overload race student", "Overload permission student"]) {
  const student = all.students.find(s => s.name === name)!;
  // Explicit test scenarios: confirmed load does not assert prerequisite eligibility.
  const codes = ["COMP6240", "COMP6242", "COMP6262", "COMP6300"];
  for (const code of name === "Overload race student" ? codes.slice(0, 3) : codes)
    db.insert(enrolments).values({ studentId: student.id, courseId: getCourse(code)!.id, year: 2027, term: "S1", units: 6, via: "direct" }).run();
  if (name === "Overload auto student") {
    for (let i = 0; i < 4; i++) db.insert(transcript).values({ studentId: student.id, courseCode: `FIXTURE${i}`, units: 6,
      grade: "CR", mark: 60, term: "2026 S2", program: "VCOMP", institution: "ANU" }).run();
  }
  if (name === "Overload page student") submitOverload({ student, code: "COMP6442", year: 2027, term: "S1", reason: "standard", statement: "Invariant fixture: assess this fictional load." });
}
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
const { passwordChanges } = await import("../src/lib/schema");
const expiredPasswordChange = randomBytes(32).toString("hex");
db.insert(passwordChanges).values({ accountId: first.id, tokenHash: digest(expiredPasswordChange),
  credentialHash: digest(first.passwordHash!), status: "sent", requestedAt: Date.now() - 120_000, expiresAt: Date.now() - 60_000 }).run();
const expiredEmailCheck = randomBytes(32).toString("hex");
db.insert(emailChecks).values({ accountId: first.id, tokenHash: digest(expiredEmailCheck), status: "sent",
  requestedAt: Date.now() - 120_000, sentAt: Date.now() - 120_000, expiresAt: Date.now() - 60_000 }).run();
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
writeFileSync(process.env.SPEC_FIXTURE_FILE, JSON.stringify({ cookies, expiredToken, expiredSession, expiredEmailCheck, expiredPasswordChange }));
