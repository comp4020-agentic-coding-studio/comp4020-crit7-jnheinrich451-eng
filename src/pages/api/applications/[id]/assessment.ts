import type { APIRoute } from "astro";
import { back, userMessage } from "../../../../lib/http";
import { assessPending } from "../../../../lib/store";
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!locals.actor) return new Response("Sign in required", { status: 401 });
  if (locals.actor.kind !== "student") return new Response("Student access required", { status: 403 });
  const form = await request.formData();
  try {
    const app = assessPending(locals.actor.student, Number(params.id), String(form.get("reason") ?? "recorded-checks"));
    return back(`/applications/${app.id}/`);
  } catch (err) { return back("/applications/", { error: userMessage(err) }); }
};
