import type { APIRoute } from "astro";
import { back, userMessage } from "../../lib/http";
import { confirmScenario } from "../../lib/store";
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.actor) return new Response("Sign in required", { status: 401 });
  if (locals.actor.kind !== "student") return new Response("Student access required", { status: 403 });
  const form = await request.formData();
  const id = Number(form.get("applicationId"));
  try {
    confirmScenario(locals.actor.student, id);
    return back(`/applications/${id}/`);
  } catch (err) {
    return back("/demo/", { error: userMessage(err) });
  }
};
