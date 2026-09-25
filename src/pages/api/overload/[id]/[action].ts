import type { APIRoute } from "astro";
import { back, userMessage } from "../../../../lib/http";
import { decideOverload, requestOverloadReview } from "../../../../lib/overload-store";
export const POST: APIRoute = async ({ request, locals, params }) => {
  const actor = locals.actor, id = Number(params.id), path = `/overload/${id}/`;
  if (!actor) return new Response("Sign in required", { status: 401 });
  const form = await request.formData();
  try {
    if (params.action === "review" && actor.kind === "student") requestOverloadReview(actor.student, id);
    else if (params.action === "decision" && actor.kind === "convenor") {
      const decision = form.get("decision");
      if (decision !== "approve" && decision !== "reject") return new Response("Invalid decision", { status: 400 });
      decideOverload(actor.convenor, id, decision === "approve", String(form.get("note") ?? ""));
    } else return new Response("Action not permitted", { status: 403 });
    return back(path);
  } catch (err) { return back(path, { error: userMessage(err) }); }
};
