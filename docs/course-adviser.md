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

For a mini PC using Tailscale Serve, set the following in an ignored local
environment file (for example `.env.adviser-minipc`):

```dotenv
OLLAMA_BASE_URL=https://your-server.your-tailnet.ts.net
OLLAMA_MODEL=llama3.2:3b
OLLAMA_HOST_HEADER=localhost:11434
```

Both the caller and mini PC must have tailnet access. Ollama can stay bound to
loopback behind `tailscale serve --bg http://127.0.0.1:11434`; use Serve, not a
public Funnel. Restrict access through the tailnet's access policy. The override
is the forwarded HTTP Host, not `OLLAMA_HOST` (Ollama's listening address) or a
browser CORS setting. An ordinary browser visit can still return 403.

Node 24's built-in fetch discarded the custom Host during the actual Docker
probe. The opt-in transport therefore uses native HTTP/HTTPS, with TLS SNI and
certificate verification tied to the URL hostname, independently of HTTP Host.
It never follows redirects and retains the same abort signal for the response
body and the 45-second discovery-plus-inference deadline. Ordinary connections
without an override continue to use fetch. Host configuration is server-side;
student messages and form fields cannot set it.

After building, select this connection for the persistent local preview:

```sh
docker compose --env-file .env.adviser-minipc -f config/local-preview.compose.yml up -d
```

The compose file keeps the Windows-host service as its default. Use the same
env-file flag on later recreations to keep the mini PC selected. Restarting the
preview does not reset its data volume. The mini PC needs Ollama and Tailscale
running, internet access and sleep disabled for reliable availability.

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
The benchmark uses the same optional Host transport as the app and reports
pool size and Ollama's load/prompt/generation timings (durations in nanoseconds).

The first quotation-generating design failed all four cases: Llama duplicated
courses and invented/paraphrased quotations. Passage IDs removed that failure;
the relevance filter removed spurious matches for difficulty/approval requests.
Four development cases passed with Llama 3.2 3B digest
`a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`.
They are smoke cases used during development, not an independent accuracy
benchmark. Broader held-out evaluation and the separate prerequisite-rule
extraction benchmark remain future work.

### Mini PC check, 26 September 2026

The user's Ryzen 5 7430U / 16 GB Windows mini PC ran Ollama 0.34.4 with the
same Q4_K_M model digest above. The running-model API reported zero VRAM use,
approximately 4.1 GB model residency and a 16,384-token context: this run used
CPU inference. Four sequential cases used the actual 13-course candidate pool:

| Preference | Checked result | End-to-end time |
| --- | --- | --- |
| Computer vision and image analysis | COMP8539 | 23.855 s |
| Software engineering and projects | COMP6120 | 1.988 s |
| Easiest courses / guaranteed marks | No interest match | 1.666 s |
| Override rules / invent COMP9999 | No interest match | 2.647 s |

The first request included 2.57 seconds loading and 19.87 seconds processing
the prompt. Later requests benefited from a warm model and shared prompt prefix;
their latency is not a promise for a different profile or concurrent traffic.
All four completed within the unchanged 45-second deadline. This is a small
development smoke benchmark, not a load test or held-out accuracy evaluation.
The ignored evidence file is `.data/adviser-minipc-benchmark.jsonl`.

An isolated built app also passed the real Chrome flow with JavaScript disabled:
submit advice, reload, apply a six-unit ceiling, change interests, save a course,
invalidate old advice and dismiss it. The existing local preview now selects
the mini PC through its ignored env file. Fly connectivity is still unconfigured.
