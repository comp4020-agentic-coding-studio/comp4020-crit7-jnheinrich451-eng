import type { ApplicationView } from "./store";

/** Present saved decisions and subsequent confirmation consistently across pages. */
export function applicationStatus(app: ApplicationView): { label: string; say: string } {
  if (app.enrolmentConfirmed) return app.scenarioKey
    ? { label: "Scenario enrolment confirmed", say: "Your completed example is saved under Demo scenario completions in My courses and My profile. It uses a separate fictional record and does not add to your academic enrolments." }
    : { label: "Enrolled", say: "Enrolment is confirmed for this offering. Your request history is below." };
  if (app.status === "assessment-incomplete") return app.report?.context.reason === "exception"
    ? { label: "Exception decision needed", say: "The recorded requirement check is complete. Your exception remains undecided because the demo policy cannot grant waivers. No staff review is in progress for this request; see the next steps below." }
    : { label: "Evidence or decision needed", say: "The automatic assessment is complete, but eligibility remains unresolved. No staff review is in progress for this request. See the missing items and next steps below." };
  if (app.status === "auto-rejected") return app.report
    ? { label: "Not approved under the demo policy", say: "Recorded requirements are unmet. Read the assessment for the reasons and available next steps." }
    : { label: "Rejected automatically", say: "The automatic first round turned this down from your record, so it never went to the convenor." };
  if (app.status === "with-convenor") return { label: `With ${app.convenor.name}`, say: `Waiting for ${app.convenor.name}, convenor of ${app.course.code}. Refresh this page to check for a decision.` };
  if (app.status === "approved") return app.report && !app.staffReview
    ? { label: "Demo permission approved", say: "The automated demo policy issued permission. Confirm enrolment to complete the selected workflow." }
    : { label: "Approved", say: "Your reviewer issued permission for this offering. Confirm enrolment to add it to My courses and My profile." };
  if (app.status === "rejected") return { label: "Rejected by the convenor", say: "The convenor turned this down. Their reason is in the timeline." };
  return { label: "Status unavailable", say: "This saved request has an unrecognised status. Its recorded history is below." };
}
