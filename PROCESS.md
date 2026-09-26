# Process overview

*Draft prepared with Codex from my prompts and the recorded commits; for my review before submission.*

I rebuilt the permission-request part of course enrolment after my own
COMP8620 request appeared to reach a convenor as COMP9095 and left me unable to
proceed. That experience is the motivation, not proof of ANU's internal design.
I asked Claude and Codex to work from one shared `CLAUDE.md`, while I supplied
portal screenshots, downloaded catalogue pages and corrections from using the app.

The first important decision was to preserve evidence before interpreting it.
I kept duplicated downloads because courses belong to several specialisations.
The importer retained source variants and course/year identities rather than
merging courses by title. The later evaluator covered all 80 supplied course
versions, keeping unresolved conditions and missing evidence explicitly unknown
([`978391a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/978391a),
[`33722e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/33722e3)).

I then asked whether a small LLM could help. The adviser experiment initially
produced invented quotations and irrelevant matches. Its design changed to
selecting source-passage IDs, displaying the original text and checking the
course combination with deterministic rules. Four development cases passed;
that is evidence for those cases, not a general accuracy claim
([`09ed6c1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/09ed6c1)).

My own use exposed a different failure: the adviser worked, but I asked,
"Where is the suggestions?" The response only pointed farther down the page.
We put course names inside the reply and verified the detail links in Chrome
with JavaScript disabled
([`59adefe`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/59adefe)).

The workflow combined small commits, Docker checks, persistent-state checks and
browser inspection. The complete chronology is in [PROCESS_RECORD.md](PROCESS_RECORD.md).
Public deployment, real SMTP delivery and Fly-to-mini-PC connectivity remain
separate acceptance steps; local success does not establish them.
