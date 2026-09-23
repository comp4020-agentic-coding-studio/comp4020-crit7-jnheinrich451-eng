# Process record

The raw, append-only history that `PROCESS.md`'s few curated moments get picked
from. Oldest first. See `.claude/skills/process_record/SKILL.md` for the format.

The first five entries were backfilled on 2026-09-23 at 20:08 from the session
transcript, once the skill had been carried into this repo; their times are
approximate and the prompts are quoted from that transcript.

---

## 2026-09-23 — The C7 brief: a slice of a real ANU system, wired end to end

**Prompt:**

> Hey Claude, please check the spec of this crit, the /comp4020:handbook, to be
> clear about the instruction, and we can build.

**Result:**
Pulled `crits/07-anu-system` from the course API rather than summarising the
brief from memory, and read the starter's own explanations (`spec/README.md`,
`fly.toml`, `Dockerfile`, CI) before proposing anything. The spec's five lines:
loads at `*.fly.dev` by the cutoff; models a slice of a real ANU system you
deal with, end to end; the core flow persists across a reload; the repo shows
the process (commits, `PROCESS.md`, `reflections/crit-7.md`); you can account
for how you directed the work.

The call: **stopped at the one decision that was John's** — which system —
instead of picking one. The spec says "a real ANU system *you actually deal
with*", so choosing for him would have failed the spec's own wording.

**Verified:**
Read `meta.draft: true` on the crit node and said so: the page is still marked
draft. Noted the starter's traps that shape the build: invariants only visit
routes listed in `spec/routes.ts`, `/readme/` must serve all of `README.md`,
and `guestbook.test.ts` retires with the starter.

**Commit:** none — reading and planning only.

## 2026-09-23 — Choosing the slice: the permission-code gate

**Prompt:**

> The issue I faced is for course enrollment, the permission code is not
> integrated into the system of the course enrollment […] I fill in I applied
> COMP8620, yet it routes to the convenor with COMP9095, and this step stuck
> with I cannot proceed with no feedback. […] But the thing is we don't have
> the student's info, like grades […] So we are kind of building from the
> scratch, not based on the source code of ANU's system?

**Result:**
Confirmed the shape: a full-stack Astro server app on SQLite, built from
scratch, with **seeded students** standing in for the data we can't have. The
spec asks us to *model* a slice, not integrate with ANU.

The call that framed the rest: **name the bug as a data-model property**. A
misroute like COMP8620 → COMP9095 is possible whenever the course is typed
text; if the application references a course *row* and the convenor comes from
that row, the misroute can't be represented at all — and a spec test can prove
it. Proposed four stages: apply → automatic first round with specific reasons →
the right convenor's queue → a status timeline so nothing is stuck silently.
Proposed no real auth (an "act as" picker) and leaving census out.

