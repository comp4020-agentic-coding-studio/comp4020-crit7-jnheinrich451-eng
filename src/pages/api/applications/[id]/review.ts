import type { APIRoute } from "astro";
import { back, userMessage } from "../../../../lib/http";
import { requestStaffReview } from "../../../../lib/store";

export const POST: APIRoute = ({ locals, params }) => {
  if (!locals.actor) return new Response("Sign in required", { status: 401 });
  if (locals.actor.kind !== "student") return new Response("Student access required", { status: 403 });
  try {
    const app = requestStaffReview(locals.actor.student, Number(params.id));
    return back(`/applications/${app.id}/`);
  } catch (err) { return back("/applications/", { error: userMessage(err) }); }
};
