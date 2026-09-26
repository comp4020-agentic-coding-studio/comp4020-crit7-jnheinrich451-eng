# Process overview

My COMP8620 permission request appearing under COMP9095, with no useful feedback,
motivated this rebuild. It brings academic eligibility checks, course recommendations,
permission applications and overload requests into one enrolment workflow.
Automatic assessments assist students; uncertain cases and exceptions have an
optional human-review route. The prototype uses published ANU course information
and clearly fictional academic records.

## How I got there

I built in layers, starting with the permission problem and the spec's persistence
requirement. I guided the harness in `CLAUDE.md` toward course-ID routing, saved
decision histories and explicit enrolment confirmation. I chose SMTP ownership
verification over simply accepting an ANU-looking address, then worked through
its configuration ([`20fb86f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/20fb86f)).

A rebuild needed real catalogue evidence. With automated crawling ruled out,
I manually downloaded ANU degree, specialisation and course pages. Overlaps and
year changes prompted separate course/year identities and structured prerequisite
rules that preserve uncertainty. These became the persistent catalogue used
by eligibility checks
([`978391a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/978391a),
[`33722e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/33722e3)).

I next requested invited reviewers for unresolved applications, then overload,
drop and swap functions. The load limit counts units, not courses. I also revised
profile generation around prior semesters, degree requirements and specialisation,
so suggestions use coherent fictional histories
([`4fbd143`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/4fbd143),
[`88f6f50`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/88f6f50),
[`b4e9474`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/b4e9474)).

I explored LLM review, but permission and overload decisions remain rule-based.
Llama instead matches interests to course evidence, with suggestions rechecked
by the planner. Invented quotations prompted selecting source passages rather
than generating evidence. To avoid paid inference hosting, I configured my
mini-PC to serve Llama privately; Fly connectivity remains pending
([`09ed6c1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/09ed6c1),
[`5a3a6d0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/5a3a6d0)).

Docker checks, persistence tests and browser walkthroughs verified these increments;
[PROCESS_RECORD.md](PROCESS_RECORD.md) records the corrections and remaining deployment checks.
