import { defineMiddleware } from "astro:middleware";
import { actorFrom, SESSION_COOKIE, throttle } from "./lib/auth";
import { UserError } from "./lib/errors";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.actor = actorFrom(context.cookies.get(SESSION_COOKIE)?.value);
  const path = context.url.pathname;
  const privatePage = /^\/(applications|record|plan|overload|enrolments|account)(\/|$)/.test(path);
  const privateApi = /^\/api\/(enrol|applications|selections|events|overload|enrolments|study-plan|adviser)(\/|$)/.test(path);
  if ((privatePage || privateApi) && !context.locals.actor) {
    if (privateApi) return new Response("Sign in required", { status: 401 });
    return context.redirect("/login/", 303);
  }
  if (context.request.method === "POST") {
    // Explicit origin check also covers auth endpoints, including bare POSTs.
    if (context.request.headers.get("origin") !== context.url.origin)
      return new Response("Forbidden", { status: 403 });
    if (Number(context.request.headers.get("content-length") ?? 0) > 16_384)
      return new Response("Form too large", { status: 413 });
    if (path.startsWith("/api/auth/")) {
      try {
        throttle("auth:global", 120);
      } catch (err) {
        if (err instanceof UserError) return new Response(err.message, { status: 429 });
        throw err;
      }
    }
  }
  const response = await next();
  // Keep verification tokens out of Referer without turning a native form's
  // Origin into "null" (no-referrer does that and fails the CSRF checks).
  const sensitiveLink = path.startsWith("/verify") || path.startsWith("/email-test") || path.startsWith("/change-password") || path.startsWith("/forgot-password") || path.startsWith("/demo-inbox");
  response.headers.set("Referrer-Policy", sensitiveLink ? "strict-origin" : "same-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (context.locals.actor || sensitiveLink || path.startsWith("/api/auth"))
    response.headers.set("Cache-Control", "no-store");
  return response;
});
