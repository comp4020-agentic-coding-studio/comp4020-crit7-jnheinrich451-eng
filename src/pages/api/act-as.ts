import type { APIRoute } from "astro";
import { back } from "../../lib/http";

// The "act as" switch: no login in this prototype (CLAUDE.md), just a cookie
// naming a seeded student (`s:<id>`) or convenor (`c:<id>`).
export const POST: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData();
  const as = String(form.get("as") ?? "");
  const next = String(form.get("next") ?? "/");
  if (/^[sc]:\d+$/.test(as)) {
    cookies.set("as", as, { path: "/", httpOnly: true, sameSite: "lax" });
  }
  // only same-site paths, so the switch can't be used as an open redirect
  return back(next.startsWith("/") && !next.startsWith("//") ? next : "/");
};
