import type { APIRoute } from "astro";
import { back, userMessage } from "../../../../lib/http";
import { actorFrom, decide } from "../../../../lib/store";

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const actor = actorFrom(cookies.get("as")?.value);
  const id = Number(params.id);
  const page = `/applications/${id}/`;
  if (actor.kind !== "convenor") return back(page, { error: "Only the convenor can decide a request." });
  const form = await request.formData();
  const approve = form.get("decision") === "approve";
  try {
    decide({ convenor: actor.convenor, applicationId: id, approve, note: String(form.get("note") ?? "") });
    return back(page, { ok: approve ? "Approved: the student has their code." : "Rejected: the student can see why." });
  } catch (err) {
    return back(page, { error: userMessage(err) });
  }
};
