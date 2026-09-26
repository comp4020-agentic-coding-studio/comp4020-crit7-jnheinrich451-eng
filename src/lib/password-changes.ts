import { randomBytes } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { accounts, demoInboxes, emailTokens, passwordChanges, sessions } from "./schema";
import { digest, normaliseDemoEmail, normaliseEmail, throttle } from "./auth";
import { accountFor } from "./email-checks";
import { captureDemoMessage, inboxFor } from "./demo-inbox";
import { sendPasswordChange } from "./mail";
import { hashPassword, validPassword, verifyPassword } from "./passwords";
import { UserError } from "./errors";
import type { Actor } from "./store";

export function lastPasswordChange(accountId: number) {
  return db.select().from(passwordChanges).where(eq(passwordChanges.accountId, accountId))
    .orderBy(desc(passwordChanges.requestedAt)).get();
}

export async function requestPasswordChange(actor: Actor, currentPassword: string, inboxSecret?: string) {
  const identity = accountFor(actor);
  if (!identity?.verifiedAt) throw new UserError("Sign in to your account first.");
  throttle(`password-change:${identity.id}`, 3);
  const account = db.select().from(accounts).where(eq(accounts.id, identity.id)).get()!;
  if (currentPassword.length > 128 || !await verifyPassword(currentPassword, account.passwordHash))
    throw new UserError("Your current prototype password is incorrect.");
  if (account.kind === "demo" && inboxFor(inboxSecret)?.accountId !== account.id)
    throw new UserError("Reopen your private demo inbox before requesting a password change.");
  await issuePasswordLink(account, inboxSecret);
}

export function requestPasswordReset(rawEmail: string, kind: "normal" | "demo", inboxSecret?: string) {
  const email = kind === "demo" ? normaliseDemoEmail(rawEmail) : normaliseEmail(rawEmail);
  // Public recovery must not reveal whether an address exists, is verified,
  // was throttled, or encountered a mail-provider error.
  try {
    throttle(`password-reset:${digest(email)}`, 3);
    throttle("password-reset:global", 20);
  } catch (error) {
    if (error instanceof UserError) return;
    throw error;
  }
  if (kind === "demo" && inboxFor(inboxSecret)?.email !== email)
    throw new UserError("No matching private demo inbox is open. Use the browser where you still have access, or create a new demo account with a different address.");
  const account = db.select().from(accounts).where(and(eq(accounts.email, email), eq(accounts.kind, kind))).get();
  if (!account?.verifiedAt || !account.passwordHash) return;
  // Delivery runs outside the public response so SMTP latency cannot reveal
  // account existence. Its pending/sent/failed outcome is persisted below.
  void issuePasswordLink(account, inboxSecret, true).catch(() => {
    console.warn("Password recovery delivery failed; request status retained.");
  });
}

async function issuePasswordLink(account: typeof accounts.$inferSelect, inboxSecret?: string, recovery = false) {
  const now = Date.now();
  const token = db.transaction((tx) => {
    const value = account.kind === "demo" ? captureDemoMessage(inboxSecret!, "password-change").token : randomBytes(32).toString("hex");
    tx.insert(passwordChanges).values({ tokenHash: digest(value), accountId: account.id,
      credentialHash: digest(account.passwordHash!), requestedAt: now, expiresAt: now + 30 * 60_000,
      status: account.kind === "demo" ? "sent" : "pending" }).run();
    return value;
  });
  if (account.kind === "normal") {
    try {
      await sendPasswordChange(account.email, token, recovery);
      db.update(passwordChanges).set({ status: "sent" }).where(eq(passwordChanges.tokenHash, digest(token))).run();
    } catch {
      db.update(passwordChanges).set({ status: "failed" }).where(eq(passwordChanges.tokenHash, digest(token))).run();
      throw new UserError("The email could not be sent. Your current password and saved data are unchanged. Please try again later.");
    }
  }
}

export function passwordChangeInfo(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return undefined;
  const row = db.select({ change: passwordChanges, kind: accounts.kind, passwordHash: accounts.passwordHash }).from(passwordChanges)
    .innerJoin(accounts, eq(accounts.id, passwordChanges.accountId)).where(and(
      eq(passwordChanges.tokenHash, digest(token)), eq(passwordChanges.status, "sent"),
      gt(passwordChanges.expiresAt, Date.now()),
    )).get();
  return row?.passwordHash && row.change.credentialHash === digest(row.passwordHash) ? row : undefined;
}

export async function completePasswordChange(token: string, password: string, confirmation: string) {
  const info = passwordChangeInfo(token);
  if (!info) throw new UserError("This password link is invalid, expired, or already used.");
  if (!validPassword(password)) throw new UserError("Use a password of 15–128 characters.");
  if (password !== confirmation) throw new UserError("The new passwords do not match.");
  if (await verifyPassword(password, info.passwordHash)) throw new UserError("Choose a password different from your current one.");
  const passwordHash = await hashPassword(password);
  db.transaction((tx) => {
    // Recheck after hashing: concurrent use or another successful change wins once.
    if (!passwordChangeInfo(token)) throw new UserError("This password link has already been used or expired.");
    tx.update(accounts).set({ passwordHash }).where(eq(accounts.id, info.change.accountId)).run();
    tx.update(passwordChanges).set({ status: "superseded" }).where(and(eq(passwordChanges.accountId, info.change.accountId),
      eq(passwordChanges.status, "sent"))).run();
    tx.update(passwordChanges).set({ status: "completed", completedAt: Date.now() }).where(eq(passwordChanges.tokenHash, digest(token))).run();
    tx.delete(sessions).where(eq(sessions.accountId, info.change.accountId)).run();
    tx.delete(emailTokens).where(eq(emailTokens.accountId, info.change.accountId)).run();
    tx.update(demoInboxes).set({ expiresAt: Date.now() }).where(eq(demoInboxes.accountId, info.change.accountId)).run();
  });
  return info.kind;
}
