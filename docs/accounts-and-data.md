# Accounts, email and the enrolment dataset

Student accounts must verify an address ending exactly in `@anu.edu.au` before
signing in. This confirms email ownership only, not student status. The app is
an independent prototype; it does not use ANU SSO or access university records.
Students should use a separate prototype password.

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

`tsx` is development tooling: run this command from a development/admin container
with the project's dependencies and the intended database mounted, not the lean
production image. No preset public staff credentials are shipped.

## Data and persistence

- `src/data/courses.ts`: 70 course entries transcribed from supplied catalogue
  material; the prototype currently models the 2026 catalogue.
- `src/data/requisites.ts`: the source wording and structured checks for the
  subset of courses with supplied requirements. Unknown rules remain unknown.
- `offerings`: stable course/year/term combinations; `selections` links each
  student to their saved offerings.
- `students` and `transcript`: each registered student receives an independent,
  explicitly fictional Computing (Advanced) record based on the existing Mei
  demonstration scenario. No real grades or university identifiers are inferred.
- `applications`, `application_events` and `enrolments`: persistent actions.
  Decisions and events are transactional, and approvals are scoped to an
  offering. Repeated saves and active requests do not create duplicates.
- `accounts`, `sessions`, `email_tokens`: salted scrypt password hashes and
  hashed random session/verification tokens. Verification links expire after
  30 minutes; sessions after eight hours. Signing out revokes the stored session.

Boot-time seed updates affect the known seeded reference people and records.
New registered profiles, saved selections, requests and enrolments are preserved.
Schema changes use generated Drizzle migrations; do not edit the database by
hand. Existing enrolment/request rows migrate to the current 2026 catalogue.

Course detail pages show available source-backed information and link to the
2026 published page. Descriptions and learning outcomes have not been imported.
Do not fill those gaps with invented facts or crawl the restricted source site.

## Current limits and checks

Password recovery, account deletion, ANU SSO and synchronisation with real
academic records are outside this increment. There are no real ANU enrolments.
Email suffix validation should not be treated as an institutional access policy.

`pnpm check` drives the built app with a throwaway SQLite database, private
fixture sessions and local SMTP capture. It covers registration, verification,
expiration, staff invitations, access boundaries, saved selections, request
routing and approval scope. The fixture account generator is never exposed as
a web endpoint. The shipped accessibility invariants and README test remain.
