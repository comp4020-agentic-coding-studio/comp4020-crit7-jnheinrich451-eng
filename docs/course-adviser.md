# Preference-aware course adviser

Implemented in My profile, inside Course suggestions. A bounded helper for the
VCOMP/Artificial Intelligence planning example, not a general chat service,
permission reviewer or graduation auditor.

## Student flow

Write study interests, choose a preferred total unit limit, then Ask adviser.
The response and preference survive reload. Changes to the record, semester,
saved/confirmed courses, approval limit or sources invalidate old advice. Ask
again for the new context; GET never calls a model. Use standard suggestions
dismisses the preference while preserving the exchange.

The explicit unit field sets the preference; a number in the message does not.
Confirmed and saved courses reserve capacity. Personal ceilings below 24 units
are separate from the institutional load evaluator, whose normal limit is 24.
The adviser never drops courses or grants overload approval. Saving/enrolling
still requires the student's explicit actions through the existing course flow.

## Model and rule boundary

1. The existing planner identifies individually eligible, offered, fixed-unit
   candidates. Permission, uncertain evidence and unavailable offerings retain
   their existing next-step sections.
2. Supply at most 24 ready courses, in deterministic priority order, within a
   24,000-character source-passage budget. The snapshot records omissions.
   Llama receives only public course passages and the student's preferences,
   not account identifiers, names, emails, grades or transcript rows.
3. Llama selects up to three passage IDs through Ollama's JSON-schema format.
   Validate IDs, deduplicate courses, and require a shared subject word between
   each passage and the preference. Generic enrolment/difficulty words do not
   count. Display the original excerpt; accept no generated quotation or verdict.
4. Re-run the planner with the chosen priorities, personal unit ceiling, current
   prerequisites, concurrent incompatibilities, approvals, reserved load and
   degree/project-space checks. An individual match may not fit the combination;
   display its exclusion reason and source link.

The conservative relevance filter can miss synonyms, short acronyms and
non-English interests. Shared words do not prove semantic relevance; Llama can
misread negation or nuanced preferences. Inspect the original excerpt, update
preferences or return to standard suggestions. No model output can change an
academic fact, enrolment, course rule or approval.

## Persistence and failure handling

Generated migration 0010 adds `adviser_runs`: preferences, target units, context
hash, source/record snapshot, attempted model tag/digest, validated response,
timing and status. `study_plan_events` records start/finish/dismiss/interruption.
Existing academic tables are unchanged.

One synchronous POST calls the configured service with a 45-second total
deadline and no automatic retries, then returns 303. Forms work without
JavaScript. Two requests can be in flight across the database; one per student.
The per-student limit is 12 new requests per 15 minutes. Identical successful
retries reuse the result; failures can retry. A 60-second lease recovers an
interrupted request. Conditional completion cannot resurrect a dismissed or
recovered run. The hosting proxy must allow this bounded POST duration; a
durable asynchronous job system is not implemented.

Unavailable, invalid or timed-out inference produces a saved rule-based fallback
using the unit preference. Failure categories distinguish transport, response
validation and size. Raw model prose is neither stored nor rendered. Without a
configured service, the page explicitly offers Apply unit preference and states
that AI matching is unavailable. No model provenance is claimed for a skipped call.

## Local and deployed setup

Local preview compose connects to Windows Ollama through
`http://host.docker.internal:11434`, using `llama3.2:3b`. Keep Ollama running.
See `config/adviser.env.example` for server-side variables. Browsers never call
the model directly.

Fly does not contain the model, and its localhost is not the Windows PC.
Leave `OLLAMA_BASE_URL` unset there until a separate private, reachable inference
service is selected and tested. Rule-based planning remains usable. This change
does not deploy anything or expose the local model publicly.

API references: [structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
and [generate endpoint](https://docs.ollama.com/api/generate). Schema compliance
alone does not establish advice quality.

## Reproducible checks

`pnpm check` uses a private HTTP model fixture, never a real model. Opt-in live
check: `node --import tsx scripts/benchmark-adviser.ts` with `OLLAMA_BASE_URL`
configured. It uses a generated fictional profile and four fixed preferences,
reporting digest, latency, checked options and pass/fail. Set
`ADVISER_BENCHMARK_DEBUG=1` to print these fictional benchmark responses.

The first quotation-generating design failed all four cases: Llama duplicated
courses and invented/paraphrased quotations. Passage IDs removed that failure;
the relevance filter removed spurious matches for difficulty/approval requests.
Four development cases passed with Llama 3.2 3B digest
`a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`.
They are smoke cases used during development, not an independent accuracy
benchmark. Broader held-out evaluation and the separate prerequisite-rule
extraction benchmark remain future work.
