import type { APIRoute } from "astro";
import { actorFrom, addStudentView, authenticateAccount, createSession, login, logout, register, resend, setSession, verificationInfo, verifyEmail } from "../../../lib/auth";
import { back } from "../../../lib/http";
import { UserError } from "../../../lib/errors";
import { accountFor, confirmEmailCheck, requestEmailCheck } from "../../../lib/email-checks";
import { closeDemoInbox, INBOX_COOKIE, inboxFor, openDemoInbox, sendDemoVerification } from "../../../lib/demo-inbox";
import { completePasswordChange, requestPasswordChange, requestPasswordReset } from "../../../lib/password-changes";

export const POST: APIRoute = async ({ request, cookies, params, url, locals }) => {
  const action = params.action;
  if (!["register", "login", "logout", "resend", "verify", "email-test", "email-test-confirm", "password-change", "password-change-confirm", "password-reset", "demo-resend", "demo-inbox-open", "switch-role"].includes(action ?? ""))
    return new Response("Not found", { status: 404 });
  const form = await request.formData();
  const field = (key: string) => String(form.get(key) ?? "");
  const mode = field("mode") || "normal";
  if (mode !== "normal" && mode !== "demo") return new Response("Unknown account mode", { status: 400 });
  const modeQuery = mode === "demo" ? "?mode=demo" : "";
  try {
    if (action === "switch-role") {
      if (!locals.actor) return new Response("Sign in required", { status: 401 });
      const account = accountFor(locals.actor), role = field("role");
      if (!account || account.kind !== "normal" || !account.convenorId || !["student", "reviewer"].includes(role))
        return new Response("Invited reviewer access required", { status: 403 });
      if (role === "student" && !account.studentId) addStudentView(account.id);
      const token = createSession(account.id, role as "student" | "reviewer");
      setSession(cookies, token, url);
      const actor = actorFrom(token)!;
      return back(actor.kind === "student" ? "/record/" : actor.convenor.purpose === "overload" ? "/overload/" : "/applications/");
    }
    if (action === "password-reset") {
      const account = locals.actor ? accountFor(locals.actor) : undefined;
      const secret = mode === "demo" && account?.kind === "demo"
        ? openDemoInbox(account.id, cookies, url) : cookies.get(INBOX_COOKIE)?.value;
      requestPasswordReset(field("email"), mode, secret);
      return back(`/forgot-password/${modeQuery}`, { ok: mode === "demo"
        ? "If this demo account is confirmed and within the request limit, a password link is ready in its private inbox."
        : "If a verified account exists for this address and is within the request limit, we will email a password reset link. Check your inbox and junk folder; delivery may take time. If nothing arrives, wait 15 minutes before trying again." });
    }
    if (action === "password-change") {
      if (!locals.actor) return new Response("Sign in required", { status: 401 });
      const account = accountFor(locals.actor);
      const secret = account?.kind === "demo" ? openDemoInbox(account.id, cookies, url) : undefined;
      await requestPasswordChange(locals.actor, field("currentPassword"), secret);
      return back(account?.kind === "demo" ? "/demo-inbox/" : "/account/", { ok: account?.kind === "demo"
        ? "A password-change message is ready in your private demo inbox."
        : "The email service accepted your password-change message. Follow its link to choose a new password. Delivery to your Inbox may take time." });
    }
    if (action === "password-change-confirm") {
      const kind = await completePasswordChange(field("token"), field("password"), field("confirmation"));
      // End this browser's session too, including when another account was open.
      logout(cookies);
      closeDemoInbox(cookies);
      return back(`/login/${kind === "demo" ? "?mode=demo" : ""}`, { ok: "Password changed. Sign in with your new password. Your profile, requests and enrolments are preserved." });
    }
    if (action === "demo-inbox-open") {
      if (!locals.actor) return new Response("Sign in required", { status: 401 });
      const account = accountFor(locals.actor);
      if (!account || account.kind !== "demo") return new Response("Demo account required", { status: 403 });
      openDemoInbox(account.id, cookies, url);
      return back("/demo-inbox/");
    }
    if (action === "demo-resend") {
      sendDemoVerification(cookies.get(INBOX_COOKIE)?.value ?? "");
      return back("/demo-inbox/", { ok: "A fresh confirmation link is ready below." });
    }
    if (action === "email-test") {
      if (!locals.actor) return new Response("Sign in required", { status: 401 });
      await requestEmailCheck(locals.actor);
      return back("/account/", { ok: "The email service accepted your test message. Open it in your inbox and confirm receipt." });
    }
    if (action === "email-test-confirm") {
      confirmEmailCheck(field("token"));
      return back("/email-test/", { ok: "Test email receipt confirmed. Your account and saved data are unchanged." });
    }
    if (action === "register") {
      if (locals.actor) return back("/account/", { error: "Sign out before creating another account." });
      const account = await register({ name: field("name"), email: field("email"), password: field("password") }, mode);
      if (mode === "demo") {
        if (!account) return back("/login/?mode=demo", { ok: "If you already chose this address, sign in with its password to reopen your private inbox. Otherwise choose a different demo address." });
        const secret = openDemoInbox(account.id, cookies, url);
        sendDemoVerification(secret);
        return back("/demo-inbox/", { ok: "Your private demo inbox is ready. Open the confirmation link below." });
      }
      return back("/login/", {
        ok: "If this address is new, we have sent a verification email. Check your inbox before signing in. If you already registered, sign in or resend verification.",
      });
    }
    if (action === "resend") {
      if (mode === "demo") return back("/login/?mode=demo", { error: "Sign in with your demo password to reopen your private inbox and request a fresh link." });
      await resend(field("email"));
      return back("/login/", {
        ok: "If an account needs activation or has a pending reviewer invitation, a verification email has been sent.",
      });
    }
    if (action === "verify") {
      if (locals.actor) return back(`/verify/?token=${encodeURIComponent(field("token"))}`, {
        error: "Sign out of your current account before activating this account. Your verification link has not been used.",
      });
      const info = verificationInfo(field("token"));
      const ownDemoInbox = info?.purpose === "demo-verify" && inboxFor(cookies.get(INBOX_COOKIE)?.value)?.accountId === info.accountId;
      await verifyEmail(field("token"), field("password"));
      if (info?.purpose === "demo-verify") {
        if (ownDemoInbox) {
          setSession(cookies, createSession(info.accountId), url);
          return back("/record/", { ok: "Your demo account is ready. Explore your fictional academic profile and saved suggestions." });
        }
        return back("/login/?mode=demo", { ok: "Demo account confirmed. Sign in with your chosen demo address and password." });
      }
      return back("/login/", { ok: info?.purpose === "reviewer-invite"
        ? "Email verified. Reviewer access is active. Sign in with your existing password, or the one you just created. Use Switch to reviewer view if your student view opens."
        : "Email verified. You can now sign in." });
    }
    if (action === "logout") {
      const wasDemo = locals.actor && accountFor(locals.actor)?.kind === "demo";
      logout(cookies);
      closeDemoInbox(cookies);
      // Preserve only a verification token, never a browser-supplied return URL.
      const verificationToken = field("verificationToken");
      if (/^[a-f0-9]{64}$/.test(verificationToken)) return back(`/verify/?token=${verificationToken}`);
      return back(`/login/${wasDemo ? "?mode=demo" : ""}`, { ok: "You have signed out." });
    }
    if (mode === "demo") {
      if (locals.actor) return back("/account/", { error: "Sign out before using another account." });
      const account = await authenticateAccount(field("email"), field("password"), "demo");
      const secret = openDemoInbox(account.id, cookies, url);
      if (!account.verifiedAt) {
        sendDemoVerification(secret);
        return back("/demo-inbox/");
      }
      setSession(cookies, createSession(account.id), url);
      return back("/record/");
    }
    const token = await login(field("email"), field("password"));
    setSession(cookies, token, url);
    closeDemoInbox(cookies);
    const actor = actorFrom(token);
    return back(actor?.kind === "convenor" ? actor.convenor.purpose === "overload" ? "/overload/" : "/applications/" : "/");
  } catch (err) {
    if (!(err instanceof UserError)) throw err;
    const page =
      action === "switch-role" ? "/reviewer-access/"
        : action === "password-reset" ? `/forgot-password/${modeQuery}`
        : action === "password-change" || action === "email-test" ? "/account/"
        : action === "password-change-confirm" ? `/change-password/?token=${encodeURIComponent(field("token"))}`
        : action === "demo-resend" || action === "demo-inbox-open" ? "/demo-inbox/"
        : action === "email-test-confirm" ? "/email-test/" : action === "register"
        ? `/register/${modeQuery}`
        : action === "verify"
          ? `/verify/?token=${encodeURIComponent(field("token"))}`
          : `/login/${modeQuery}`;
    return back(page, { error: err.message });
  }
};
