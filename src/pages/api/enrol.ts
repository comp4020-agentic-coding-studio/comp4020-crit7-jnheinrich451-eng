import type { APIRoute } from "astro";
import { back, userMessage } from "../../lib/http";
import { enrol } from "../../lib/store";
import { ACTIVE_YEAR } from "../../lib/academic-year";

export const POST: APIRoute = async ({ request, locals }) => {
  const actor = locals.actor;
  if (!actor) return new Response("Sign in required", { status: 401 });
  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").toUpperCase();
  const term = String(form.get("term") ?? "");
  const year = Number(form.get("year") ?? ACTIVE_YEAR);
  const page = `/courses/${encodeURIComponent(courseCode)}/?${new URLSearchParams({ term, year: String(year) })}`;
  if (actor.kind !== "student") return back(page, { error: "Only students enrol." });
  try {
    const via = enrol({
      student: actor.student,
      courseCode,
      term,
      year,
    });
    return back("/plan/", {
      ok:
        via === "permission"
          ? `Enrolled in ${courseCode} with your permission code.`
          : `Enrolled in ${courseCode}.`,
    });
  } catch (err) {
    return back(page, { error: userMessage(err) });
  }
};
