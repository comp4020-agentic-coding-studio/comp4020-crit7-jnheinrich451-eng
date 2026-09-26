# Reviewer access

Open /reviewer-access/ from sign-in, My account or the footer. Demo students can
use /reviewer-demo/ to decide only their own fictional course and overload
requests. Real reviewers accept an owner-issued email invitation and see requests
for their assigned fictional convenor or program-load reviewer.

## Invite from the website

Set server-only REVIEWER_ADMIN_EMAIL to the owner's verified normal account email.
Without it, web invitation management is disabled. Sign in as that account and
open /reviewer-access/ to see Manage reviewer invitations. Its form, recipient
history and cancellation actions are owner-only.

1. Enter the recipient's real @anu.edu.au address and select an available reviewer
   assignment. You may invite your own existing student address.
2. Send the invitation. A pending invitation reserves the assignment; sending
   again for that recipient and slot gives a fresh link. Cancel an unused invite
   to release its reservation and invalidate its links.
3. The recipient opens the email and confirms. Opening a link alone cannot grant
   access. An existing session offers Sign out and continue.
4. Existing verified accounts keep their password, profile and saved work. New or
   unverified recipients choose a password. Acceptance revokes old sessions;
   sign in again afterwards.
5. Use Switch to reviewer view / Switch to student view in the header. A reviewer
   without a student profile can choose Create my student view to generate one
   fictional record. Later switches reuse that saved profile.

One account can hold a student profile and one reviewer assignment; each fictional
reviewer belongs to one account. Public registration cannot grant reviewer access.
Links last 30 minutes. Resend verification or invitation on sign-in works for an
existing verified recipient with a pending invitation too. Signed-in recipients
also have Resend my invitation. SMTP failure leaves the reservation pending and
grants no access; the recipient can resend, or the owner can cancel it.

## Test the queue

In the student view, open an assigned course, explain the request, and select
**Optional staff review → Send to convenor**. Automatic reports do not enter the
reviewer queue. Switch views, approve or reject with a reason, then return to the
student view to explicitly confirm an approved enrolment. A private browser
window can keep both views open.

For demo reviewing, use a chosen @enrolment.test student and its own demo reviewer
page. The server verifies ownership on every decision; it never exposes another
visitor's requests. Rejection needs a reason. The timeline records Demo reviewer,
and course approvals carry a DEMO-REVIEW prefix. Overload reports must first be
sent for review; decisions need notes, retain the 30/36-unit safeguards, and do
not enrol courses. Invited course reviewers cannot grant overloads; the separate
program-load role handles those. A demo student can test both for its own profile.

## Owner CLI fallback

The production build includes dist/admin/invite-staff.mjs. Use the intended
production database and SMTP environment:

```sh
fly ssh console -a comp4020-crit7-jnheinrich451-eng -C 'node dist/admin/invite-staff.mjs --list'
fly ssh console -a comp4020-crit7-jnheinrich451-eng -C 'node dist/admin/invite-staff.mjs marker@anu.edu.au 1'
```

List mode sends no mail and prints no account email or secret. An invitation sends
only to the supplied recipient. Use the authenticated Docker flyctl wrapper on
Windows if fly is unavailable. Local invitations do not create Fly accounts.
Share /guide/#reviewers and the assigned course with markers. Provider acceptance
is distinct from Inbox delivery; confirm receipt with the recipient.
