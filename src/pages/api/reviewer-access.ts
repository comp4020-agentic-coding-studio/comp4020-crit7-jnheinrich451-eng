import type { APIRoute } from "astro";
import { accountFor } from "../../lib/email-checks";
import { cancelInvitation, inviteReviewer, managesReviewers } from "../../lib/reviewer-invitations";
import { back } from "../../lib/http";
import { UserError } from "../../lib/errors";
import { resend, throttle } from "../../lib/auth";

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.actor) return new Response("Sign in required", { status: 401 });
  const account = accountFor(locals.actor);
  const data = await request.formData();
  try {
    if (data.get("action") === "resend" && account?.kind === "normal") {
      await resend(account.email);
      return back("/reviewer-access/", { ok: "If your account has a pending invitation, a fresh email has been sent." });
    }
    if (!managesReviewers(account)) return new Response("Invitation manager access required", { status: 403 });
    throttle(`reviewer-manager:${account!.id}`, 20);
    if (data.get("action") === "cancel") cancelInvitation(Number(data.get("invitationId")));
    else if (data.get("action") === "invite") await inviteReviewer(String(data.get("email") ?? ""), Number(data.get("convenorId")), account!.id);
    else return new Response("Unknown action", { status: 400 });
    return back("/reviewer-access/", { ok: data.get("action") === "cancel" ? "Invitation cancelled. Its links no longer grant access." : "The email service accepted the reviewer invitation. Access starts only after the recipient confirms its link." });
  } catch (error) {
    if (!(error instanceof UserError)) throw error;
    return back("/reviewer-access/", { error: error.message });
  }
};
