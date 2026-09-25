import type { APIRoute } from "astro";
import { back, userMessage } from "../../../lib/http";
import { submitApplication } from "../../../lib/store";

// A permission-code request. The course arrives as the code of the page the
// student was on (a hidden field), is looked up as a catalogue row, and the
// convenor comes from that row — the student never types a course or a name.
export const POST: APIRoute = async ({ request, locals }) => {
  const actor = locals.actor;
  if (!actor) return new Response("Sign in required", { status: 401 });
  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").toUpperCase();
  const page = `/courses/${encodeURIComponent(courseCode)}/`;
  if (actor.kind !== "student") return back(page, { error: "Only students request permission codes." });
  try {
    const app = submitApplication({
      student: actor.student,
      courseCode,
      term: String(form.get("term") ?? ""),
      statement: String(form.get("statement") ?? ""),
      year: Number(form.get("year") ?? 2026),
      dispute: form.get("dispute") === "yes",
    });
    return back(`/applications/${app.id}/`);
  } catch (err) {
    return back(page, { error: userMessage(err) });
  }
};
