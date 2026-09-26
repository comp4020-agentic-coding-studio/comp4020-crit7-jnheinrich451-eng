# Course enrolment: student and reviewer guide

This independent ANU-inspired prototype brings course search, academic eligibility
checks, permission requests, study-load approval and course recommendations into
one workflow. It began with my experience of a COMP8620 permission request
appearing under COMP9095 and leaving me without useful feedback. The aim is to
make the selected course, the decision, its reasons and the next action clear.

Course information comes from saved ANU catalogue pages, primarily for 2027.
Academic records and reviewer identities are fictional. Nothing you do here
changes your real ANU enrolment.

Jump to [student instructions](#for-students), [reviewer instructions](#for-reviewers)
or [prototype limits](#prototype-limits-and-current-availability).

## What good looks like here

A request stays attached to the chosen course and offering. Checks explain
which requirements are met, unmet or unknown. Missing evidence stays unresolved;
a course requiring permission from everyone is not presented as a failed
prerequisite. Requests, decisions and enrolment changes have saved histories.

**Saving a course, receiving permission and confirming enrolment are separate
steps.** Automatic permission and overload assessments use a demo rule policy.
The optional Llama adviser helps choose courses; it cannot approve applications,
change grades or enrol anyone. These boundaries are enforced by shared checks
and persistence tests. Recommendations are guidance, not a graduation guarantee.

## For students

### Create and verify your account

Choose **Create account** and use a real address ending exactly in
`@anu.edu.au`. Choose a separate prototype password of 15–128 characters, open
the verification email, select **Confirm email address**, then sign in.
This verifies inbox ownership; it does not connect to ANU single sign-on.

Verification links expire after 30 minutes. **Resend verification email** on
the sign-in page requests a new link. Public registration needs an inbox you
can access; fictional email addresses work only in the developer's local
captured-mail setup. Password recovery is not implemented.

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
then choose **Get demo assessment**. Select the appropriate reason when claiming
equivalent study, disputing your record or requesting an exception. Your message
is saved as context; it cannot create a passing grade or verify equivalence.

| Result | What to do next |
| --- | --- |
| Permission approved | Return to the matching course and offering and confirm enrolment, subject to the load limit. |
| Evidence or decision needed | Read the missing items. No human review is in progress unless you explicitly request it. |
| Exception decision needed | The automatic policy cannot grant the waiver; use the optional staff route. |
| Not approved under the demo policy | Read the unmet requirements and choose an appropriate next step or exception route. |
| With a named reviewer | Follow the saved timeline in **My requests** and refresh for a decision. |

To request human review, open the course's **Optional staff review** and choose
**Send to convenor** with the appropriate reason selected. The queue needs an
invited reviewer to act; it is not staffed automatically. While a request is
pending, use its existing page rather than resending. You can continue planning
and enrol in other eligible courses.

### Use your profile and course adviser

**My profile** shows confirmed enrolments, fictional academic results and study
suggestions. New accounts receive a Computing (Advanced) scenario with an
Artificial Intelligence specialisation, completed 2026 and 2027 S1 study, and
an initial plan for 2027 S2. Existing accounts retain their earlier records.
Course codes in the results table link to the saved catalogue, with full names
shown underneath; the table identifies the catalogue year.

In **Course adviser**, describe an interest or goal, set **Preferred total units
this semester**, and choose **Ask adviser** or **Update my suggestions**. Allow
up to 45 seconds when AI matching is enabled. Read the suggested courses and
supporting excerpts, then use **View course details and save**. The unit choice
includes confirmed and saved courses; entering a number in your message does
not change it. Update suggestions after changing your courses or semester.
**Use standard suggestions** returns to the usual planner. If AI is unavailable,
rule-based suggestions and **Apply unit preference** remain available.

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
Do not first register that address as a student: this version allows one role
per email. There is no public reviewer registration or role-switching control.

Open the invitation, choose a separate prototype password, confirm your email
and sign in. Expired invitations can be renewed through **Resend verification
email**. If another account is signed in, use **Sign out and continue**, or open
the invitation in a private browser window. Testing both roles needs separate
student and reviewer accounts.

### Review course permissions

1. Open **Review requests**, then **Your assigned courses** to check your scope.
2. Open an item under **Waiting for you**. Check the course, offering, student's
   explanation, recorded eligibility evidence and timeline.
3. Choose **Approve and issue a code** or **Reject**. Rejection requires a reason;
   give the student a useful explanation of the decision.
4. The decision is saved. Approval applies to that student and offering; the
   student must still confirm enrolment.

An empty queue can be correct: automatic demo assessments do not enter the
human queue. To test the route, a student must choose **Optional staff review →
Send to convenor** for one of your assigned courses. **Course catalogue** and
**Course library** remain available for browsing. Unrelated students' profiles
and requests are not accessible to you.

### Review overload requests

The separately invited program-load reviewer uses **Review overloads**. Open
a request explicitly sent for review, examine its load and academic evidence,
and fill in **Decision and evidence** before choosing **Approve overload** or
**Reject overload**. Both require an explanation. Ordinary course convenors
cannot grant overload approval, and overload approval does not grant course
permission.

## Prototype limits and current availability

For a complete permission example without waiting for staff, open **Help** and
try the fictional COMP8620 topic scenario. Its **Demo scenario completions** are
separate from academic enrolments and never count as passed credit or study load.

The first planning example covers Computing (Advanced) and Artificial
Intelligence. The site does not implement a complete degree audit, guaranteed
graduation, real university records, withdrawal deadlines, fees or transcript
penalties. Unknown conditions and indicative future offerings need further
evidence; they are not permission to enrol.

At this draft's preparation, real email delivery and reviewer activation on
the deployed site still need verification. Live AI also needs the deployed
server to reach the model service. Local captured email and local AI checks
do not establish either. If verification mail does not arrive, check spam and
request a new link; if delivery still fails, contact the project owner.
