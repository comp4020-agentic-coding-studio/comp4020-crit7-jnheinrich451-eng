import type { APIRoute } from "astro";
import { back, userMessage } from "../../lib/http";
import { actorFrom, enrol } from "../../lib/store";

export const POST: APIRoute = async ({ request, cookies }) => {
  const actor = actorFrom(cookies.get("as")?.value);
  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").toUpperCase();
  const page = `/courses/${encodeURIComponent(courseCode)}/`;
  if (actor.kind !== "student") return back(page, { error: "Only students enrol." });
  try {
    const via = enrol({ student: actor.student, courseCode, term: String(form.get("term") ?? "") });
    return back(page, {
      ok: via === "permission" ? `Enrolled in ${courseCode} with your permission code.` : `Enrolled in ${courseCode}.`,
    });
  } catch (err) {
    return back(page, { error: userMessage(err) });
  }
};
