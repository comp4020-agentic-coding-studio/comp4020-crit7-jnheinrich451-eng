import type { APIRoute } from "astro";
import { back, userMessage } from "../../lib/http";
import { removeSelection, saveSelection } from "../../lib/store";
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.actor?.kind !== "student") return new Response("Students only", { status: 403 });
  const form = await request.formData();
  try {
    const id = Number(form.get("offeringId"));
    if (form.get("action") === "add") saveSelection(locals.actor.student.id, id);
    else if (form.get("action") === "remove") removeSelection(locals.actor.student.id, id);
    else return new Response("Invalid action", { status: 400 });
    return back("/plan/");
  } catch (err) {
    return back("/plan/", { error: userMessage(err) });
  }
};
