import { UserError } from "./store";

// Form handlers answer every POST with a 303 back to a page (CLAUDE.md: forms
// work without JavaScript), carrying any message in the query string for the
// layout to show.
export function back(path: string, message: { error?: string; ok?: string } = {}): Response {
  const url = new URL(path, "http://x");
  if (message.error) url.searchParams.set("error", message.error);
  if (message.ok) url.searchParams.set("ok", message.ok);
  return new Response(null, { status: 303, headers: { location: url.pathname + url.search } });
}

/** A user's mistake goes back to the page as a message; anything else is a
 *  real fault and propagates. */
export function userMessage(err: unknown): string {
  if (err instanceof UserError) return err.message;
  throw err;
}
