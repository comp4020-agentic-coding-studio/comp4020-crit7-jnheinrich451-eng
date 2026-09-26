# Generated profiles and semester suggestions

Implemented following John's 26 September request to proceed. The original
direction below remains the design rationale; this section states what is built.

## Rule-driven profiles (v2, 27 September 2026)

New registrations now receive `vcomp-ai-2027-s2-v2` from `generateProfile`, a
seeded search over the reviewed 2027 rules. Each course is placed only where the
gate finds its saved prerequisites met by earlier results or allowed concurrent
study, in a semester matching its saved 2027 offering pattern. Permission-only,
unreviewed, conflicting, variable-credit and project courses are excluded.
Loads are a permutation of 24/18/18, lower-level credit stays within 48 units,
and marks run 65-92 (Credit to High Distinction) with a GPA of at least 6 over
the first 48 units. The snapshot saves `remaining`, the planner's own reading of
what the record leaves outstanding, and My profile shows "still needed" from
live progress. Professional practice stays outstanding while neither COMP6250
nor COMP8260 has a 2027 offering. Across 300 seeds the generator produced 300
distinct transcripts. The v1 example below is kept as `generateAuthoredProfile`
for accounts created before this change, test fixtures and the benchmark.

## Implemented first example (v1)

Registrations before 27 September 2026 received `vcomp-ai-2027-s2-v1`, a reproducible fictional VCOMP
profile assigned ARTIF-SPEC under the supplied 2027 source interpretations.
The scenario starts on 1 July 2027, with results completed through 2027 S1.
Its complete history uses deliberately lighter semesters:

| Semester | Completed fictional courses | Units |
| --- | --- | --- |
| 2026 S1 | COMP6442, COMP6262, COMP6528, COMP8610 | 24 |
| 2026 S2 | COMP6670, COMP6250, COMP8280 | 18 |
| 2027 S1 | COMP6445, COMP6320, COMP8600 | 18 |

The 60 units include 18 at COMP8000 level and 42 at lower levels. This leaves
room within 96 units for the 24-unit project, an advanced AI course and another
six-unit elective, subject to the remaining checks. It does not establish
approval, actual future availability or a graduation date. An earlier 72-unit
draft was rejected after Claude's source review found it had 66 lower-level
units, incompatible with fitting the 48-unit advanced minimum within 96.

Marks derive from template ID, the generated profile seed and course code
(72–84, with matching D/HD grades). Attribution to VCOMP/ANU is explicitly
fictional. No existing grade-only record receives invented marks. The template
validates earlier-completion/corequisite chains, incompatibilities, source hashes,
unique source versions, credit values, the load and level mix. It verifies actual
saved class rows for 2027 S1. All 2026 availability is an explicit assumption;
COMP6250 is specially labelled because its 2027 page lists no current offerings.
COMP8280 counts as separate completed study, never a substitute for professional
practice. COMP8490's ambiguous programming condition stays unknown.

My profile contains course suggestions and partial requirement progress; My courses
links back to it. The reviewed program/AI group definition is
`src/data/study-planning-2027.json`. Source hashes must match the persistent
catalogue. Course gates retain their own source-bound interpretations. Suggestions
prioritise missing requirements and helpful prerequisites, check the selected
semester and compose a compatible load within confirmed/approved limits.
Saved candidates reserve suggestion space but never satisfy completed-credit
requirements. Hypothetical credit allocation only avoids redundant recommendations
and reserves degree space for the compulsory project; it never enters eligibility.

The progress calculation allocates core, professional practice, project, AI,
further and elective buckets without duplicate course credit. AI foundation
credit is capped at 12; at least 12 advanced AI units remain necessary. The
48-unit COMP8000 threshold is an overlay, not another bucket. Repeated project
credit counts only for two distinct consecutive 12-unit semester results.
This deterministic allocation is an illustration, not an optimised credit audit.

New `study_plans` and `study_plan_events` tables persist immutable generation
snapshots and explicit preference changes (migration `0009_remarkable_kree.sql`).
Registration writes the account, generated results, plan and creation event
atomically before email delivery. Verification remains mandatory. Existing
accounts retain their complete state; existing VCOMP users can save an AI focus
and semester using their actual stored fictional history. Reading a profile
does not create metadata or rewrite results. Suggestions are recomputed from
current state, rather than storing stale recommendations.

Planning choices are 2027 S2, 2028 S1 and 2028 S2. The latter two use indicative
class rows within the 2027 pages; their links lead to evidence, with no enrolment
or save-course controls. They do not fabricate a 2028 catalogue or copy 2027
permissions. Find courses uses a saved preference only for a supported catalogue
year; explicitly choosing All terms still works.

