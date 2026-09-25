# Eligibility foundation and automated demo decisions

Initially recorded 26 September 2026, before implementation. John agreed both
workstreams and selected Llama as the initial model family. The status below
distinguishes completed work from planned increments. These are not additional
assignment requirements. The
[published Crit 7 spec](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json)
remains the contract. Requests default to a saved automatic demo assessment. The
optional staff route still needs its assigned reviewer; its owner can explicitly
replace a pending review with an automatic assessment.

The two workstreams share one rule engine. They do not require separate Git
branches or simultaneous edits. The earlier analysis and staffing correction
are in [`eligibility-feasibility.md`](eligibility-feasibility.md).

## Current implementation status

The first foundation increment is implemented in `src/lib/eligibility.ts`:
three-valued condition results, nested AND/OR semantics, explicit unknown clauses,
record completeness and evidence/source references. Empty groups and absent facts
in a partial record cannot become successful checks. The database defines a
complete fictional scenario; this flag does not claim verified university data.

2027 COMP8620 now includes an unknown condition for absent topic requirements.
Its base prerequisite can be met while its overall assessment remains incomplete.
Unknown is displayed separately from unmet and is not itself a rejection reason.
The existing first-round policy can still reject a known unmet condition or
incompatibility in the optional staff workflow. The automatic demo policy does
not approve the unresolved published COMP8620 topic; the isolated scenario below
supplies explicitly fictional conditions for its complete example.

John's subsequent workflow correction is also implemented: offered courses whose
rules have not been interpreted accept an assessment request. The first round
saves unknown conditions and available source references; it does not infer that
permission is required or refuse submission solely because a rule is missing.
The interface and submission endpoint share the same eligibility-based request
guard, with offering availability checked separately. A pending-request notice
appears on the course, request, My requests and My courses pages only while the
matching request has `with-convenor` status. It disappears on the next page load
after approval or either type of rejection. Pending/approved duplicate submissions
return the existing request; a rejected request remains in history if a new one
is submitted. The subsequent automated increment is described below.

`src/data/eligibility-reference.json` contains three source-bound reference cases
(COMP6242, COMP8620, MGMT7020), with six fictional record scenarios. The missing
MGMT7020 section is now also an explicit unknown entry in the full course coverage.
These cases exercise the prerequisite evaluator, not complete enrolment decisions.
They are not yet a held-out LLM benchmark. Conditions and source references are
saved in the existing application check snapshots and survive a reload. The
full versioned rule-authoring workflow remains outstanding. The follow-up added
source-bound interpretations or gaps for all 80 course versions, conditional
permission, course-list credits, course counts, program negation, explicit academic
career and conservative alternative-reading evaluation. See `catalogue-data.md`
for the 62 encoded / 16 partial / 2 missing-source breakdown and scope limits.
The initial foundation required no migration. The subsequent report increment
uses generated migration `0006_smiling_redwing.sql`; historical snapshots without
statuses or reports still render correctly.

The first B increment is implemented in `src/lib/demo-assessment.ts` and the
existing request store. `demo-permission-v1` originally saved the rule tree and digest,
record, offering, gate, request reason, explanation, outcome and next steps in
an application report. Submission, assessment and result events are transactional.
Automatic met, unmet and incomplete results are immediate, with no fabricated
processing stage and no claimed convenor decision. Staff decisions and older
requests retain their existing workflow. Converting a pending request is an
explicit owner action; its old submission checks and events are retained.

`/demo/` provides the first complete example: COMP8620 2027 S2, the source-bound
base prerequisite, a fictional COMP6670 topic prerequisite, a separate fictional
record, scenario permission, then explicit confirmation. The scenario permission
cannot authorise profile enrolment. Confirmation is persisted as a scenario event
and leaves the student's transcript, selections and enrolments unchanged.
Identical automatic submissions reuse their report; an approved scenario is
reused for that owner. No live model inference is required.
Automatic issuance requires a versioned source interpretation or the isolated
scenario. Legacy 2026 transcriptions remain available for staff review and do not
acquire automatic approval from the new policy. Existing human approvals remain
valid for their original offering. Change the policy identifier when changing
decision semantics; previously saved reports retain their original version.
New assessments now use `demo-permission-v2`, which also allows permission when a
published conditional trigger applies and all recorded requirements are met.
The wider source-authored cases are in `spec/catalogue-rule-coverage.test.ts`;
no live model or model benchmark has been added by the coverage work.

### Student explanations: context, claims and decisions

John identified unconstrained student messages as another variable. Do not assign
a percentage weight to prose: persuasion is not evidence. The current form asks
the student to choose recorded checks, record correction, equivalent study or an
exception. The latter three produce an incomplete result with a relevant evidence
or authority requirement; they cannot create an automatic approval. The original
explanation remains visible as self-reported context. This first implementation
does not semantically interpret its text or claim to have verified it.

