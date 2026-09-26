# Study load and overload requests

Implemented following John's request for a 24-unit limit and his selection of
immediate assessment with optional human review. This extends the enrolment
slice; it is not a full degree planner or a claim of university approval.

## Evidence and interpretation

Source: `assets/Overload Spec/Overload your enrolment _ Australian National University.html`.
The raw file's SHA-256 and paraphrased clauses are retained in
`src/data/overload-policy.json` (`saved-overload-2026-09-26-v1`). No ANU site was
crawled. The supplied page is unversioned information; its linked policy,
procedure and appeals process have not been imported. Its interpretation is
applied to this prototype's 2027 enrolments, not asserted as verified 2027 policy.

| Career and requested limit | Completed current-program ANU units | Completed in one semester | Overall and previous-period average |
| --- | --- | --- | --- |
| Postgraduate, 30 | No separate total threshold | 24 | 60% |
| Postgraduate, 36 | 48 | 30 | 70% |
| Undergraduate, 30 | 48 | 24 | 60% |
| Undergraduate, 36 | 96 | 30 | 70% |

Completed-credit checks count passed results with explicit ANU/current-program
attribution. Attempts count in averages, including NCN/WN as zero. The summary
does not state average weighting: both course-mean and unit-weighted readings
must agree on passing or failing the threshold; disagreement remains unknown.
Grade bands are never converted to guessed marks. Repeated course codes do not
manufacture credit and leave average interpretation unresolved. A previous
period containing non-standard sessions needs review because exact historical
study-period boundaries are not stored. Current/future results cannot satisfy
prior-study requirements. Undergraduate criteria are covered by the pure
evaluator; generated accounts currently use the postgraduate VCOMP scenario.

## Counting and confirmation

- Normal limit: 24 units. H1 = Summer, S1, Autumn; H2 = Winter, S2, Spring.
- Count persisted confirmed enrolments in that student's year/half-year. Saved
  candidates and isolated COMP8620 demo scenarios do not consume academic load.
- A non-standard course is excluded from the standard-semester pool only when
  all saved class-date combinations establish non-overlap. Missing or conflicting
  dates produce a bounded load; confirmation needs even the upper bound to fit.
  The non-standard half-year pool is checked separately. The supplied page does
  not establish an exemption between two non-standard sessions.
- Course units come from the corresponding catalogue year. New enrolments save
  their actual credit choice. A fixed 12-unit course remains 12 despite forged
  form values. Variable courses require an integer within their published range.
  Whole-unit selection within that range is a **prototype convention**, not
  evidence of available class credit options; those still require confirmation.
- Historical variable-unit enrolments without a saved credit choice remain
  unknown. They are not silently assigned the minimum of the range. This can
  prevent further confirmation until their load is established.
- The load check and insert run in the same immediate SQLite transaction.
  Direct enrolment and course-permission enrolment share the guard. An overload
  approval is scoped to student/year/half-year and never exceeds 36 units.
- Course approval and overload approval are separate. Neither saves an enrolment;
  the student returns to the course and explicitly confirms it.

## Assessment and review

The student follows the course's **Request overload assessment** link and writes
one explanation. `demo-overload-v1` saves the load entries, dates, academic record,
source version, reason, statement and checks. The system immediately approves
when all facts establish the relevant thresholds, declines known failures, or
identifies missing evidence. The statement cannot change a mark or override a
condition. The final-30-units exception always requires a discretionary decision;
requests over 30 on that basis cannot be approved. Late or unknown self-enrolment
deadlines need a reviewer to establish late-enrolment availability.

Human review is explicit. Dr Avery Hart is a separate fictional program-load
reviewer with no assigned courses. Only that assigned role can see requests sent
to it or decide them. It uses the existing emailed invitation and password flow,
then lands on `/overload/`. Invite the role using `scripts/invite-staff.ts` and an
real ANU inbox, including an existing student account, as documented in `accounts-and-data.md`. Run the script's
list mode to obtain the actual reviewer ID; do not assume an ID across databases.

Every submission, assessment, review request, decision and use of overload
approval has a timeline event. Reviewer decisions require an explanation and
preserve the original report. Approval can cover missing academic evidence or a
discretionary exception, but cannot bypass an unresolved credit maximum or the
36-unit ceiling. Pending resubmissions reuse the pending half-year request;
identical completed automated submissions reuse their saved report. The pending
reminder disappears on either human decision. The queue is not staffed by a model.

## Persistence and limits

Generated migration `0007_equal_ezekiel.sql` adds overload requests/events,
reviewer purpose, enrolment credit/approval snapshots, and nullable exact mark,
program and institution fields on transcript rows. Existing registered profiles,
course requests, decisions, accounts and enrolments are preserved. Existing marks
and attribution are not fabricated, so current grade-only demo records often
produce evidence-needed reports. There is no academic-evidence editing UI yet.

The demo record is complete only within the prototype. Real cross-institutional
study must count according to the source, but no external enrolment import exists.
No automatic degree-completion audit, withdrawal workflow, trimester rules,
document upload, appeals process or live ANU decision service is included.

## Acceptance checks

`spec/study-load.test.ts` covers 24/30/36-unit boundaries, 12-unit courses,
year/half-year isolation, non-overlap, unknown credits/dates, UG/PG criteria,
grade/mark distinctions, NCN/WN, repeated attempts and completion exceptions.
`spec/overload-flow.test.ts` drives the running app through blocked confirmation,
saved assessment, explicit review, role boundaries, approval and later enrolment,
automatic approval and competing confirmations. Existing permission-flow tests
now select and validate COMP8820's variable units. Migration and accessibility
tests continue to cover the persisted state and all new page shapes.
