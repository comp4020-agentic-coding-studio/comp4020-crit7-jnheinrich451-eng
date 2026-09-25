import type { APIRoute } from "astro";
import { login, logout, register, resend, setSession, verifyEmail } from "../../../lib/auth";
import { back } from "../../../lib/http";
import { UserError } from "../../../lib/errors";

export const POST: APIRoute = async ({ request, cookies, params, url }) => {
  const action = params.action;
  if (!["register", "login", "logout", "resend", "verify"].includes(action ?? ""))
    return new Response("Not found", { status: 404 });
  const form = await request.formData();
  const field = (key: string) => String(form.get(key) ?? "");
  try {
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
      await verifyEmail(field("token"), field("password"));
      return back("/login/", { ok: "Email verified. You can now sign in." });
    }
    if (action === "logout") {
      logout(cookies);
      return back("/login/", { ok: "You have signed out." });
    }
    const token = await login(field("email"), field("password"));
    setSession(cookies, token, url);
    return back("/");
  } catch (err) {
    if (!(err instanceof UserError)) throw err;
    const page =
      action === "register"
        ? "/register/"
        : action === "verify"
          ? `/verify/?token=${encodeURIComponent(field("token"))}`
          : "/login/";
    return back(page, { error: err.message });
  }
};
