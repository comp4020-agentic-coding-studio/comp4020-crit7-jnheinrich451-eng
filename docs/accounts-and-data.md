# Accounts, email and the enrolment dataset

Student accounts must verify an address ending exactly in `@anu.edu.au` before
signing in. This confirms email ownership only, not student status. The app is
an independent prototype; it does not use ANU SSO or access university records.
Students should use a separate prototype password.

## Try the workflow without an external email service

Use the separate local capture preview while Brevo/Fly setup is pending. It
uses the same registration, verification and sign-in flow, with a local inbox
instead of delivering messages to real addresses. This does not prove ownership
of a real ANU inbox. Both browser ports are bound to this computer, and the
preview network has no external mail relay. The real `.env` is not used.

After building through the Docker check workflow in `CLAUDE.md`, run from the
repository root (Docker Desktop must be running):

```powershell
docker compose -f config/local-preview.compose.yml up -d
```

1. Open <http://127.0.0.1:4323/register/>. Register with a fictional test name,
   an address such as `student-demo@anu.edu.au`, and a separate password of
   15–128 characters. The address is used only inside this local preview.
2. Open the captured inbox at <http://127.0.0.1:8025>. Open the verification
   message, follow its link, press the confirmation button, then sign in.
3. Find COMP8620, choose an offering, and fill in the request explanation. For
   human review, expand **Optional staff review** and click **Send to convenor**.
   **Get demo assessment** creates an automatic report and does not join the
   human queue. Saving, approval and enrolment remain separate actions.
4. To act as its fictional reviewer, create an invitation in this same preview:

   ```powershell
   docker compose -f config/local-preview.compose.yml exec app node --import tsx scripts/invite-staff.ts reviewer-demo@anu.edu.au 1
   ```

   Open the invitation in the captured inbox and set a password. Use a private
   browser window for the reviewer to keep the student session separate. On the
   seeded catalogue, reviewer 1 is Dr Rowan Ellis, assigned COMP8620. If already
   invited but not activated, use **Resend verification** on the sign-in page
   with the address from the existing invitation instead of inviting again.
   Invitations expire after 30 minutes; open the newest captured message.

5. Review the student's request, then return to the student window to confirm
   enrolment. Refresh to check the resulting state remains.

The app and mailbox have separate persistent Docker volumes. Stop with
`docker compose -f config/local-preview.compose.yml down`; this preserves the
volumes. Do not add `--volumes` unless intentionally discarding local review data.
After a new build, restart the app service to load it. Existing previews on
ports 4321/4322 are independent. All previews on `127.0.0.1` share the browser's
cookie scope across ports, so use only one of them per browser profile at a time.

See `docs/workflow-review.md` for the review of John's supplied workflow and
the proposed degree/specialisation planning increment.

## Configure email locally

Copy `config/mail.env.example` to the gitignored `.env` and supply your provider's
SMTP host, port, username, password and approved sender. `APP_ORIGIN` must be the
actual origin users visit: verification links are built from this setting, never
from request headers. For remote delivery, use HTTPS. Port 465 uses TLS directly;
other ports require STARTTLS. Plain SMTP is allowed only when both the app and
mail server are on localhost, for local testing.

The server reads runtime environment variables. A plain Astro development
process does not automatically load these into `process.env`: explicitly pass
the environment file. On this Windows machine the supported preview is Docker:

```powershell
docker run --rm --name crit7-mail-preview --env-file .env -p 127.0.0.1:4322:4321 -v "D:/8020/comp4020-crit7-jnheinrich451-eng:/app" -v crit7_node_modules:/app/node_modules -w /app -e HOST=0.0.0.0 -e PORT=4321 node:24 node dist/server/entry.mjs
```

Build first through the Docker check workflow in `CLAUDE.md`. For Fly, configure
the same values as runtime secrets through the hosting tools. Do not put mail
credentials in `fly.toml`, source code, logs, or the public site. Real SMTP
delivery has not been validated until a configured provider delivers a message
to an actual test inbox; automated tests use a local SMTP capture server.

