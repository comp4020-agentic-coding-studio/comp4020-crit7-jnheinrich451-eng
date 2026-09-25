# Structured eligibility and assisted rule extraction

Initial assessment requested on 26 September 2026. This document records the
proposal and its corrections. Implementation progress is tracked in
[`eligibility-implementation-plan.md`](eligibility-implementation-plan.md);
the first unknown-result increment is now implemented, while LLM integration
and the automated demo decision path remain proposed.

The follow-up below revises the initial staffing assumption: the public demo
must provide a useful outcome without depending on a person operating the
reviewer queue. Human review of rule authoring and per-request review are
different activities.

John subsequently agreed both workstreams and selected Llama as the initial
model family. The actionable sequence is recorded in
[`eligibility-implementation-plan.md`](eligibility-implementation-plan.md).
This document retains the earlier assessment and its staffing correction;
the implementation plan distinguishes completed increments from future work.

## Feasibility and existing foundation

Course eligibility is feasible to compute from structured rules and structured
academic records. The main uncertainty is interpreting the source correctly and
obtaining the relevant facts, rather than evaluating a Boolean expression.

The current implementation already has:

- A requirement tree (`all`, `any`, course completion/current enrolment,
  program membership and minimum passed units) in `src/data/requisites.ts`.
- Seventeen 2027 rule interpretations, each bound to a course and source hash,
  in `src/data/enrolment-rules-2027.json`.
- A pure evaluator in `src/lib/eligibility.ts`, supplied with program, passed
  courses and units, failed attempts and scoped current enrolments.
- Persistent source snapshots, source paragraphs, fictional profiles, offering
  identities, applications and decision events.

For example, COMP6242 requires one completion from its ML group AND one from
its programming group. The newly generated fictional profile includes COMP6670
and COMP6710, which satisfy those two groups. That is already a computation.
It does not establish degree progress, seats, timetable fit or official admission.

## What the saved sources require us to represent

| Saved 2027 example | Computable conditions | Evidence or judgement still needed |
| --- | --- | --- |
| COMP6242 | AND of two OR groups of passed courses | A sufficiently complete record |
| COMP8535 | Program membership and passed COMP6 units | Confirm the scope of the published AND/OR grouping; the current prototype has an explicit interpretation |
| COMP8430 | Prerequisites and incompatibility; permission for intensive mode | Whether the selected class is actually intensive; do not infer it from a short session name |
| COMP8620 | Base prerequisite group, incompatibility, permission required | Additional prerequisites for the announced topic, followed by a reviewer decision |
| COMP8800 | Program, completion/concurrent study, unit total, GPA threshold | Defined GPA evidence and calculation policy, project registration and permission |
| COMP8830 | Program, course groups, incompatibilities, permission required | Competitive selection; passing prerequisites does not secure a place |
| MATH6213 | A mark threshold against an accepted equivalent course | Exact mark, confirmed equivalence and the published consultation route |
| MGMT7020 / REGN8014 | No complete check from this collection | Missing requisite section; absence is not evidence of no requirements |

These observations come from the supplied HTML's stored evidence. No ANU course
pages were crawled. Missing undergraduate course pages need not prevent matching
a prerequisite code to a transcript. Equivalence still requires its own evidence;
a shared title or similar code is insufficient.

## Proposed decision model

Extend each requirement result to `met`, `unmet` or `unknown`, with an explanation
and supporting record/source references. AND is unmet if any child is unmet,
otherwise unknown if a child is unknown. OR is met if any child is met,
otherwise unknown if a child is unknown. A known failure may coexist with
unresolved conditions in the detailed report. Missing data must never count as
successful completion or silently disappear from the evaluated rule.

Keep these separate in the result:

1. Academic prerequisite and incompatibility checks.
2. Published permission policy: required, conditionally required, not required
   under the reviewed policy, or unknown.
3. Evidence of a permission decision for this student, course, year and term.
4. Offering availability and external/administrative conditions.

For COMP8620, a report can therefore say: base prerequisites met; permission
required; topic prerequisites awaiting review. An unmet condition does not
automatically establish that a waiver exists or that a request must be rejected.
The current prototype's automatic rejection policy is a separate policy choice,
not something to infer from an LLM's reading of a prerequisite sentence.

