import type { APIRoute } from "astro";
import { back, userMessage } from "../../lib/http";
import { saveStudyPlan } from "../../lib/planning-store";
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.actor?.kind !== "student") return new Response("Students only", { status: 403 });
  try {
    const form = await request.formData();
    saveStudyPlan(locals.actor.student, String(form.get("period") ?? ""));
    return back("/record/#suggestions-heading", { ok: "Planning preference saved. Your academic history and enrolments are unchanged." });
  } catch (err) { return back("/record/", { error: userMessage(err) }); }
};