A later Llama pass may draft a structured list of claims and questions, retaining
exact supporting spans from the statement. Those drafts remain unverified and
must not become transcript entries or override published rules. Include statement
variants in the later benchmark: terse/verbose versions of the same case, claimed
passes absent from the record, irrelevant text, ambiguous codes, fake staff
authority and embedded approval instructions. Compare claim fidelity and handling
separately from eligibility; record false approvals and unsupported facts. The
current deterministic tests confirm that wording alone cannot change the result.

Local runtime verified after installation: Ollama 0.34.4 with `llama3.2:3b`
(`a80c4f17acd5`) returned `READY` to a bounded local probe. `ollama ps` reported
100% GPU, 2.3 GB and a 2,048-token context. The cold call took about 38 seconds,
including about 20 seconds loading; this one short response is a setup check,
not a course-rule accuracy or throughput benchmark. Model storage remains
`C:\Users\12856\.ollama\models`, outside the repository.

## A. Structured rules and a reference dataset

Extend the existing requirement tree and pure evaluator to return `met`, `unmet`
or `unknown` for each condition, with source and academic-evidence references.
Missing data and unresolved meaning remain visible. A known unmet condition can
coexist with unknown conditions in the report. Preserve the distinctions between
academic eligibility, permission requirements, approval and offering availability.

Represent conditional permission, exact marks, defined GPA evidence, accepted
equivalence, record completeness and conditions requiring discretion as needed
by the reference cases. Do not calculate a GPA from unspecified grading policy,
infer an intensive class from its session length or treat a missing paragraph
as permission to enrol. Program/cohort requirements remain separate from the
selected offering's year and term.

Manually author and review a bounded reference set from the downloaded pages:

| Cases | What they exercise |
| --- | --- |
| COMP6242, COMP8535 | Nested AND/OR groups and ambiguous grouping |
| COMP8430 | Permission conditional on an evidenced teaching mode |
| COMP8620 | Base prerequisites plus missing topic-specific conditions |
| COMP8800, COMP8830 | GPA/project evidence and discretionary or competitive selection |
| MATH6213 | Exact marks, equivalence and consultation conditions |
| MGMT7020, REGN8014 | Missing prerequisite evidence |

Give each case source hashes and paragraph references, an explicit interpretation
or unresolved issue, fictional record variants and expected condition results.
The active rule interpretations supply regressions, not an official gold
standard. Preserve ambiguous source meaning rather than manufacturing one answer.
No additional ANU course crawling or training dataset is required to begin.

Persist candidate and active rule versions separately. An assessment retains
the selected rule, relevant record snapshot and offering identity. Later profile
or catalogue changes must not rewrite the explanation for a historical decision.
Any persistence changes go through `schema.ts` and generated migrations.

After this reference set exists, benchmark Llama drafting schema-constrained
rules from the same source paragraphs. Keep prompt-development cases separate
from held-out checks. Measure missed/invented clauses, grouping, unsupported
equivalence, unknown handling, resulting false approvals and review effort;
also record runtime, memory use and failures. Record dataset, prompt, schema,
model digest, quantisation and inference settings for reproduction. No accuracy
claim is justified before these checks. A schema-valid draft remains a candidate.

## B. Assessment reports and a complete demo path

The workflow must cover the general enrolment cases, not only the blanket
permission example:

| Offering and assessment | Entry point |
| --- | --- |
| Offered, requirements met, no permission required | Confirm enrolment |
| Offered, permission required for everyone | Request permission |
| Offered, known unmet requirements | Request assessment of an exception or disputed record; no guaranteed waiver |
| Offered, uncertain or uninterpreted requirements | Request assessment with explicit unknowns |
| No usable offering for the selected year/term | Read course information or choose another offering; no enrolment request |
| Request pending for the same student/course/year/term | Show the reminder and existing request; do not create a duplicate |
| Request approved or rejected | Show the result/history and remove the pending reminder |

Build the student report on A's evaluator. Show each requirement, matching
evidence, result, source reference and next action. Save the assessment and real
stage events so a reload preserves the explanation. Intermediate output means
checkable findings and concise explanations, not invented processing activity.

Version an explicit demo approval policy separately from ANU's published rules:

- When all relevant conditions are met and the demo policy permits issuance,
  issue an offering-scoped demo permission automatically. Enrolment still needs
  the student's confirmation.
- When conditions are unmet, identify them and provide an applicable next action.
  Do not promise that a waiver exists.
