import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { accounts, convenors, courses, emailTokens, reviewerInvitations, sessions } from "./schema";
import { digest, normaliseEmail, throttle } from "./auth";
import { mailConfig, sendVerification } from "./mail";
import { hashPassword, validPassword } from "./passwords";
import { UserError } from "./errors";

export function managesReviewers(account: { email: string; kind: string; verifiedAt: number | null } | undefined) {
  const owner = process.env.REVIEWER_ADMIN_EMAIL?.trim().toLowerCase();
  return !!owner && account?.kind === "normal" && !!account.verifiedAt && account.email === owner;
}

export function reviewerSlots() {
  return db.select().from(convenors).all().map(convenor => ({
    ...convenor,
    assigned: !!db.select({ id: accounts.id }).from(accounts).where(eq(accounts.convenorId, convenor.id)).get(),
    pending: !!db.select({ id: reviewerInvitations.id }).from(reviewerInvitations)
      .where(and(eq(reviewerInvitations.convenorId, convenor.id), eq(reviewerInvitations.status, "pending"))).get(),
    courses: db.select({ code: courses.code }).from(courses).where(eq(courses.convenorId, convenor.id)).all().map(row => row.code),
  }));
}

export function pendingInvitation(accountId: number) {
  return db.select().from(reviewerInvitations)
    .where(and(eq(reviewerInvitations.accountId, accountId), eq(reviewerInvitations.status, "pending"))).get();
}

export function invitationList() {
  return db.select({ invitation: reviewerInvitations, email: accounts.email, reviewer: convenors.name })
    .from(reviewerInvitations).innerJoin(accounts, eq(accounts.id, reviewerInvitations.accountId))
    .innerJoin(convenors, eq(convenors.id, reviewerInvitations.convenorId)).all();
}

export async function deliverInvitation(invitation: typeof reviewerInvitations.$inferSelect) {
  const account = db.select().from(accounts).where(eq(accounts.id, invitation.accountId)).get()!;
  const token = randomBytes(32).toString("hex");
  db.insert(emailTokens).values({ tokenHash: digest(token), accountId: account.id, purpose: "reviewer-invite",
    invitationId: invitation.id, expiresAt: Date.now() + 30 * 60_000 }).run();
  try { await sendVerification(account.email, token, true); }
  catch {
    db.delete(emailTokens).where(eq(emailTokens.tokenHash, digest(token))).run();
    throw new UserError("The invitation email could not be sent. No reviewer access was activated. Use Resend verification or invitation on the sign-in page to try again.");
  }
}

export async function inviteReviewer(rawEmail: string, convenorId: number, invitedBy?: number) {
  const email = normaliseEmail(rawEmail);
  throttle(`reviewer-invite:${digest(email)}`, 3);
  try { mailConfig(); } catch { throw new UserError("Email delivery is not configured."); }
  if (!Number.isSafeInteger(convenorId) || !db.select().from(convenors).where(eq(convenors.id, convenorId)).get())
    throw new UserError("Choose a valid reviewer assignment.");
  const invitation = db.transaction(tx => {
    let account = tx.select().from(accounts).where(eq(accounts.email, email)).get();
    if (account?.kind === "demo") throw new UserError("Real reviewer invitations require a normal ANU email account.");
    if (account?.convenorId) throw new UserError("This account already has a reviewer assignment.");
    if (tx.select().from(accounts).where(eq(accounts.convenorId, convenorId)).get())
      throw new UserError("That reviewer assignment is already occupied.");
    const reserved = tx.select().from(reviewerInvitations).where(and(eq(reviewerInvitations.convenorId, convenorId),
      eq(reviewerInvitations.status, "pending"))).get();
    if (reserved && reserved.accountId !== account?.id) throw new UserError("That assignment already has a pending invitation.");
    if (!account) account = tx.insert(accounts).values({ email }).returning().get();
    const pending = pendingInvitation(account.id);
    if (pending && pending.convenorId !== convenorId) throw new UserError("Cancel this account's pending invitation before choosing another assignment.");
    return pending ?? tx.insert(reviewerInvitations).values({ accountId: account.id, convenorId, invitedBy }).returning().get();
  });
  await deliverInvitation(invitation);
}

export function cancelInvitation(id: number) {
  db.transaction(tx => {
    const changed = tx.update(reviewerInvitations).set({ status: "cancelled", cancelledAt: Date.now() })
      .where(and(eq(reviewerInvitations.id, id), eq(reviewerInvitations.status, "pending"))).returning().get();
    if (!changed) throw new UserError("This invitation is no longer pending.");
    tx.delete(emailTokens).where(eq(emailTokens.invitationId, id)).run();
  });
}

export function reviewerTokenInfo(token: typeof emailTokens.$inferSelect) {
  if (!token.invitationId) return undefined;
  const invitation = pendingInvitation(token.accountId);
  const account = db.select().from(accounts).where(eq(accounts.id, token.accountId)).get();
  if (!invitation || invitation.id !== token.invitationId || account?.kind !== "normal") return undefined;
  return { ...token, needsPassword: !account.verifiedAt || !account.passwordHash };
}

export async function acceptReviewerInvitation(token: string, password: string) {
  const lookup = () => {
    const row = db.select().from(emailTokens).where(and(eq(emailTokens.tokenHash, digest(token)),
      eq(emailTokens.purpose, "reviewer-invite"), gt(emailTokens.expiresAt, Date.now()))).get();
    return row && reviewerTokenInfo(row);
  };
  const info = lookup();
  if (!info) throw new UserError("This invitation is invalid, expired, cancelled, or already used.");
  if (info.needsPassword && !validPassword(password)) throw new UserError("Use a password of 15–128 characters.");
  const passwordHash = info.needsPassword ? await hashPassword(password) : undefined;
  db.transaction(tx => {
    const fresh = lookup();
    if (!fresh || fresh.needsPassword !== info.needsPassword) throw new UserError("This invitation is no longer active.");
    const invitation = pendingInvitation(info.accountId)!;
    const account = tx.select().from(accounts).where(eq(accounts.id, info.accountId)).get()!;
    if (account.convenorId || tx.select().from(accounts).where(eq(accounts.convenorId, invitation.convenorId)).get())
      throw new UserError("This reviewer assignment is no longer available.");
    tx.update(accounts).set({ convenorId: invitation.convenorId, verifiedAt: account.verifiedAt ?? Date.now(),
      ...(passwordHash ? { passwordHash } : {}) }).where(eq(accounts.id, account.id)).run();
    tx.update(reviewerInvitations).set({ status: "accepted", acceptedAt: Date.now() }).where(eq(reviewerInvitations.id, invitation.id)).run();
    tx.delete(emailTokens).where(eq(emailTokens.accountId, account.id)).run();
    tx.delete(sessions).where(eq(sessions.accountId, account.id)).run();
  });
}