Without mail configuration, registration clearly reports that verification is
unavailable. It never bypasses verification or presents a successful delivery.
If delivery fails after account creation, the account stays unverified and the
student can resend later. SMTP acceptance does not guarantee inbox delivery;
check spam and provider delivery records if a message is missing.

## Invite reviewers

There is no public faculty registration or role selector. An administrator with
database/server access assigns an existing fictional convenor to an email
account. The emailed invitation lets the recipient set a password and verify
their address. Use the same `DATABASE_PATH` and SMTP environment as the server.

Inside the project container:

```sh
node --import tsx scripts/invite-staff.ts
node --import tsx scripts/invite-staff.ts reviewer@anu.edu.au 1
```

The first command lists available convenor IDs and usage. The second actually
sends an invitation. Only run it for an intended recipient. For a local `.env`,
use `node --env-file=.env --import tsx ...`; otherwise inherit the runtime env.
The command never promotes an existing student account or overwrites a password.
If mail fails after provisioning, resend from the sign-in page. A reviewer sees
only requests assigned to their courses, the student's explanation, the frozen
eligibility checks and the decision history. They cannot browse other profiles.

The two recent examples use these fictional assignments:

| Course | Reviewer | Seeded ID |
| --- | --- | ---: |
| COMP8620 | Dr Rowan Ellis | 1 |
| COMP7710 | Dr Hana Okafor | 4 |

For the COMP7710 reviewer in the local capture preview:

```powershell
docker compose -f config/local-preview.compose.yml exec app node --import tsx scripts/invite-staff.ts reviewer-se-demo@anu.edu.au 4
```

This sends only to the local captured inbox at <http://127.0.0.1:8025>. Activate
the invitation in a separate/private browser window, choose a prototype password,
then sign in at <http://127.0.0.1:4323/login/>. The reviewer lands on their request
queue. Student and reviewer accounts must use different addresses; this version
allows one account per fictional convenor. Using an `@anu.edu.au` address alone
does not assign staff access.

For an unmet requirement, choose the actual reason: record correction, equivalent
study or exception. **Send to convenor** then routes that question alongside the
unchanged failed/unknown checks. A recorded-results-only request can still be
rejected by the automatic first round. Existing automatic reports are historical
results; reopen the course to send a new staff request. Existing pending requests
are reused. The reviewer can approve or reject (a rejection needs an explanation),
and the decision is visible after refresh. After approval, return to the student
session to confirm enrolment. Approval alone never adds an enrolment.

This is an optional human role in the prototype. A tester can operate it; there
is no connection to real ANU staff or an automatically staffed university queue.

`tsx` is development tooling: run this command from a development/admin container
with the project's dependencies and the intended database mounted, not the lean
production image. No preset public staff credentials are shipped.

## Teaching-team access after deployment

John selected individual invitations to the markers' real `@anu.edu.au` inboxes.
The same real-inbox requirement applies to public student registration. A
fictional address works in the local captured-mail preview, but cannot complete
verification through the deployed SMTP workflow. Academic records are fictional;
the account holder must control a real inbox.
Local captured email is only a development aid: an arbitrary address will not
give access on Fly. The marker must receive the invitation, set a prototype
password and verify it. No public staff sign-up or shared reviewer password is
provided.

Next-stage access review: confirm real SMTP delivery after deployment and arrange
student/reviewer testing with distinct real addresses. John asked whether
fictional addresses could work publicly; this increment adds no verification
bypass, public captured inbox or guest-account flow. Any later guest demonstration
should be an explicitly separate access mode.

Before the marking session, the project owner should:

1. Configure the deployed HTTPS origin and SMTP service, then confirm an actual
   invitation arrives in an intended test inbox. Local SMTP tests do not establish
   production delivery.
2. Arrange each marker's reviewer address before they register it as a student.
   The current model allows one role per email and one account per fictional
   convenor. Assign an unused convenor and tell the marker which courses it owns.
   The same email cannot also be a student account; testing both roles needs a
   separate student account/session.
