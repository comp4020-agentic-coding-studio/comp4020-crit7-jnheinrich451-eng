import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { accounts, convenors, courses } from "../src/lib/schema";
import { eq } from "drizzle-orm";

const [email, id] = process.argv.slice(2);
if (email === "--list" || !email || !id) {
  const client = new Database(process.env.DATABASE_PATH ?? "./.data/app.db", { readonly: true });
  const db = drizzle(client);
  console.log("Usage: node dist/admin/invite-staff.mjs person@anu.edu.au <convenor-id>\nList assignments: node dist/admin/invite-staff.mjs --list");
  const slots = db.select().from(convenors).all().map(c => ({ id: c.id, name: c.name, purpose: c.purpose,
    available: !db.select({ id: accounts.id }).from(accounts).where(eq(accounts.convenorId, c.id)).get(),
    courses: db.select({ code: courses.code }).from(courses).where(eq(courses.convenorId, c.id)).all().map(c => c.code).join(", "),
  }));
  console.table(slots);
  client.close();
  if (email !== "--list") process.exitCode = 1;
} else {
  try {
    const { inviteStaff } = await import("../src/lib/auth");
    await inviteStaff(email, Number(id));
    console.log("Reviewer invitation accepted by the email service.");
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Invitation failed");
    process.exitCode = 1;
  }
}
