import type { APIRoute } from "astro";
import { accountFor } from "../../lib/email-checks";
import { decide, getApplication } from "../../lib/store";
import { decideOverload, getOverload } from "../../lib/overload-store";
import { back } from "../../lib/http";
import { UserError } from "../../lib/errors";

export const POST: APIRoute = async ({ request, locals }) => {
  const actor = locals.actor;
  if (!actor) return new Response("Sign in required", { status: 401 });
  if (actor.kind !== "student" || accountFor(actor)?.kind !== "demo")
    return new Response("Demo student account required", { status: 403 });
  const data = await request.formData(), id = Number(data.get("requestId"));
  const kind = data.get("kind"), decision = data.get("decision"), note = String(data.get("note") ?? "");
  if (!Number.isSafeInteger(id) || !["approve", "reject"].includes(String(decision))) return new Response("Invalid decision", { status: 400 });
  try {
    if (kind === "course") {
      const app = getApplication(id);
      if (!app || app.studentId !== actor.student.id || app.scenarioKey) return new Response("Request not found", { status: 404 });
      decide({ convenor: app.convenor, applicationId: id, approve: decision === "approve", note, demoStudentId: actor.student.id });
    } else if (kind === "overload") {
      const item = getOverload(id);
      if (!item || item.request.studentId !== actor.student.id) return new Response("Request not found", { status: 404 });
      decideOverload(item.reviewer, id, decision === "approve", note, actor.student.id);
    } else return new Response("Unknown request type", { status: 400 });
    return back("/reviewer-demo/", { ok: "Demo decision saved. Return to your student view to see it. Approval still needs explicit enrolment confirmation." });
  } catch (error) {
    if (!(error instanceof UserError)) throw error;
    return back("/reviewer-demo/", { error: error.message });
  }
};
