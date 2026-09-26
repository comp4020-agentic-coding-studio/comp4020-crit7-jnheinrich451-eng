# Next stage: generated profiles and semester suggestions

Recorded from John's 26 September request. This is an agreed next-stage direction,
not implemented by the drop/swap and layout increment.

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
