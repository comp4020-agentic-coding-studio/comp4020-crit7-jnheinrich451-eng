# Course enrolment with permission requests included

Draft for replacing the starter README's About page after John's review.

This independent ANU-inspired prototype connects course search, eligibility
checks, permission requests and explicit enrolment confirmation. It began with
John's reported experience of a COMP8620 application appearing under COMP9095
and leaving him without a useful next step. Requests in this prototype reference
the selected course and offering directly, and keep a saved status history.

## What good looks like here

A student should understand why a course needs permission, which evidence is
missing and what they can do next. Prerequisites, a permission requirement for
everyone and an unavailable offering are different conditions. The application
keeps them distinct. Approval and a saved course are not confirmed enrolment.

The saved 2027 catalogue supplies course evidence. The shared rule engine checks
fictional academic records, retains unknown results and enforces unit limits.
Dropping and swapping courses preserve history; a failed swap keeps the original
enrolment. Reviewers are invited and can see only their assigned requests.

The optional Llama adviser matches interests to original course passages. It
cannot approve requests or change academic records. Suggestions remain subject
to the rule engine and do not promise graduation. Without a reachable model,
rule-based planning remains available.

## Trying the prototype

Browse the course catalogue without signing in. Student registration requires
a real `@anu.edu.au` inbox and email verification, then assigns a clearly
fictional academic profile. Reviewer accounts use separate emailed invitations.
Live SMTP delivery must be verified before this is presented as a ready public
sign-up flow. The isolated COMP8620 practice scenario is available through Help;
its completions do not enter the academic transcript or count toward study load.

This is a student prototype, not ANUHub or an official ANU decision service.
The app does not implement withdrawal deadlines, fee consequences, a complete
degree audit or a connection to university records. The design constraints and
checks are recorded in `CLAUDE.md`, `spec/` and `PROCESS_RECORD.md`.