**Verified:**
Read the starter's `schema.ts`, `db.ts`, the guestbook page and API, and
`guestbook.test.ts` so the plan uses its patterns (form POST + 303, migrations
at boot, tests over HTTP with an `origin` header for Astro's CSRF check).

**Commit:** none — a decision, not code.

## 2026-09-23 — Three gate outcomes, and ANU's robots.txt

**Prompt:**

> we can add a gate, like if a student does not match the basic requirement of
> the course, then pops out permission code needed like this, and if meet, then
> it can pass directly. And as for ANU, some courses are obligated for applying
> permision code for all students, then with one different line, like
> permission code are required for this course, not like your prerequisite are
> not met. […] if it is legal to crawl about existing course on ANU, or we
> generate a list?

**Result:**
John's refinement became a harness rule rather than a note: **three gate
outcomes, three distinct messages** — eligible; rules not met (each unmet rule
named); code required from everyone (never phrased as a failed prerequisite).
Drafted `CLAUDE.md` around it, with routing-by-id, an event per state change,
and a pure eligibility module.

One probe fetch of `programsandcourses.anu.edu.au/2026/course/COMP8620` came
back with exactly the data we needed — *requires COMP6320 or COMP3620,
incompatible with COMP4620, permission code required* — and then `robots.txt`
answered the legality question: it names ClaudeBot, GPTBot, CCBot and others
with `Disallow: /`. **Stopped fetching and wrote "don't crawl ANU" into the
harness**, instead of treating the successful request as permission.

**Verified:**
Read `robots.txt` itself. COMP8620 turned out to be the "required for all"
case — John's own course demonstrates the third outcome.

**Commit:** [`a468c3b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/a468c3b)

## 2026-09-23 — The catalogue from screenshots; requisites are boolean

**Prompt:**

> I can provide you with the web link […] select the postgraduate and COMP, I
> check they are not many, so there are all of them in screenshot, and if
> beside the code and the name of the course, rests are needed? […] Take
> COMP6361 […] it has requisite of "To enrol in this course you must have
> successfully completed COMP6442 and COMP6260; or be enrolled in Master of
> Computing (Advanced)".

**Result:**
Transcribed the three screenshots into `src/data/courses.ts`: 70 courses with
code, title, terms and units. Kept terms and units (the gate can say "not
offered this semester", and internships are 12 units), left out anything else.

The COMP6361 line changed the design: requisites are **and/or trees with a
program alternative**, not a flat list of course codes. So the rule model needs
AND, OR, incompatible-with, and "enrolled in program P", and seeded students
need a program.

**Verified:**
Cross-read the screenshots row by row for the near-duplicates that would be
easy to merge by accident: COMP6490/COMP8490 (Document Analysis),
COMP6434/COMP8430 (Data Wrangling), COMP8880/COMP8980, COMP8500 (12 units) vs
COMP8715 (6 units).

**Commit:** [`07acd94`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/07acd94)

**What happened:**
The listing's year is unconfirmed: the COMP6361 link is the 2027 handbook, the
COMP8620 page said 2026, and the screenshots don't show it. Asked John.

## 2026-09-23 — Declining the scraper; real rules or none

**Prompt:**

> Oh and if we can write a code to crawl? They have format, as you see, the
> "Requisite and Incompatibility" […] Or we make up using seed to generate?

**Result:**
Declined to write a crawler, and said why rather than just refusing. The rest
of `robots.txt` has no `User-agent: *` rule, so a generic crawler isn't
technically blocked — but every entry is an AI agent, and a script with a
browser user-agent feeding pages to Claude would route around that, in a repo
going public under John's name.

The second call: **don't invent requisites for real course codes either.**
Seeding made-up prerequisites on COMP6442 would misstate a real course. The
line drawn: *students* are generated; *course rules* are real (John pastes the
Requisite and Incompatibility paragraph for ~15 courses) or shown as "not
recorded in this prototype", and nothing is auto-approved from absent data. Of
the extra fields John listed, only requisites feed the gate; the
area-of-study credit rule is noted as a different rule kind, out of scope
unless a chosen course needs it.

**Verified:**
Read the full `robots.txt` before answering.

**Commit:** none — a decision; it lands in the seed-data rule already in
`CLAUDE.md`.

## 2026-09-23 20:12 — Carrying the record skill forward, and a check that isn't there

**Prompt:**

> Yes you can commit, and please check the /process_record skill, if you
> cannot find, find the .claude/ folder about rest crits, I think it will be in
> there, and it is about to create the prompts I sent as records, convenient
> for the later summary on PROCESS.md and reflections.

**Result:**
Found the skill in ass1, ass2, crit4 and crit5; took crit5's (the newest) and
repointed its citation URLs at this repo. `.gitignore` excludes `.claude/`, so
it's tracked with `git add -f`, as in C5.

The finding that mattered: C5's copy says "see the carry-forward sensor in
`spec/`" — **but C5's `spec/` has no such test.** The harness claimed a check
it didn't have, which is why the skill went missing a third time. Wrote it:
`spec/harness.test.ts` fails `pnpm check` if the skill or `PROCESS_RECORD.md`
is absent, and the skill's notes now say to carry the test with it. Added a
"record every turn" rule to `CLAUDE.md` so the habit is in the harness, not
in memory.

Committing meant running `pnpm check` first (a `CLAUDE.md` rule), and that
surfaced a platform problem: **better-sqlite3 v13 publishes no prebuilt
binaries** (0 release assets; v12.12 had 145), so a Windows install compiles
C++ and fails without Visual Studio. It wasn't the Node version — the machine
has Node 26 and no mise, but a portable Node 24 failed identically. Ran the
checks in a `node:24` Linux container instead, the way CI and Fly build, and
wrote the command into `CLAUDE.md`.

**Verified:**
`pnpm check` green in the container: typecheck 0 errors, 30 tests across 5
files, including the 2 new harness checks. Confirmed `git status` shows no
`.pnpm-store/` after a run.

**Commit:** [`a468c3b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/a468c3b), [`07acd94`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/07acd94), [`c7dc16f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/c7dc16f)

**What happened:**
The first container run left pnpm's package store inside the repo as
`.pnpm-store/`. The first fix (`npm_config_store_dir`) silently did nothing —
pnpm 11 reads `pnpm_config_store_dir` — and `git status` is what caught it
both times, not the green test run. Deleted the stray store and fixed the
command.

## 2026-09-23 22:50 — Real rules in, the gate end to end, and a screenshot that caught a false invitation

**Prompt:**

> Here we are, the 15 courses, god kind of tired to do such work!

Mid-turn, after being told COMP8300's paste duplicated COMP8600's: *"Changed
for COMP8300"*.

**Result:**
Encoded 18 courses' requisites in `src/data/requisites.ts`, each with ANU's
text verbatim beside it. The text forced four rule shapes — and/or trees
(COMP6242), a program standing in for courses (COMP6361), "completed or
currently enrolled" (COMP6320), and a units count (COMP8535, "12 units of
6000-level COMP"). **COMP8300's first paste was byte-identical to COMP8600's**
(intro ML as a prerequisite for Parallel Systems); I held it out as "not
recorded" rather than encode a likely slip, and it went in only after John
re-checked it.

Then the app, replacing the guestbook: schema, boot seed, store, six pages,
four form handlers, SSE. The calls that weren't the obvious ones:

- **Routing is a column, not a lookup at read time.** `applications.convenor_id`
  is copied from the course row at submission. The student's form carries the
  course as a hidden field from the page they were on; there is no field for a
  course code or a convenor anywhere. The COMP8620 → COMP9095 misroute has no
  way to be expressed.
- **Two migrations, not one.** Dropping `messages` and creating seven tables
  in one diff makes drizzle-kit ask an interactive "renamed or new?" question,
  which would hang in the container. Dropping first, then creating, gives two
  unambiguous diffs.
- **The seed upserts by natural key** (email, course code, uID), so
  applications keep pointing at the same rows when the catalogue is corrected
  and redeployed; only seed-owned rows (transcripts, seed enrolments) are
  rewritten.
- **COMP8620's own wording decides its first round:** "Students who meet the
  pre-requisites can request a permission code", so a request with unmet
  requisites is rejected automatically, while an ordinary course with unmet
  requisites goes to the convenor, who can judge equivalent study.
- **Tests read `<main>` only.** The "act as" picker names every seeded person on
  every page, so a "Mei Lin is not in Dr Quinn's queue" check against the
  whole body could never pass — or worse, would pass for the wrong reason
  once inverted.

**Verified:**
`pnpm check` green: 0 type errors, 117 tests — 15 unit tests of the pure
check against the real rules, 19 HTTP contract tests (each outcome's heading
appears *alone*; a request lands in exactly one of six queues; a wrong
convenor's decision is refused and the status is unchanged on reload;
approve → code matches `COMP8620-XXXXXX` → enrolment shows on the record; the
SSE stream carries the change), and the invariants plus axe across 9 routes.
Then screenshots of the built server through headless Chrome as four
different people, at 1200px and 390px.

**Commit:** [`c0bd1e7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/c0bd1e7), [`1ca9662`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/1ca9662)

**What happened:**
The green suite missed what the screenshot caught: Kenji's COMP8600 page
listed his incompatible course in red and then **invited him to request a
code** that the first round was certain to reject — the page knew the answer
and hid it. Fixed by computing the first-round verdict in the panel (the same
pure function) and warning before sending; the "It goes to Dr Mara Quinn"
line now only appears when it's true. A test now holds it. The same look
caught "Here's what's missing:" sitting above a list with a met rule in it.

Two test bugs on the way: the decision POST went to the *page* URL
(`/applications/2/decision`, a 404) rather than `/api/…`, and
`decodeURIComponent` leaves `+` as `+` in a query string. The first CDP
screenshots were blank white because Git Bash rewrote the `/courses/…`
argument into a Windows path before Node saw it (`MSYS_NO_PATHCONV=1`); a
probe logging `location.href` found it, where `--disable-gpu` had been a
wrong guess.
