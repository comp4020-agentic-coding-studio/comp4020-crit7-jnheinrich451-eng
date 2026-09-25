import type { APIRoute } from "astro";
import { back, userMessage } from "../../../lib/http";
import { submitOverload } from "../../../lib/overload-store";
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.actor?.kind !== "student") return new Response("Students only", { status: 403 });
  const form = await request.formData();
  const code = String(form.get("courseCode") ?? "").toUpperCase(), year = Number(form.get("year")), term = String(form.get("term") ?? "");
  try {
    const result = submitOverload({ student: locals.actor.student, code, year, term,
      reason: String(form.get("reason") ?? "standard"), statement: String(form.get("statement") ?? ""), units: form.has("units") ? Number(form.get("units")) : undefined });
    return back(`/overload/${result.id}/`);
  } catch (err) { return back(`/overload/?${new URLSearchParams({ course: code, year: String(year), term, units: String(form.get("units") ?? "") })}`, { error: userMessage(err) }); }
};
