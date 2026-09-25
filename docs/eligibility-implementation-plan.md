# Eligibility foundation and automated demo decisions

Recorded 26 September 2026, before implementation. John agreed both workstreams
and selected Llama as the initial model family. These are planned increments,
not implemented features or additional assignment requirements. The
[published Crit 7 spec](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json)
remains the contract. The current application still needs its assigned reviewer
to decide requests in `with-convenor`.

The two workstreams share one rule engine. They do not require separate Git
branches or simultaneous edits. The earlier analysis and staffing correction
are in [`eligibility-feasibility.md`](eligibility-feasibility.md).

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
The existing 17 rule interpretations supply regressions, not an official gold
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

Read-only hardware inspection on 26 September found 64 GiB RAM and an NVIDIA
RTX 5070 Ti with 16,303 MiB VRAM. These resources make a small quantised local
trial plausible; model quality, GPU utilisation and latency have not been tested.
Ollama was not found on PATH or at its default per-user installation location.

For the later local trial, install [Ollama for Windows](https://docs.ollama.com/windows)
and download with the [documented CLI](https://docs.ollama.com/cli):

```powershell
ollama pull llama3.2:3b
```

Ollama manages the weights outside this repository; no manual upload into
`assets/` is needed. No installation, model download, inference or deployment was
performed when recording this plan. The local API supports
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
