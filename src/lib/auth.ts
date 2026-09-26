import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, lt, inArray } from "drizzle-orm";
import type { AstroCookies } from "astro";
import { db } from "./db";
import { accounts, authLimits, convenors, emailTokens, sessions, students, transcript, studyPlans, studyPlanEvents } from "./schema";
import { generateProfile } from "./profile-template";
import { catalogueEntries } from "./catalogue";
import { UserError } from "./errors";
import { hashPassword, validPassword, verifyPassword } from "./passwords";
import { mailConfig, sendVerification } from "./mail";
import type { Actor } from "./store";

export const SESSION_COOKIE = "enrol_session";
const LIFETIME = 8 * 60 * 60 * 1000;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export function normaliseEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9]+(?:[._+'-]?[a-z0-9]+)*@anu\.edu\.au$/.test(email)) {
    throw new UserError("Use an email address ending exactly in @anu.edu.au.");
  }
  return email;
}

export function normaliseDemoEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,47}@enrolment\.test$/.test(email))
    throw new UserError("Choose a demo address ending in @enrolment.test, such as alex@enrolment.test. Use letters, numbers, dots, hyphens or underscores before @.");
  return email;
}

// Persisted throttling survives restarts. Email keys are hashed, not logged.
export function throttle(key: string, maximum = 8): void {
  const now = Date.now();
  db.transaction((tx) => {
    tx.delete(authLimits).where(lt(authLimits.resetsAt, now)).run();
    const row = tx.select().from(authLimits).where(eq(authLimits.key, key)).get();
    if (row && row.count >= maximum)
      throw new UserError("Too many attempts. Please try again in 15 minutes.");
    tx.insert(authLimits)
      .values({ key, count: 1, resetsAt: now + 15 * 60_000 })
      .onConflictDoUpdate({ target: authLimits.key, set: { count: (row?.count ?? 0) + 1 } })
      .run();
  });
}

function ensureMail(): void {
  try {
    mailConfig();
  } catch {
    throw new UserError(
      "Email verification is not configured yet. Please try again when the administrator has connected the email service.",
    );
  }
}

export async function deliverToken(accountId: number, email: string, purpose = "verify"): Promise<void> {
  ensureMail();
  const token = randomBytes(32).toString("hex");
  const tokenHash = digest(token);
  db.delete(emailTokens).where(lt(emailTokens.expiresAt, Date.now())).run();
  db.insert(emailTokens)
    .values({ tokenHash, accountId, purpose, expiresAt: Date.now() + 30 * 60_000 })
    .run();
  try {
    await sendVerification(email, token, purpose === "invite");
  } catch {
    db.delete(emailTokens).where(eq(emailTokens.tokenHash, tokenHash)).run();
    throw new UserError(
      "The verification email could not be sent. Your account is not verified. Please use Resend verification when the email service is available.",
    );
  }
}

export async function register(input: { email: string; password: string; name: string }, kind: "normal" | "demo" = "normal") {
  const email = kind === "demo" ? normaliseDemoEmail(input.email) : normaliseEmail(input.email);
  throttle(`register:${digest(email)}`, 3);
  if (kind === "demo") throttle("demo:create", 30);
  const name = input.name.trim();
  if (!name || name.length > 80) throw new UserError("Enter a name of up to 80 characters.");
  if (!validPassword(input.password))
    throw new UserError("Use a password of 15–128 characters. Do not reuse your ANU password.");
  if (kind === "normal") ensureMail();
  // A duplicate never changes an existing password, name, role or record.
  if (db.select().from(accounts).where(eq(accounts.email, email)).get()) return;
  const passwordHash = await hashPassword(input.password);
  const uid = `demo-${randomUUID()}`;
  const scenario = generateProfile(uid, catalogueEntries());
  const account = db.transaction((tx) => {
    if (tx.select().from(accounts).where(eq(accounts.email, email)).get()) return null;
    const student = tx
      .insert(students)
      .values({
        uid,
        name,
        program: scenario.program,
        recordSource: "Fictional Computing (Advanced) scenario — not an ANU academic record",
      })
      .returning()
      .get();
    for (const { courseCode, grade, term, units, mark, program, institution } of scenario.records) {
      tx.insert(transcript)
        .values({
          studentId: student.id,
          courseCode,
          grade,
          term,
          units, mark, program, institution,
        })
        .run();
    }
    tx.insert(studyPlans).values({ studentId: student.id, ruleYear: scenario.ruleYear, specialisation: scenario.specialisation,
      planningYear: scenario.planningYear, planningTerm: scenario.planningTerm, templateId: scenario.id, templateSnapshot: JSON.stringify(scenario) }).run();
    tx.insert(studyPlanEvents).values({ studentId: student.id, detail: `Created fictional template ${scenario.id}: completed through ${scenario.completedThrough}; planning ${scenario.planningYear} ${scenario.planningTerm}.` }).run();
    return tx.insert(accounts).values({ email, kind, passwordHash, studentId: student.id }).returning().get();
  });
  if (account && kind === "normal") await deliverToken(account.id, email);
  return account;
}

