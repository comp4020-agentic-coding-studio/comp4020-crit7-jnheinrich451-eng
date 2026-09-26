import type { APIRoute } from "astro";
import { actorFrom, login, logout, register, resend, setSession, verifyEmail } from "../../../lib/auth";
import { back } from "../../../lib/http";
import { UserError } from "../../../lib/errors";
import { confirmEmailCheck, requestEmailCheck } from "../../../lib/email-checks";

export const POST: APIRoute = async ({ request, cookies, params, url, locals }) => {
  const action = params.action;
  if (!["register", "login", "logout", "resend", "verify", "email-test", "email-test-confirm"].includes(action ?? ""))
    return new Response("Not found", { status: 404 });
  const form = await request.formData();
  const field = (key: string) => String(form.get(key) ?? "");
  try {
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
      await register({ name: field("name"), email: field("email"), password: field("password") });
      return back("/login/", {
        ok: "If this address is new, we have sent a verification email. Check your inbox before signing in. If you already registered, sign in or resend verification.",
      });
    }
    if (action === "resend") {
      await resend(field("email"));
      return back("/login/", {
        ok: "If an unverified account exists for that address, a verification email has been sent.",
      });
    }
    if (action === "verify") {
      if (locals.actor) return back(`/verify/?token=${encodeURIComponent(field("token"))}`, {
        error: "Sign out of your current account before activating this account. Your verification link has not been used.",
      });
      await verifyEmail(field("token"), field("password"));
      return back("/login/", { ok: "Email verified. You can now sign in." });
    }
    if (action === "logout") {
      logout(cookies);
      // Preserve only a verification token, never a browser-supplied return URL.
      const verificationToken = field("verificationToken");
      if (/^[a-f0-9]{64}$/.test(verificationToken)) return back(`/verify/?token=${verificationToken}`);
      return back("/login/", { ok: "You have signed out." });
    }
    const token = await login(field("email"), field("password"));
    setSession(cookies, token, url);
    const actor = actorFrom(token);
    return back(actor?.kind === "convenor" ? actor.convenor.purpose === "overload" ? "/overload/" : "/applications/" : "/");
  } catch (err) {
    if (!(err instanceof UserError)) throw err;
    const page =
      action === "email-test" ? "/account/" : action === "email-test-confirm" ? "/email-test/" : action === "register"
        ? "/register/"
        : action === "verify"
          ? `/verify/?token=${encodeURIComponent(field("token"))}`
          : "/login/";
    return back(page, { error: err.message });
  }
};