Persist reviewed rule versions with course/catalogue year, relevant offering
conditions, exact source hash and paragraph references, interpretation status,
reviewer and time. Keep candidate rules separate from active versions. Preserve
the original paragraph alongside the rule. Each evaluation should retain the
rule version and relevant academic-record snapshot so it remains explainable
after a catalogue or profile update.

Profiles would need optional exact marks, result dates, attempts, credit and
accepted equivalences, plus explicit completeness/provenance. Program/cohort
rules remain separate from offering years. The current pass-code/unit view
cannot settle every GPA, mark or equivalence rule. Use a deliberately fictional
fixture when demonstrating such data; do not invent it for an existing account.

## Initial proposal for a small language model

The per-request reviewer shown below was the initial staffing assumption. The
follow-up section replaces that dependency for the unstaffed public demo.

```mermaid
flowchart TD
  A[Saved published paragraphs] --> B[LLM drafts structured rules and flags ambiguity]
  B --> C[Schema checks and human review]
  C --> D[Versioned approved rules]
  D --> E[Deterministic evaluator]
  F[Relevant academic record and offering] --> E
  E --> G[Condition results, reasons and next action]
  G --> H[Authorised reviewer resolves exceptions and permissions]
```

The model can assist with parsing prose into a constrained rule vocabulary and
pointing to the source of each condition. It should identify unsupported clauses
and unclear grouping instead of completing them by guesswork. The final outcome
comes from the reviewed rules and an authorised reviewer where required.
Extraction needs the public requirement paragraphs; it does not need a student's
email, password or transcript.

