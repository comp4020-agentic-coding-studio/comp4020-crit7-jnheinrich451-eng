# Enrolment workflow review — 25 September 2026

This is a review and proposed next increment, not an implemented degree planner
or a statement of ANU policy. The source is John's `assets/ANU_enrollment.md`
and his Machine Learning specialisation example. `CLAUDE.md` remains the shared
product harness. The published Crit 7 contract asks for a persistent, working
slice; it does not require modelling every degree or automating advice.

## What the supplied workflow changes

Students begin with a degree plan, not necessarily a course code. They reconcile
compulsory units, specialisation choices, electives, prerequisites and offering
dates outside ANUHub, then use the portal to enrol in a particular session.
Permission information is dispersed, and a rejection may surface only at final
confirmation. This supports two connected tasks:

1. Plan a feasible sequence of study and understand what is still uncertain.
2. Enrol in an actual offering, with an integrated permission request if needed.

The catalogue remains useful for direct lookup. A proposed planning view should
also show why a course is relevant, when it is available, what must precede it,
and which future options depend on it. Unavailable courses should remain visible
in planning with their next known offering; an enrolment action must be limited
to an actual offering. Do not fabricate future availability from a past pattern.

## Findings and acceptance checks

| Problem | Evidence | Proposed change | Acceptance check |
| --- | --- | --- | --- |
| Students must reconstruct degree progress outside the portal | John's starting-point and decision notes | Begin with one versioned postgraduate degree and one specialisation; show satisfied and remaining requirement groups | A completed course contributes only where the supplied counting rules permit; unavailable rules display as unknown |
| A prerequisite offered once a year can delay several later courses | John's COMP6670 example | A small semester plan with dependencies and availability warnings | A prerequisite scheduled in S2 cannot satisfy a completion requirement for a course in the preceding S1 |
| Permission instructions appear late or on disconnected platforms | John's permission notes | Put the recorded rules, permission requirement and request action beside the selected offering | Students can understand the issue before final confirmation; the submitted request keeps the same course and offering IDs |
| No feedback leaves the student unable to proceed | John's reported COMP8620/COMP9095 case | Keep the status timeline, assigned reviewer and explicit decision reasons | A student sees pending, approved or rejected with the recorded reason; approval applies only to that student and offering |
| Email setup currently prevents John from trying the flow | Local SMTP rejection and John's current message | A separate loopback-only preview with captured email and its own database | Register, read the captured verification email, verify and sign in; exercise reviewer invitation without sending external email |

## Machine Learning scenario: conditional sequence

Given John's reported assumptions — choose at least two of three level-8000
courses, all requiring completed COMP6670, COMP6670 offered in S2, and those
advanced courses in S1 — a new S1 entrant without prior credit has this earliest
ordinary sequence for the advanced courses:

| Session | Planning implication |
| --- | --- |
| Year 1 S1 | Take other eligible courses that count toward the degree; the example alone does not establish that any arbitrary level-6000 course is required |
| Year 1 S2 | Take COMP6670, subject to its own prerequisites and confirmed offering |
| Year 2 S1 | If COMP6670 is passed, take at least two of the three advanced courses, subject to other rules, actual offerings and workload |

This is not proof of a unique complete degree plan. Equivalent prior study,
waivers, alternative prerequisites, failed attempts, credit limits and future
offering changes can alter it. Ask for academic advice where an exception is
needed; do not automatically invent or approve a waiver.

A planned course is not a passed prerequisite. Keep completed, currently
enrolled, planned and permission-approved states distinct. A forecast can say
"eligible if COMP6670 is passed before this offering"; actual enrolment must
continue to check the recorded results and scoped approvals.

## Evidence to collect first

Screenshots are acceptable. John can add them to `assets/` without retyping.
For each group, include the source URL and academic/catalogue year in a nearby
note or filename, keep overlapping captures in reading order, and include
footnotes, AND/OR clauses and exceptions. Redact personal application details.
Ambiguous or cropped text must remain unresolved rather than being guessed.

Collect one complete vertical example before expanding the dataset:

1. The applicable Computing (Advanced) degree requirements and rule year:
   total units, compulsory courses, elective groups, level limits and any
   cross-counting rules. Clarify which rule version applies to an entering cohort.
2. The Machine Learning specialisation page: its exact code/name, the three
   advanced course codes, and whether the requirement is a course count or units.
3. COMP6670 and those three courses: prerequisites, incompatibilities, units,
   permission wording and published offerings for the relevant year(s).

Store source evidence separately from the structured interpretation. A future
import should link each rule to source/year/location, preserve the wording, and
mark it as transcribed or confirmed. OCR is a draft transcription, not approval
to change an eligibility rule. No university-wide scrape is needed.

## Decisions that need care

- John's notes scope the planning work to postgraduate Computing. Do not infer
  undergraduate degree rules or expand to all programs before the first example
  is grounded.
- John reports six sessions. The current dataset supports only its recorded
  offerings. Missing Summer/Winter/etc. entries mean missing data, not proof
  that no courses run then.
- Keep deterministic checks for documented eligibility rules. For the demo,
  a person uses an invited fictional reviewer account to decide exceptions.
  An LLM may eventually explain sourced wording, but must not invent approval
  authority or replace a reviewer with an ungrounded yes/no judgment.
- John's completion note treats a rejection as the end and appeals as external.
  The existing implementation also permits a disputed automatic rejection to
  reach human review. Those are different stages; document the distinction
  before adding any formal appeal flow. An approval currently still requires
  explicit student confirmation of enrolment, as previously agreed.
- The existing fictional transcript has COMP6670 completions in `2026 S1`,
  while the local 2026 catalogue lists COMP6670 in S2 only. This is a fixture
  consistency issue to correct before using it to validate temporal planning;
  it is not evidence of a real ANU offering or an approved exception.
- All new accounts currently receive an experienced Computing (Advanced)
  scenario, not a first-semester record. That is sufficient to inspect the
  current permission flow but does not demonstrate the new-entrant scenario.

## Current boundary

Implemented: verified accounts, fictional records, catalogue search, offering
selection, saved selections, prerequisite checks, scoped permission decisions,
reviewer queues and explicit enrolment with persistence. The local capture
preview is development tooling; it does not validate ownership of a real inbox.

Proposed and not implemented: degree audits, specialisation progress, multi-year
dependency planning, authoritative future offerings and timetable conflict
resolution. Next, review the existing flow locally while collecting the small
source set above, then build/check one planning scenario at a time.
