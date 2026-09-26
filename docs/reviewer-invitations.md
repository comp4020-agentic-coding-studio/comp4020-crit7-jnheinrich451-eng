# Invite a marker on the deployed app

Reviewer registration is owner initiated. A marker receives a real SMTP
invitation, chooses a prototype password, confirms the link and signs in.
Their role is a fictional course convenor (assigned courses only) or the
separate program-load reviewer. There is no public reviewer signup.

The owner-only command is bundled at build time into
`dist/admin/invite-staff.mjs`, included in the production image and uses Fly's
database and SMTP environment when run there. It is not a web endpoint.
With authenticated Fly CLI access to this app:

```sh
fly ssh console -a comp4020-crit7-jnheinrich451-eng -C 'node dist/admin/invite-staff.mjs --list'
```

This read-only listing shows fictional reviewer IDs, assigned course codes and
whether a slot is available. It prints no account email or secret and sends no
message. Agree on the marker's real address and an available slot, then replace
the example recipient and ID below:

```sh
fly ssh console -a comp4020-crit7-jnheinrich451-eng -C 'node dist/admin/invite-staff.mjs marker@anu.edu.au 1'
```

On John's Windows workstation, use the authenticated Docker `flyio/flyctl`
wrapper documented in CLAUDE.md if `fly` is not installed. Do not run the source
script against a local database and assume it created the production account.
The TypeScript source remains available for the local capture preview.

An email can hold one role, and a fictional reviewer slot can have one invited
account. The command rejects an existing email or occupied slot without changing
their role or data. If the marker has already registered as a student, agree on
another real ANU alias they can receive mail at; do not delete or promote the
existing student account. For a new marker, reserve their real email for reviewing
and let them choose a separate `@enrolment.test` student account on the Demo tab.

The activation link lasts 30 minutes. If it expires or delivery fails, the
invited recipient uses Normal sign-in → Resend verification email; the owner
does not need to provision a second account. Opening the invite during a student
session offers Sign out and continue. A separate browser/private window allows
both roles to remain open.

To populate the queue, use the demo student to open a course assigned to that
reviewer, choose a reason and submit **Optional staff review → Send to convenor**.
Automatic reports do not enter the human queue. The invited reviewer decides;
approval still requires the student to confirm enrolment. Overload requests
require the separate program-load reviewer and explicit submission for review.

Share `/guide/#reviewers` and the assigned course with the marker. SMTP acceptance
does not prove delivery to their Inbox; verify an intended invitation arrives.
No production invitation is sent merely by building or deploying the command.