- When evidence is unknown or discretion is required, save an incomplete
  assessment/recommendation with the specific missing item. A separate, clearly
  labelled fictional scenario can demonstrate the complete decision path.

Use COMP8620 as the first complete example: supplied base prerequisites, explicit
fictional topic conditions, matching fictional academic evidence, automated demo
permission, then confirmed enrolment. The scenario's assumptions must not alter
the published course evidence or silently replace an existing student's record.

Use a system actor such as `Automated demo review`; do not attribute the decision
to Dr Rowan Ellis or grant students reviewer access. Preserve historical human
decisions and student/course/year/term scope. Repeated submissions or retries
must not issue duplicate permissions or enrolments. Visitors must be able to
complete the labelled scenario without anyone staffing the reviewer queue.

## Sequence and acceptance

1. Implement A's smallest useful rule extension, source-linked results and manual
   fixtures. Check nested unknown semantics and retain existing year/identity
   protections before expanding the vocabulary.
2. Implement B's report and COMP8620 scenario end to end. Check met, unmet and
   unknown paths, explicit enrolment, scope isolation, idempotency and reload
   persistence through the real HTTP flow.
3. Complete the difficult reference cases and run A's extraction benchmark.
   Model setup and benchmarking do not block B's deterministic demo decisions.
4. Only then compare one model pass with independent drafts and analyst/critic
   passes at comparable inference budgets. Keep any useful model aid bounded,
   validated and optional; model agreement does not resolve absent evidence.

Each implementation increment must pass `pnpm check` under the Node/pnpm versions
in `mise.toml`, plus relevant browser checks. Preserve the no-JavaScript form
flow. If a later model call fails, save an actionable failure and permit retry;
the core rule-based scenario remains usable without a model service.

## Llama, the runtime and the harness

These are three different components:

| Component | Responsibility | Initial location |
| --- | --- | --- |
| Llama weights | Learned language model used to draft rules | John's PC |
| Ollama runtime | Loads the weights and serves a local inference API | John's PC |
| Application harness | Supplies evidence, calls roles, validates output, limits retries and stores results | Local development; deployable application code on Fly |

Use ordinary TypeScript modules for the initial harness; a separate agent
framework is not required for a bounded extraction/critique workflow. One loaded
model can serve analyst and critic sequentially with separate prompts. Two roles
do not require two model downloads and do not establish independent correctness.
The deterministic evaluator and explicit policy remain the decision authority.

Proposed first baseline: **Llama 3.2 3B Instruct via Ollama `llama3.2:3b`**. The
[current package](https://ollama.com/library/llama3.2:3b) is approximately 2.0 GB,
Q4_K_M, and uses the Llama 3.2 Community License. This is an open-weight model,
not the Apache-2.0 Qwen candidate from the earlier proposal. Pin the actual model
digest when downloaded; the tag alone is not an immutable experiment record.
Treat 3B as an inexpensive baseline, not a claim that it can interpret all rules.

Initial read-only hardware inspection on 26 September found 64 GiB RAM and an NVIDIA
RTX 5070 Ti with 16,303 MiB VRAM. These resources make a small quantised local
trial plausible. At that point Ollama had not been installed; the later setup
check is recorded above. Model quality has not been benchmarked.

For the later local trial, install [Ollama for Windows](https://docs.ollama.com/windows)
and download with the [documented CLI](https://docs.ollama.com/cli):

```powershell
ollama pull llama3.2:3b
```

Ollama manages the weights outside this repository; no manual upload into
`assets/` is needed. The original planning turn did not install or run the model;
John subsequently installed it and the setup check is recorded above. The local API supports
[JSON-schema outputs](https://docs.ollama.com/capabilities/structured-outputs);
schema compliance still needs semantic checks. That documentation currently
excludes Ollama Cloud from structured-output support, so do not assume a cloud
endpoint will have identical capabilities.

## Deployment boundary

Keep the public website, SQLite data, rule engine and application harness on the
existing Fly app. Its current configuration has 256 MB RAM and a 1 GB volume;
it cannot host this model alongside the app. Preserve the course-managed machine
shape. Fly's [GPU documentation notice](https://fly.io/blog/transcribing-on-fly-gpu-machines/)
now marks its GPU product deprecated; the older deployment tutorial on that
page is not evidence of current GPU availability.

The first public demo uses persisted reviewed rules and scenario evidence, so
John's PC does not need to stay online. Local Llama is initially a catalogue
authoring and benchmark tool. If live model assistance later proves useful,
the server-side harness can call a separately hosted inference endpoint; select
and measure that service then. Do not make browsers contact John's local model
or treat `localhost` on Fly as his PC. Keep credentials server-side and bound
model calls by time and retry limits. No additional hosting service is selected
or required for the first two increments.