GPA, supervisor approval, project registration, external-credit attribution,
substitutions and graduation remain unverified. The normal course gate still
does not authorise enrolling again after a completed research-project instance;
the guidance identifies required continuation and directs students to the program
team. Other programs and specialisations remain outside this first increment.
The base planner and academic template remain deterministic. The later optional
preference adviser can prioritise ready courses using Llama; the same planner
rechecks the combination. See `docs/course-adviser.md`. No LLM generates facts
or decides eligibility, permission or enrolment.

## Original agreed direction

The prototype should generate a coherent, labelled fictional academic scenario
from a template, then suggest useful courses using that scenario. Suggestions
need not guarantee graduation on time. They should still make sense if the
student takes longer, and leave room for personal choice when no course needs
priority in the selected semester.

## Proposed starting point

- Degree: Computing (Advanced), using the supplied 2027 catalogue interpretations.
- Assign and display a specialisation supported by the matching source year.
- Provide a complete fictional 2026 history covering both semesters.
- Preset 2027 S1, then let the student choose courses for 2027 S2.
- Clarify in the template whether 2027 S1 is completed study with results or
  current confirmed enrolment. When planning S2, only completed results can
  satisfy requirements for prior completion; never turn enrolments into passes.
- Keep the academic rule year, scenario date and selected offering year/term as
  separate fields. The existence of 2027 course pages does not establish the
  actual degree rules of a real student who commenced in 2026. This is a
  catalogue-based fictional scenario, not an imported commencement-year audit.

John's earlier preference for a 2026 planning example is superseded by this
proposed 2027 S2 demonstration. Existing profiles must not be silently rewritten.

## Template and generation rules

Create versioned templates with degree, specialisation, scenario date, planning
term, past results, confirmed courses, source hashes and an explanation of how
the scenario was assembled. Derive a repeatable fictional record from a template
identifier and seed; identical inputs should produce identical academic facts.

Validate generated history in chronological order against the source-bound
rules that are actually available. Check prerequisites, incompatibilities,
term offerings, credit values and normal load limits. Never invent an earlier
offering because the course appears in 2027; use an explicitly labelled historical
scenario assumption where historical evidence is unavailable. Prefer complete,
consistent templates over randomly selecting unrelated course results.

Include exact fictional marks and explicit program/institution attribution so
overload checks have usable evidence. Labels must make clear that these are
generated facts, not ANU grades. Generate mark/grade combinations consistently;
completed courses and current enrolments remain separate. Review the final
template manually and save the rules used to validate it.

For new accounts, persist the chosen template/version and generated record.
Existing accounts keep their history and requests; an explicit later migration
or opt-in new scenario needs a separate design, not a boot-time reseed.

## Suggestion logic

Use the existing deterministic eligibility engine and published offerings to
filter candidates for the chosen term. Apply versioned degree/specialisation
membership and requirement interpretations separately from basic enrolment
eligibility. A mentioned course link alone is not an encoded degree rule.

Prioritise courses that address a recorded requirement and unlock later study,
especially prerequisites with limited semester availability. Explain each
suggestion in a short sentence: what it contributes, why this semester is useful,
and which later option it enables. Avoid double-counting overlapping requirement
groups. Retain unknown results when the source cannot establish an obligation.

Show a small number of useful suggestions within remaining load capacity, along
with alternatives and **Choose at your preference** when no source-supported
priority applies. Permission-required courses can be suggested with their request
step visible; unavailable courses cannot be presented as enrol-now options.
Later-semester availability must remain indicative where that is all the source
supports. A longer completion path is acceptable: explain implications without
claiming a guaranteed graduation date.

Suggestions never add, swap or drop courses automatically. Saving a suggestion
creates a candidate; ordinary confirmation, course permission and load checks
still apply. LLM wording may be evaluated later, but a model must not invent
degree requirements, offering dates, grades or approvals.

## First acceptance example

Prepare one reviewed VCOMP template, one source-year specialisation, a coherent
2026 history and a clearly defined 2027 S1 state. A newly generated student opens
My profile and sees the assigned scenario and recommendations for 2027 S2.
Each recommendation links to its source-supported reason and course page.
Changing a candidate or deferring study recalculates useful later options without
rewriting historical results or promising on-time graduation. Test at least one
prerequisite bottleneck, a missing source condition, a permission-required course,
an overlap between requirement groups and a student whose plan extends later.
