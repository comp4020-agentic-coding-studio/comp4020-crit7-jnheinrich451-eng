// Throwaway HTTP-suite data only; never reachable from the application.
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { accounts, convenors, courses, students } from "../src/lib/schema";
if (process.env.SPEC_FIXTURE !== "1") throw new Error("Test context required");
for (const name of ["Dual-role reviewer", "Reviewer-first reviewer", "Cancelled reviewer", "Failure reviewer"]) {
  const reviewer = db.insert(convenors).values({ name, email: name.replaceAll(" ", "-") + "@example.test" }).returning().get();
  if (name === "Dual-role reviewer")
    db.update(courses).set({ convenorId: reviewer.id }).where(eq(courses.code, "COMP8620")).run();
}
for (const name of ["Overload review student", "Overload page student"]) {
  const student = db.select().from(students).where(eq(students.name, name)).get()!;
  db.update(accounts).set({ kind: "demo" }).where(eq(accounts.studentId, student.id)).run();
}
