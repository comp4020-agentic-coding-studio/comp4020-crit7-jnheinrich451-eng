# Course enrolment: student and reviewer guide

This independent ANU-inspired prototype brings course search, academic eligibility
checks, permission requests, study-load approval and course recommendations into
one workflow. It began with my experience of a COMP8620 permission request
appearing under COMP9095 and leaving me without useful feedback. The aim is to
make the selected course, the decision, its reasons and the next action clear.

Course information comes from saved ANU catalogue pages, primarily for 2027.
Academic records and reviewer identities are fictional. Nothing you do here
changes your real ANU enrolment.

Open the [live prototype](https://comp4020-crit7-jnheinrich451-eng.fly.dev/).
Choose **Demo** when trying the site without an ANU inbox; choose **Normal**
to verify your real ANU email.

Jump to [student instructions](#for-students), [reviewer instructions](#for-reviewers)
or [prototype limits](#prototype-limits-and-current-availability).

## What good looks like here

A request stays attached to the chosen course and offering. Checks explain
which requirements are met, unmet or unknown. Missing evidence stays unresolved;
a course requiring permission from everyone is not presented as a failed
prerequisite. Requests, decisions and enrolment changes have saved histories.

**Saving a course, receiving permission and confirming enrolment are separate
steps.** Automatic permission and overload assessments use a prototype rule policy.
The optional Llama adviser helps choose courses; it cannot approve applications,
change grades or enrol anyone. These boundaries are enforced by shared checks
and persistence tests. Recommendations are guidance, not a graduation guarantee.

## For students

### Create and verify your account

The **Normal / Demo** tabs on registration and sign-in choose your account mode.
Both use a separate prototype password of 15–128 characters and save your
fictional profile, selections, requests and enrolments across visits.

| Mode | Address and confirmation |
| --- | --- |
| Normal | Use an accessible address ending exactly in `@anu.edu.au`, including an ANU email alias. Choose **Create account & send verification**, open the emailed link, select **Confirm email address**, then sign in. This verifies inbox ownership, not ANU single sign-on. |
| Demo | Choose an address such as `your-name@enrolment.test`. Select **Create demo account & open inbox**, then **Open confirmation link → Confirm & enter demo**. The private inbox is on this site; no real email is sent. |

Links expire after 30 minutes. Normal accounts can open **Resend verification
or invitation → Resend verification** on sign-in. An unverified Demo inbox offers **Create a fresh confirmation
link**. An arbitrary address does not automatically select Demo mode.

Demo accounts are persistent, not temporary sessions. Keep your chosen address
and password to return to the same record. The private inbox stays open in its
browser for up to eight hours; signing out closes it. Sign in again to reopen
it. An address alone cannot open someone else's inbox.

### Change or recover your password

If you know your password, open **My account → Change password**, enter the
current prototype password and choose **Send password-change link**. Open the
link delivered to your real or private Demo inbox, then choose a new password.

If you have forgotten it, use **Forgot password?** on sign-in. Normal accounts
receive a reset link at their verified ANU address without entering the old
password. Demo recovery needs an open private inbox or a signed-in Demo session
in that browser. If both the password and inbox access are lost, create a new
Demo account with a different address.

Password links last 30 minutes and work once. Completing a change or reset
signs out all sessions while preserving the account's academic data.

### Find, check and enrol in a course

1. Open **Find courses**. Search by code (`COMP6528` or `COMP 6528`), number
   (`6528`) or title. Check the subject when several codes share a number.
2. Open the course, select its year and offering, and read **How your record
   compares**. Choose the credit value if the course has variable units.
3. Save alternatives to **My courses** while planning. Saving does not reserve
   a place or add confirmed units. **Course library** provides the saved degree,
   specialisation and course information behind the checks.
4. When the requirements and load permit it, choose **Confirm enrolment**.
   Verify that the course appears under **Confirmed enrolments** in My courses
   or My profile. A saved candidate or approved request alone is not enrolment.

A course without a recorded offering cannot accept an enrolment request.

### Request permission or resolve an uncertain result

On the course page, select **What should be assessed?**, explain your request,
then choose **Get assessment** in Normal mode or **Get demo assessment** in Demo
mode. Select the appropriate reason when claiming equivalent study, disputing
your record or requesting an exception. Your message is saved as context; it
cannot create a passing grade or verify equivalence. Both modes use fictional
academic records and the same prototype assessment policy.

| Result | What to do next |
| --- | --- |
| Permission approved | Return to the matching course and offering and confirm enrolment, subject to the load limit. |
| Evidence or decision needed | Read the missing items. To ask for human review, open this request and choose **Send this request to reviewer**. |
| Exception decision needed | The automatic policy cannot grant the waiver. Use **Send this request to reviewer** to ask for a decision. |
| Not approved under the demo policy | Read the unmet requirements and choose an appropriate next step or exception route. |
| With a named reviewer | Follow the saved timeline in **My requests** and refresh for a decision. |

An incomplete automatic assessment is **not pending human review**. Sending it
from its request page keeps the same request number, statement and saved
assessment, and adds the handoff to the timeline. The reviewer receives that
request; the original checks remain visible after their decision.

You can also start with human review by opening the course's **Optional staff
review** and choosing **Send to convenor** with the appropriate reason selected.
The queue needs an invited reviewer to act; it is not staffed automatically.
Demo users can test decisions on their own requests as described below.

While a request is pending, follow its existing page rather than resending.
If it has no automatic report yet, **Run automatic assessment** (or **Run
automated demo assessment**) replaces the pending staff review with an immediate
assessment, retaining its history. Missing evidence can still remain unresolved.

After approval, open the **same request number**, check the year and semester,
and follow **Continue to [course code] → Confirm enrolment**. Approval for another
student or offering does not apply to yours. You can keep planning and enrol in
other eligible courses while waiting.

### Use your profile and course adviser

**My profile** shows confirmed enrolments, fictional academic results and study
suggestions. New accounts receive a generated Computing (Advanced) record with an
Artificial Intelligence specialisation, completed 2026 and 2027 S1 study, and
an initial plan for 2027 S2. Course combinations and marks can differ between
accounts; they are generated against the saved course rules and then persisted.
Refreshing does not generate a new record. Existing accounts retain their
earlier records. The profile shows what the degree still needs.
Course codes in the results table link to the saved catalogue, with full names
shown underneath; the table identifies the catalogue year.

In **Course adviser**, describe an interest or goal, set **Preferred total units
this semester**, and choose **Ask adviser** or **Update my suggestions**. Allow
up to 45 seconds when AI matching is enabled. Read the suggested courses and
supporting excerpts, then use **View course details and save**. The unit choice
includes confirmed and saved courses; entering a number in your message does
not change it. Update suggestions after changing your courses or semester.
**Use standard suggestions** returns to the usual planner.

Topics you name directly, such as AI or robots, match a reviewed topic list
without calling a model. When available, Llama helps interpret interests phrased
in other words. Courses are then checked against your record, study load,
offerings and remaining degree requirements. If AI is unavailable, **Match
interests and apply units** still handles named topics and rule-based planning.

A matching course may not fit what your degree still needs this semester. The
adviser explains courses left out and identifies those needing permission,
evidence or a later offering. When no match fits, the shortlist is labelled
**Standard suggestions from your study plan**. Requests such as "easy HDs" do
not establish a subject interest or a likely grade. Asking about another
specialisation does not change the Artificial Intelligence record; the adviser
can match subject interests within the current plan only.

### Manage study load, drop and swap

The normal limit is **24 confirmed units per semester/half-year**, not four
courses of any size. A 12-unit course counts as 12 units. Saving alternatives
does not consume this limit.

If a course would exceed your limit, follow **Request overload assessment**,
select the basis, explain why, and choose **Get overload assessment**. Review
the saved report. When offered, **Send overload request for review** sends it
to the separate program-load reviewer. Approval can raise the limit to 30 or
36 units for that half-year; it does not waive prerequisites or enrol the course.
Return to the course to confirm. **Study load** keeps these requests together.

Use **Drop** or **Swap** beside a confirmed enrolment in My courses or My profile.
Review the proposed change before confirming it. Swap checks a replacement in
the same session and keeps the original enrolment if the swap cannot complete.
Removing a saved candidate alone does not drop a confirmed enrolment.

## For reviewers

### Activate an invited account

Arrange an invitation with the project owner using a real `@anu.edu.au` inbox.
**The same verified email and password can serve both student and reviewer
views.** Public registration creates student access; it does not grant authority
to review other students.

Open the emailed invitation and accept it. Existing verified accounts keep
their password and student record. New reviewers choose a prototype password,
confirm the invitation and sign in. If already signed in when opening the link,
use **Sign out and continue**, or open it in a private browser window.

Use **Switch to reviewer view** or **Switch to student view** in the header or
on **Reviewer access**. A reviewer without a student profile can select **Create
my student view** once. The active view controls which actions are available.
Links last 30 minutes; use **Resend my invitation** on Reviewer access, or the
resend form on sign-in if signed out.

### Invite reviewers as the project owner

Open **Reviewer access → Manage reviewer invitations** while signed in with
the configured owner account. Enter the recipient's real ANU address, select
an available assignment from the cards showing its courses, and choose **Send
reviewer invitation**. You can invite your own address to test both views.
Each account holds one reviewer assignment, and each assignment belongs to one
account. Assigned slots are unavailable; a pending invitation can be resent to
its existing recipient or cancelled from **Invitation history**.

The recipient gains reviewer access only after accepting the emailed link.
Other accounts do not see the invitation manager or its recipient history.

### Review course permissions

1. Open **Review requests**, then **Your assigned courses** to check your scope.
2. Open an item under **Waiting for you**. Check its request number, student,
   course, year and semester before reading the explanation, eligibility
   evidence and timeline.
3. Choose **Approve and issue a code** or **Reject**. Rejection requires a reason;
   give the student a useful explanation of the decision.
4. The decision is saved. Approval applies to that student and offering; the
   student must still confirm enrolment.

An empty queue can be correct: an automatic assessment alone does not enter it.
The student must send an incomplete assessment with **Send this request to
reviewer**, or choose **Optional staff review → Send to convenor** on an assigned
course. A handoff keeps the original automatic report as evidence; a human
approval does not rewrite an unknown requirement as an automatically met one.

**Seeded example** requests belong to unregistered fictional students. Deciding
one does not decide your own student request. When testing both roles, look for
**Your student profile** and check the request number and offering. Switch back
to the student view afterwards to confirm enrolment.

Invited reviewers can see other students' requests routed to their assigned
courses, including the relevant explanation, checks and timeline. They cannot
browse unrelated requests or other students' full profiles. **Course catalogue**
and **Course library** remain available for browsing.

### Review overload requests

The separately invited program-load reviewer uses **Review overloads**. Open
a request explicitly sent for review, examine its load and academic evidence,
and fill in **Decision and evidence** before choosing **Approve overload** or
**Reject overload**. Both require an explanation. Ordinary course convenors
cannot grant overload approval, and overload approval does not grant course
permission.

### Try demo reviewing without an invitation

1. Register or sign in with **Demo** selected.
2. Submit a course request and explicitly send it for staff review, either from
   its incomplete assessment or through **Optional staff review** on the course.
3. Open **Reviewer access → Open my demo reviewer view**. Only requests from
   your own Demo student profile are available here.
4. Read the evidence, then choose **Approve demo request** or **Reject demo
   request**. Rejection needs a note. The saved decision identifies the Demo
   reviewer as a simulation.
5. Return through **View the full request, evidence and timeline**. After
   approval, continue to the course and confirm enrolment as the student.

You can likewise review your own overload requests after explicitly sending
them for review. This mode grants no invited reviewer role and cannot decide
another visitor's requests. Assigned prototype reviewers can also see Demo
requests sent to their courses, so use fictional details in explanations.

## Prototype limits and current availability

For a complete permission example without waiting for staff, open **Help** and
try the fictional COMP8620 topic scenario. Its **Demo scenario completions** are
separate from academic enrolments and never count as passed credit or study load.

The first planning example covers Computing (Advanced) and Artificial
Intelligence. The site does not implement a complete degree audit, guaranteed
graduation, real university records, withdrawal deadlines, fees or transcript
penalties. Unknown conditions and indicative future offerings need further
evidence; they are not permission to enrol.

Normal registration, password recovery and real invitations use email delivery.
Mail can be delayed or filtered: check junk and organisational quarantine, then
request a fresh link or contact the project owner. Demo mode is available without
a real inbox; it never sends mail to a made-up ANU address.

Live Llama assistance depends on the model service being available. Named-topic
matching and rule-based suggestions remain available when it is offline. Course
permission and overload decisions use the prototype's rules independently of
the adviser. This guide is also published in full under **About this project**
on the site.
