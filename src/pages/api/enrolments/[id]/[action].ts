import type { APIRoute } from "astro";
import { back, userMessage } from "../../../../lib/http";
import { dropEnrolment, swapEnrolment } from "../../../../lib/store";
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (locals.actor?.kind !== "student") return new Response("Students only", { status: 403 });
  const form = await request.formData(), id = Number(params.id), revision = Number(form.get("revision"));
  try {
    if (params.action === "drop") dropEnrolment(locals.actor.student, id, revision);
    else if (params.action === "swap") swapEnrolment(locals.actor.student, id, revision, Number(form.get("replacementId")), form.has("units") ? Number(form.get("units")) : undefined);
    else return new Response("Unknown action", { status: 400 });
    return back("/plan/", { ok: params.action === "drop" ? "Course dropped. Your confirmed study load has been updated." : "Course swapped. Your replacement enrolment is confirmed." });
  } catch (err) {
    return back(`/enrolments/${id}/?${new URLSearchParams({ mode: params.action ?? "swap", replacementId: String(form.get("replacementId") ?? ""), units: String(form.get("units") ?? "") })}`, { error: userMessage(err) });
  }
};
