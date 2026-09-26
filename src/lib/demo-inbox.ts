import { createHmac, randomBytes } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import type { AstroCookies } from "astro";
import { db } from "./db";
import { accounts, demoInboxes, demoMessages, emailTokens } from "./schema";
import { digest, throttle } from "./auth";
import { UserError } from "./errors";

export const INBOX_COOKIE = "enrol_demo_inbox";
const lifetime = 8 * 60 * 60_000;
const linkToken = (secret: string, nonce: string) => createHmac("sha256", secret).update(`demo-mail:${nonce}`).digest("hex");

export function inboxFor(secret?: string) {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) return undefined;
  return db.select({ inbox: demoInboxes, email: accounts.email, accountId: accounts.id, verifiedAt: accounts.verifiedAt })
    .from(demoInboxes).innerJoin(accounts, eq(accounts.id, demoInboxes.accountId))
    .where(and(eq(demoInboxes.tokenHash, digest(secret)), gt(demoInboxes.expiresAt, Date.now()), eq(accounts.kind, "demo"))).get();
}

// Call only after account creation, password authentication, or a verified session.
export function openDemoInbox(accountId: number, cookies: AstroCookies, url: URL) {
  const existing = cookies.get(INBOX_COOKIE)?.value;
  if (inboxFor(existing)?.accountId === accountId) return existing!;
  const account = db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.kind, "demo"))).get();
  if (!account || account.convenorId) throw new UserError("This account cannot use a demo inbox.");
  const secret = randomBytes(32).toString("hex");
  db.insert(demoInboxes).values({ tokenHash: digest(secret), accountId, expiresAt: Date.now() + lifetime }).run();
  cookies.set(INBOX_COOKIE, secret, { path: "/", httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", maxAge: lifetime / 1000 });
  return secret;
}

export function closeDemoInbox(cookies: AstroCookies) {
  const secret = cookies.get(INBOX_COOKIE)?.value;
  if (!secret) return;
  db.update(demoInboxes).set({ expiresAt: Date.now() }).where(eq(demoInboxes.tokenHash, digest(secret))).run();
  cookies.delete(INBOX_COOKIE, { path: "/" });
}

export function captureDemoMessage(secret: string, purpose: "demo-verify" | "password-change") {
  const inbox = inboxFor(secret);
  if (!inbox) throw new UserError("Sign in with your demo address and password to reopen your private inbox.");
  const nonce = randomBytes(32).toString("hex"), now = Date.now();
  const token = linkToken(secret, nonce);
  const message = db.insert(demoMessages).values({ inboxHash: digest(secret), nonce, purpose,
    createdAt: now, expiresAt: now + 30 * 60_000 }).returning().get();
  return { token, message, accountId: inbox.accountId };
}

export function sendDemoVerification(secret: string) {
  const inbox = inboxFor(secret);
  if (!inbox || inbox.verifiedAt) throw new UserError("Sign in with your demo address and password. This inbox does not need activation.");
  throttle(`demo-verify:${inbox.accountId}`, 3);
  db.transaction((tx) => {
    const { token, message } = captureDemoMessage(secret, "demo-verify");
    tx.insert(emailTokens).values({ tokenHash: digest(token), accountId: inbox.accountId,
      purpose: "demo-verify", expiresAt: message.expiresAt }).run();
  });
}

export function inboxMessages(secret: string) {
  const inbox = inboxFor(secret);
  if (!inbox) return [];
  return db.select().from(demoMessages).where(eq(demoMessages.inboxHash, digest(secret)))
    .orderBy(desc(demoMessages.id)).all().map(message => ({ ...message,
      href: `${message.purpose === "demo-verify" ? "/verify/" : "/change-password/"}?token=${linkToken(secret, message.nonce)}`,
    }));
}
