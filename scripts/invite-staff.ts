import { inviteStaff } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { convenors } from "../src/lib/schema";

const [email, id] = process.argv.slice(2);
if (!email || !id) {
  console.log("Usage: pnpm exec tsx --env-file=.env scripts/invite-staff.ts person@anu.edu.au <convenor-id>");
  console.table(db.select({ id: convenors.id, name: convenors.name, purpose: convenors.purpose }).from(convenors).all());
  process.exitCode = 1;
} else {
  try {
    await inviteStaff(email, Number(id));
    console.log("Reviewer invitation accepted by the email service.");
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Invitation failed");
    process.exitCode = 1;
  }
}