The [Ollama structured-output interface](https://docs.ollama.com/capabilities/structured-outputs)
accepts a JSON schema. This makes constrained extraction practical, but valid
JSON does not prove the intended rule was captured. Validate operators, code/year
identity, source references, nonempty groups, completeness and unresolved clauses.
Never execute generated JavaScript or SQL as a course rule. A model's own
confidence score must not promote a draft into an active rule.

[Qwen3-4B-Instruct-2507](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507)
was the initial candidate. John's subsequent choice is Llama, with
`llama3.2:3b` proposed as the first local benchmark baseline; see the agreed plan.
No model has been downloaded, benchmarked or selected for production here.
The current `fly.toml` specifies 256 MB RAM, unsuitable for hosting either model.
Run extraction locally during catalogue maintenance, then deploy the reviewed
rules with the existing web app. A later online assistant could use separate
inference infrastructure if a demonstrated product need justifies it. No training
from scratch or fine-tuning is needed to begin this extraction experiment.

## Recommended bounded next increment

1. Extend the rule vocabulary and unknown-result handling; add source-linked
   explanations. Build a small reviewed reference set covering the difficult
   cases above, not just straightforward prerequisite lists.
2. Add an authoring/review workflow that persists candidate rules, unresolved
   clauses and approved versions. This is useful even with manual entry alone.
3. Trial a small model against the reference set. Keep examples used for prompt
   tuning separate from held-out checks. Assess grouping, omitted conditions,
   invented requirements, unknown handling and resulting student decisions.
   Existing 17 checks are regression examples, not an official gold standard.
4. Measure review effort and local latency/memory before choosing a model or
   hosting arrangement. Initially every extracted rule needs human approval;
   any observed unsupported direct-enrolment outcome blocks promotion of that
   candidate. Passing a finite test set is not a guarantee about all future text.

This stays within the published Crit 7 enrolment slice. Multi-semester scheduling,
specialisation counting and avoiding double-counted credit are a further
constraint-planning problem. Structured eligibility is a useful foundation for
that work, but this proposal does not implement or validate a complete study planner.

## Follow-up: a demo that works without a staffed reviewer queue

John pointed out that nobody is available to act as a reviewer for ordinary
visitors. The current implementation does have this limitation: an application
in `with-convenor` stays there until its assigned authenticated reviewer decides
it. There is no automated approver, escalation worker or background agent.
The published crit does not require a human reviewer for every request.

Recommended revision: provide a clearly labelled automated demo decision path.
Keep the published academic conditions and the prototype's approval policy as
separate, versioned inputs. Permission being required establishes the need for
approval; it does not establish the university's policy for issuing it.

| Evidence and policy | Student-facing result | Available next action |
| --- | --- | --- |
| All required conditions met; permission not required under the reviewed policy | Ready to enrol | Confirm enrolment |
| All required conditions met; permission required; the explicit demo approval policy permits issuance | Demo permission approved automatically | Confirm enrolment using the offering-scoped demo permission |
| A required academic condition is known unmet | Requirements not met, with the exact condition and evidence | Correct the fictional record, supply supporting evidence where applicable, or choose another course; do not imply a waiver automatically exists |
| Evidence is missing or rule meaning unresolved | Assessment incomplete, naming the missing item | Add the specific evidence and rerun; for demonstrating the complete flow, open a separate labelled fictional scenario with that evidence supplied |
| The source requires a discretionary selection or waiver | Automated assessment and recommendation only | Explore an explicit fictional selection/waiver scenario, or use the optional reviewer workflow if someone is actually operating it |

This gives every request a saved assessment and next action. It does not force
unknown evidence into an approval or rejection. A visitor who wants to experience
the complete approval/enrolment flow can use a prepared fictional scenario
without waiting for staff. The scenario result is explicitly a demonstration,
not newly discovered evidence about the published ANU course.

For COMP8620, the initial report can establish that the fictional record passes
COMP6320, that permission is required and that the announced topic's additional
requirements are missing. To demonstrate automated completion, supply a labelled
fictional offering scenario with explicit topic requirements and matching
academic evidence. The engine evaluates those conditions, applies the separate
demo approval policy, issues a demo permission, and waits for the student's
explicit enrolment confirmation. It must not silently assume no topic rules.

Record automated decisions with a system actor such as `Automated demo review`,
policy/rule versions, evidence and time. Never attribute a model's action to
Dr Rowan Ellis. Keep scenarios separate from existing reviewer decisions and
historical requests. Do not grant students a reviewer role or give a model
unrestricted access to the existing decision endpoint. Keep permissions scoped
to student/course/year/term, preserve reload persistence, and prevent duplicate
issuance on retries. These are proposed acceptance checks, not implemented changes.

### Analyst and critic experiment

An analyst can propose a structured assessment; a critic can look for omitted
clauses, unsupported equivalence, grouping errors and mismatched course/year.
Both should first inspect the source independently. The critic should provide
specific evidence or a counterexample, rather than merely agree/disagree.
A bounded correction pass can revise the draft. The decision engine then
checks the evidence against the approved rule and demo policy. A model judge
may summarise the comparison, but agreement or a confidence score cannot fill
a missing field or authorise an otherwise unsupported exception.

Research supports investigating this rather than assuming a guaranteed gain:
[Du et al.](https://arxiv.org/abs/2305.14325) report improvements on tested tasks;
[Choi et al.](https://arxiv.org/abs/2508.17536) find that voting explains much of
debate's gains in their benchmarks; [Wynn et al.](https://arxiv.org/abs/2509.05396)
show cases where peer discussion changes correct answers into incorrect ones.
None of these studies validates decisions for our enrolment data. Compare an
analyst alone, independent assessments and analyst/critic on held-out course
cases at comparable inference budgets before adding a judge or repeated debate.
Track erroneous approvals, omitted conditions, unknown handling, latency and
cost. Missing evidence, disagreement or a model timeout must yield a saved
actionable result, not an indefinite processing spinner.

### Useful intermediate output

Present a concise assessment report made from explicit, checkable outputs:
source and catalogue version; each requirement; matching academic evidence;
met/unmet/unknown; unresolved assumptions or conflicts; recommendation; next
action. A student should be able to expand a source reference or correct a
fictional fact. Preserve which statements are model proposals, validated checks
or scenario assumptions. Expose actual completed stages (source loaded, checks
evaluated, discrepancy found, result saved), with a timeout/retry result if
inference fails. Summaries should reflect recorded outputs; no invented live
progress or claim that a simulated decision came from a human reviewer.

Build the assessment report and reproducible demo decision path first. Evaluate
the analyst/critic aid afterwards. Reviewing the rule catalogue during project
development does not require a human to process every visitor's request.
