# Normal and Demo account access

Implemented in the 27 September account-mode increment. Deployment and check
evidence are recorded in PROCESS_RECORD.md after verification.

Normal and Demo are explicit tabs on registration and sign-in. ANU UID-style
addresses and name-based aliases stay in Normal mode and require real SMTP
verification. Address shape never decides whether verification is simulated.

## Visitor flow

1. Select Demo, choose a display name, an address such as `alex@enrolment.test`,
   and a separate prototype password. The visitor chooses the entire address;
   nothing is generated or sent through SMTP. Real domains are rejected in this
   mode. The local part permits 1–48 letters, numbers, dots, hyphens or underscores
   and must start with a letter or number. Addresses are case-insensitive.
2. Registration opens a private inbox page. Its confirmation link leads to an
   explicit POST, then into the fictional profile in the same browser. A GET
   cannot activate an account. Without that browser's inbox capability, a valid
   confirmation link activates the demo account but still requires password sign-in.
3. The profile, selections, requests, advice and enrolments persist. The session
   displays Demo account and never claims verified ANU identity. Signing in again
   uses the visitor's chosen address and password.
4. My account supports the same password-change sequence, delivered inside the
   private inbox. Completing it invalidates all old sessions and inbox grants.

## Inbox privacy and recovery

An eight-hour HttpOnly, SameSite=Lax cookie (Secure on HTTPS) is the private inbox
capability. The database stores its hash, message metadata and random nonces.
Message links are reconstructed using HMAC with the browser secret; neither raw
capabilities nor raw verification/password-change tokens are saved in SQLite.
Inbox and confirmation pages are not cacheable and do not leak token paths in
referrers. Guessing an address or changing a query parameter cannot open an inbox.
Signing out revokes that browser's grant. Normal sign-in also closes its demo inbox.

In another browser, or after expiry, sign in with the chosen demo address and
password. An unconfirmed account gets a new private inbox and confirmation link;
a confirmed account gets a session and new inbox. Old captured messages belong
to their original browser grant, not the new inbox. Academic data is retained.
Losing both the password and browser access is not recoverable in this increment.
If the private inbox is still open, **Forgot password? → Demo** can send a reset
link there without the old password. A signed-in demo session can also open its
own inbox for recovery. A supplied address never grants a new inbox capability.

Confirmation/password links last 30 minutes and are single-use. Duplicate
registration never replaces an account or opens its inbox. Demo confirmation
resends require the private capability and are limited to three per account per
15 minutes. Demo creation is limited to 30 per 15 minutes across the deployment,
in addition to the existing per-address and shared authentication limits.
Adviser requests retain their per-student limit, two-call concurrency bound and
deadline; demo users additionally share 30 new requests per 15 minutes.

## Reviewers and marking

Public demo accounts are students only. They can test the full enrolment and
optional human-review flow. Explicitly submitted requests are visible to their
assigned invited reviewer and labelled Demo account in the queue. This is an
intentional refinement of the earlier proposed separate guest queue: markers
can exercise both sides with one real mailbox, using a fictional student identity
for submissions and their invited normal account for decisions. Students still
cannot read other students' records or requests. Use fictional request details.

Invitations always use real SMTP and cannot enter a captured inbox. See
[reviewer-invitations.md](reviewer-invitations.md). No public reviewer signup,
real-account role switch, ANU SSO or account deletion is included.