export async function resend(rawEmail: string): Promise<void> {
  const email = normaliseEmail(rawEmail);
  throttle(`resend:${digest(email)}`, 3);
  ensureMail();
  const account = db.select().from(accounts).where(eq(accounts.email, email)).get();
  if (account && !account.verifiedAt)
    await deliverToken(account.id, email, account.convenorId ? "invite" : "verify");
}

export function verificationInfo(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return undefined;
  return db
    .select()
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, digest(token)), gt(emailTokens.expiresAt, Date.now()), inArray(emailTokens.purpose, ["verify", "invite", "demo-verify"])))
    .get();
}

export async function verifyEmail(token: string, password: string): Promise<void> {
  const info = verificationInfo(token);
  if (!info) throw new UserError("This verification link is invalid or expired. Request another email.");
  if (info.purpose === "invite" && !validPassword(password))
    throw new UserError("Use a password of 15–128 characters.");
  const passwordHash = info.purpose === "invite" ? await hashPassword(password) : undefined;
  db.transaction((tx) => {
    const used = tx
      .delete(emailTokens)
      .where(and(eq(emailTokens.tokenHash, digest(token)), gt(emailTokens.expiresAt, Date.now())))
      .returning()
      .get();
    if (!used) throw new UserError("This verification link has already been used or expired.");
    tx.update(accounts)
      .set({ verifiedAt: Date.now(), ...(passwordHash ? { passwordHash } : {}) })
      .where(eq(accounts.id, used.accountId))
      .run();
    tx.delete(emailTokens).where(eq(emailTokens.accountId, used.accountId)).run();
    tx.delete(sessions).where(eq(sessions.accountId, used.accountId)).run();
  });
}

export function createSession(accountId: number): string {
  const token = randomBytes(32).toString("hex");
  db.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();
  db.insert(sessions)
    .values({ tokenHash: digest(token), accountId, expiresAt: Date.now() + LIFETIME })
    .run();
  return token;
}

export async function authenticateAccount(rawEmail: string, password: string, kind: "normal" | "demo" = "normal") {
  const email = kind === "demo" ? normaliseDemoEmail(rawEmail) : normaliseEmail(rawEmail);
  throttle(`login:${digest(email)}`);
  if (password.length > 128) throw new UserError("Email or password is incorrect.");
  const account = db.select().from(accounts).where(eq(accounts.email, email)).get();
  const correct = await verifyPassword(password, account?.passwordHash ?? null);
  if (!correct || !account || account.kind !== kind) throw new UserError("Email or password is incorrect.");
  return account;
}

export async function login(rawEmail: string, password: string): Promise<string> {
  const account = await authenticateAccount(rawEmail, password);
  if (!account.verifiedAt)
    throw new UserError(
      "Verify your email address before signing in. You can request another verification email below.",
    );
  return createSession(account.id);
}

export function actorFrom(token?: string): Actor | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, Date.now())))
    .get();
  if (!row?.account.verifiedAt) return null;
  const { account } = row;
  if (account.studentId && !account.convenorId) {
    const student = db.select().from(students).where(eq(students.id, account.studentId)).get();
    if (student) return { kind: "student", student };
  }
  if (account.convenorId && !account.studentId) {
    const convenor = db.select().from(convenors).where(eq(convenors.id, account.convenorId)).get();
    if (convenor) return { kind: "convenor", convenor };
  }
  return null;
}

export function setSession(cookies: AstroCookies, token: string, url: URL): void {
  const old = cookies.get(SESSION_COOKIE)?.value;
  if (old)
    db.delete(sessions)
      .where(eq(sessions.tokenHash, digest(old)))
      .run();
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: LIFETIME / 1000,
  });
}

export function logout(cookies: AstroCookies): void {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token)
    db.delete(sessions)
      .where(eq(sessions.tokenHash, digest(token)))
      .run();
  cookies.delete(SESSION_COOKIE, { path: "/" });
  cookies.delete("as", { path: "/" });
}

export async function inviteStaff(rawEmail: string, convenorId: number): Promise<void> {
  const email = normaliseEmail(rawEmail);
  ensureMail();
  if (!db.select().from(convenors).where(eq(convenors.id, convenorId)).get())
    throw new UserError("Unknown convenor id.");
  if (db.select().from(accounts).where(eq(accounts.email, email)).get())
    throw new UserError("That email already has an account; no role was changed.");
  if (db.select().from(accounts).where(eq(accounts.convenorId, convenorId)).get())
    throw new UserError("That convenor already has an account.");
  const account = db.insert(accounts).values({ email, convenorId }).returning().get();
  await deliverToken(account.id, email, "invite");
}
