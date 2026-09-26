# Process overview

This rebuild started when my COMP8620 permission request showed up under
COMP9095, with no useful feedback. The prototype brings eligibility checks,
course suggestions, permission applications and overload requests into one
enrolment workflow. Students get an automatic assessment straight away;
uncertain cases can optionally go to a human reviewer. Course information comes
from ANU's published pages; every academic record is clearly fictional.

## How I got there

I built it in layers, starting with the permission problem. In `CLAUDE.md` I
steered the harness toward routing by course ID, keeping decision histories and
making students confirm enrolment explicitly. Rather than trust any ANU-looking address, I chose SMTP
verification to prove ownership, then worked through its setup
([`20fb86f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/20fb86f)).

Crawling was off the table, so I downloaded ANU's degree, specialisation and
course pages by hand. The same courses kept turning up under different
specialisations and changing between years, so each course is identified by
code and year, and prerequisite rules are structured to keep uncertainty
visible. The eligibility checks read from that
persistent catalogue
([`978391a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/978391a),
[`33722e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/33722e3)).

Next I asked for invited reviewers to handle unresolved applications, then
overload, drop and swap. The load limit counts units, not courses. I also
reworked profile generation around earlier semesters, degree requirements and
specialisation, so suggestions build on a fictional history that makes sense
([`4fbd143`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/4fbd143),
[`88f6f50`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/88f6f50),
[`b4e9474`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/b4e9474)).

I explored LLM review, but permission and overload decisions stayed rule-based.
Llama got a narrower job: matching interests to course evidence, with the
planner rechecking its suggestions. When it started inventing quotations, I
switched it to picking source passages instead of writing evidence. To avoid
paying for inference hosting, I set up my mini-PC to serve Llama privately;
connecting Fly to it is still to do
([`09ed6c1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/09ed6c1),
[`5a3a6d0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/5a3a6d0)).

Docker test runs and browser walkthroughs checked each increment;
[PROCESS_RECORD.md](PROCESS_RECORD.md) keeps the corrections and outstanding
deployment checks.