3. Run `scripts/invite-staff.ts` against the **deployed** database and mail
   environment using an administrative environment with the development
   dependencies. The normal production image does not include `tsx` or this
   source script; do not claim that a local invitation provisions the Fly account.
4. Share the deployed `/guide/#reviewers` link through the submission/teaching-team
   channel, together with the assigned fictional reviewer and a matching course.
   An invitation expires after 30 minutes; the invited recipient can request a
   new one through **Resend verification email** without repeating provisioning.
5. Prepare a fictional student's request for that assigned course using
   **Optional staff review → Send to convenor**, or walk through its creation.
   An automatic report does not populate a human queue. The marker can approve
   or reject, then the student confirms an approved offering and reloads the page.

The public Help and sign-in pages now explain this access route. Sending marker
invitations still needs their actual addresses and the working deployed mail
service. This turn did not provision or send any production invitation.

Opening a live invitation while signed in now shows the current identity and a
**Sign out and continue** button. That POST revokes the old session and returns
to the same unused verification link. Activation requires being signed out;
it does not silently switch identities. A private window remains an alternative.
Reviewer sign-in opens the queue, while **Course catalogue** opens the searchable
catalogue. The queue also lists the reviewer's assigned courses.

## Data and persistence

- `src/data/catalogue-sources.json`: the saved 2027 course, degree and
  specialisation evidence, imported into SQLite catalogue tables. Find courses
  and the library share these sources.
- `src/data/enrolment-rules-2027.json`: all 80 course versions are accounted for:
  62 encoded interpretations, 16 with unresolved conditions or alternative
  readings, and two missing requisite sections. Unknown rules remain unknown.
- `src/data/courses.ts` and the historical rules in `src/data/requisites.ts`
  retain the legacy 2026 reference data; old requests keep their offering year.
- `offerings`: stable course/year/term combinations; `selections` links each
  student to their saved offerings.
- `students` and `transcript`: new registrations receive the versioned fictional
  Computing (Advanced)/Artificial Intelligence template: 60 completed units across
  2026 S1/S2 and 2027 S1 with consistent fictional marks. Existing records remain
  intact. No real grades or university identifiers are inferred.
- `study_plans` and `study_plan_events`: immutable generation snapshots, assigned
  specialisation, catalogue year and saved planning preferences. New profiles start
  at 2027 S2; existing VCOMP users can save an AI focus without replacing history.
  See `docs/profile-suggestions-next-stage.md` for assumptions and guidance limits.
- `applications`, `application_events` and `enrolments`: persistent actions.
  Decisions and events are transactional, and approvals are scoped to an
  offering. Repeated saves and active requests do not create duplicates.
- `accounts`, `sessions`, `email_tokens`: salted scrypt password hashes and
  hashed random session/verification tokens. Verification links expire after
  30 minutes; sessions after eight hours. Signing out revokes the stored session.

Boot-time seed updates affect the known seeded reference people and records.
New registered profiles, saved selections, requests and enrolments are preserved.
Schema changes use generated Drizzle migrations; do not edit the database by
hand. Existing enrolments, requests and rule snapshots retain their original year.

Course detail pages show supplied descriptions, learning outcomes, requirements
and recorded offerings, with links to the persistent source library. Missing
evidence remains explicit. Do not fill gaps with invented facts or crawl the
restricted source site. See `docs/catalogue-data.md` for the import workflow.

## Current limits and checks

Password recovery, account deletion, ANU SSO and synchronisation with real
academic records are outside this increment. There are no real ANU enrolments.
Email suffix validation should not be treated as an institutional access policy.

`pnpm check` drives the built app with a throwaway SQLite database, private
fixture sessions and local SMTP capture. It covers registration, verification,
expiration, staff invitations, access boundaries, saved selections, request
routing and approval scope. The fixture account generator is never exposed as
a web endpoint. The shipped accessibility invariants and README test remain.
