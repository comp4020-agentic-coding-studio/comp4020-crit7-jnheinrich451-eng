import { randomBytes } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { accounts, emailChecks } from "./schema";
import { digest, throttle } from "./auth";
import { sendVerificationTest } from "./mail";
import { UserError } from "./errors";
import type { Actor } from "./store";

export function accountFor(actor: Actor) {
  return db.select({ id: accounts.id, email: accounts.email, verifiedAt: accounts.verifiedAt }).from(accounts)
    .where(actor.kind === "student" ? eq(accounts.studentId, actor.student.id) : eq(accounts.convenorId, actor.convenor.id)).get();
}

export function lastEmailCheck(accountId: number) {
  return db.select().from(emailChecks).where(eq(emailChecks.accountId, accountId)).orderBy(desc(emailChecks.id)).get();
}

export async function requestEmailCheck(actor: Actor) {
  const account = accountFor(actor);
  if (!account?.verifiedAt) throw new UserError("Sign in to a verified account first.");
  throttle(`email-check:${account.id}`, 3);
  const token = randomBytes(32).toString("hex"), now = Date.now();
  const row = db.insert(emailChecks).values({ accountId: account.id, tokenHash: digest(token),
    requestedAt: now, expiresAt: now + 30 * 60_000 }).returning().get();
  try {
    await sendVerificationTest(account.email, token);
    db.update(emailChecks).set({ status: "sent", sentAt: Date.now() }).where(eq(emailChecks.id, row.id)).run();
  } catch {
    db.update(emailChecks).set({ status: "failed" }).where(eq(emailChecks.id, row.id)).run();
    throw new UserError("The test email could not be sent. Your verified account and saved data are unchanged. Try again when email delivery is available.");
  }
}

export function emailCheckInfo(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return undefined;
  return db.select({ id: emailChecks.id }).from(emailChecks).where(and(eq(emailChecks.tokenHash, digest(token)),
    eq(emailChecks.status, "sent"), gt(emailChecks.expiresAt, Date.now()))).get();
}

export function confirmEmailCheck(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new UserError("This test link is invalid, expired, or already used.");
  const row = db.update(emailChecks).set({ status: "confirmed", confirmedAt: Date.now() }).where(and(
    eq(emailChecks.tokenHash, digest(token)), eq(emailChecks.status, "sent"), gt(emailChecks.expiresAt, Date.now()),
  )).returning({ id: emailChecks.id }).get();
  if (!row) throw new UserError("This test link is invalid, expired, or already used.");
}
