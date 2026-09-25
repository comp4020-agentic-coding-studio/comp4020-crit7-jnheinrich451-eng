import type { APIRoute } from "astro";
import { back, userMessage } from "../../../../lib/http";
import { decide } from "../../../../lib/store";

export const POST: APIRoute = async ({ request, locals, params }) => {
  const actor = locals.actor;
  if (!actor) return new Response("Sign in required", { status: 401 });
  const id = Number(params.id);
  const page = `/applications/${id}/`;
  if (actor.kind !== "convenor") return back(page, { error: "Only the convenor can decide a request." });
  const form = await request.formData();
  if (!["approve", "reject"].includes(String(form.get("decision"))))
    return new Response("Invalid decision", { status: 400 });
  const approve = form.get("decision") === "approve";
  try {
    decide({ convenor: actor.convenor, applicationId: id, approve, note: String(form.get("note") ?? "") });
    return back(page, {
      ok: approve ? "Approved: the student has their code." : "Rejected: the student can see why.",
    });
  } catch (err) {
    return back(page, { error: userMessage(err) });
  }
};
