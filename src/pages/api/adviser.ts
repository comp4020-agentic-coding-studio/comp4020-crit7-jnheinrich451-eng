import type { APIRoute } from "astro";
import { dismissAdvice, requestAdvice } from "../../lib/adviser-store";
import { back, userMessage } from "../../lib/http";
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.actor?.kind !== "student") return new Response("Students only", { status: 403 });
  try {
    const form = await request.formData();
    if (form.get("action") === "dismiss") dismissAdvice(locals.actor.student);
    else await requestAdvice(locals.actor.student, String(form.get("preferences") ?? ""), Number(form.get("targetUnits")));
    return new Response(null, { status: 303, headers: { location: "/record/#adviser-heading" } });
  } catch (err) { return back("/record/", { error: userMessage(err) }); }
};
