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

## 2026-09-23 23:10 — First deploy, and what the Fly token actually is

**Prompt:**

> Yes you can fetch the token in mise.local.toml, if it only serves as a key
> to fly.io? What is it?

**Result:**
Answered the question by testing the token rather than guessing: its prefix
(`FlyV1 fm2_`, a Fly macaroon) says little, but `apps list` came back
**unauthorized** while `status` on `comp4020-crit7-jnheinrich451-eng` worked —
so it is a **deploy token scoped to this one app** in the course's org, not an
account key. It never appeared in output: read into a shell variable, passed
to the container as an env var. `mise.local.toml` is gitignored and in
`.dockerignore`.

flyctl isn't installed here, so deployed through Fly's own `flyio/flyctl`
image instead of installing another tool on John's machine. Remote build on
Fly's builders, one machine, a 1 GB volume created at `/data` for SQLite —
exactly the shape `fly.toml` fixes. Wrote the command into `CLAUDE.md`.

**Verified:**
Ran CI's post-deploy probes by hand against
<https://comp4020-crit7-jnheinrich451-eng.fly.dev/>, since CI only runs once
the repo is public: 200 on five routes; `/api/events` opens with
`: connected`; a same-origin form POST gets 200 (the app knows it's behind
https); a cross-site POST gets 403 (CSRF still on); the seeded COMP8620
request reads back from the volume's database ("With Dr Rowan Ellis"); and
linkinator scanned 75 internal links clean.

**Commit:** [`41ffc4c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/41ffc4c)

## 2026-09-24 15:10 — The guide, and where ANUHub actually says no

**Prompt:**

> could you please introduce the functions? And maybe a manual file? The
> functions I check first, and see if need to add or trim something

Then, with three ANUHub screenshots and notes in `assets/ANU_enrollment.md`:

> Then b please. And I plan to add some ANU pages in words […] as reference.

**Result:**
Listed the six features by role with a "check it" path for each, and
proposed add/trim candidates (a recorded-rules filter, withdraw, "ask for
more info"; live refresh as the one piece of JS) without building any —
John asked to review first. For the manual, recommended an in-app
`/guide/` page over a `MANUAL.md`, since `README.md` is John's and is
already the `/readme/` page; John chose it.

John's notes changed the guide's framing. In ANUHub, a permission-code
refusal **only appears at the final confirmation step**, after choosing a
term and adding a class by class number. So the guide opens with the two
flows side by side: ANU says no at step three, this app shows the verdict
in the catalogue. Tours are one-click: each button is the act-as form plus
a destination, so no JS and no instructions to switch people by hand.

**Verified:**
`pnpm check` green, 126 tests: a new contract test submits every tour
button and checks it lands on a page that returns 200 as that person, and
the invariants and axe now cover `/guide/`. Screenshot at 1200px read
through before committing.

**Commit:** [`bf09f98`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/bf09f98)

**What happened:**
The first draft of the ANUHub column said, as fact, that a code request
"waits without being able to see where it is". That generalises one
experience into a claim about ANU's system, which `AGENTS.md` says not to
do. It now reads as the case that prompted the prototype.

## 2026-09-24 15:35 — Review the enrolment sequence before changing the layout

**Prompt:**

> Yes you can share, and hmm, Claude built a version with functions, yet I think, maybe layout, or the over design has issues. I have a concise logic chain with ANU enrollment portal, and you can ask me for details

**Result:**
Reviewed the current implementation against John's two supplied portal images
and `assets/ANU_enrollment.md`. Asked for his intended sequence, the place of
permission requests within it, and which parts feel overdesigned. Left product
code and the existing design unchanged pending that clarification.

The source starts with an unfiltered-by-term catalogue and selects a term on
the course page, whereas John's notes start with a term and end with a separate
confirmation. Flagged the dense course-page hierarchy as a candidate for
progressive disclosure, not an accepted redesign. Also found that approved
requests are matched without their term in `enrol`, and that the automatic
rejection path accepts a disputed-record statement without routing it for human
review. These are source-review findings, not runtime reproductions.

**Verified:**
Read `CLAUDE.md`, the supplied notes, layouts, course/request pages, eligibility
presentation, schema, store and existing HTTP tests. Checked the working tree
and recent history; `assets/` was already untracked and was preserved. No app
tests or rendered viewport checks were run in this review. Docker access from
the sandbox was denied. No claim of current test success was made.

**Commit:** none — discussion and source review only; this record is uncommitted.

**What happened:**
John explicitly authorised sharing the relevant private files and his account
with Claude Code. Both the normal read-only invocation and a retry with
customisations disabled crashed in the installed Bun runtime before returning
a review. No findings here are attributed to Claude. The collaboration attempt
remains incomplete; no tooling installation or update was attempted.

## 2026-09-24 19:45 — ANU's visual style does not fix the workflow

**Prompt:**

> I think, it is a rebuild, but I think we can change this drastically. Maybe only to keep ANU's art style!

**Result:**
Updated `CLAUDE.md` to distinguish ANU's visual reference from interaction
requirements. John authorised substantial changes to the layout and workflow;
neither the original portal sequence nor the prototype's catalogue-first layout
is fixed. The replacement journey remains a proposal to discuss. Retained the
published scope and functional guarantees. No application code changed.

**Verified:**
Read the current harness and working-tree status before editing. Reviewed the
documentation diff and ran `git diff --check`; no whitespace errors. App tests
were not run for this documentation-only clarification.

**Commit:** none — design clarification and record remain uncommitted.

**What happened:**
The previous review gave the existing ANUHub sequence too much weight as a
candidate structure. John clarified that the rebuild can change it drastically;
the shared harness now makes that freedom explicit.

## 2026-09-24 21:46 — Separate course information, offerings and enrolment state

**Prompt:**

> What is a good class enrollment design?

> We can directly find the course by course code here I mean like COMP6528, the 6528. with the prefix COMP.

> I am actually thinking, how should we do to this dataset? I think the crit page for spec if it clarifies?

**Result:**
Checked the published contract and current data architecture before recommending
scope. The spec requires a personally relevant end-to-end slice, persistent core
actions, deployment and process evidence; it does not require real accounts,
scraping or a university-wide catalogue. Proposed searchable course information,
saved semester selections and integrated permission handling as one coherent
enrolment task. These recommendations have not been accepted or implemented.

Distinguished source-backed catalogue data, year/term-specific offerings,
fictional student and reviewer records, and user-created selections, requests,
decisions and enrolments. Recommended a small verified reference dataset with
source/year/check metadata and repeatable imports that preserve user-created
state. Keep demo identity selection rather than adding account registration.

**Verified:**
Fetched the current Crit 7 JSON directly from the course API and read Programs
& Courses' robots.txt through the web tool. It explicitly disallows ChatGPT-User,
GPTBot and ClaudeBot. No course pages were crawled. Read the current schema,
catalogue, seed routine, search implementation, people and requisite definitions.
Counted 70 catalogue entries. Current search uses substring matching on code or
title; the dataset includes both COMP6528 and ENGN6528, so numeric input should
not silently resolve to one course. App tests were not run; no app code changed.

**Commit:** none — advice and evidence record only; no implementation was agreed.

**What happened:**
The web tool could not open the course spec endpoint. A direct read-only request
returned the published brief and spec. The existing no-crawl harness instruction
was supported by the site's published robots directives; an authorised export
or user-supplied source material remains the recommended input route.

## 2026-09-25 13:38 — Verified student accounts with a private reviewer workflow

**Prompt:**

> So I think if we can store the email(account) and password of students, and add a block out with only ends with @anu.edu.au can pass. And then enters, we generate one profile for this new user.

> If we need to register the faculties? For I am not clear about the faculty ends, not clear what should be visible to them. And rest can follow your plan

John then selected email ownership verification, automatic clearly labelled
fictional academic records, and SMTP support with credentials configured locally.

**Result:**
Replaced the public actor-switch cookie with server-side sessions. Student
registration validates the exact email domain, stores salted scrypt password
hashes, and requires an expiring single-use SMTP verification link before login.
An automatically generated Computing (Advanced) academic record is labelled as
fictional. Reviewer roles are assigned through an administrator invitation
command; public registration cannot create staff. Reviewer pages and live events
are restricted to their assigned requests. Profiles and requests are private.

Built the accepted enrolment workspace: code/number/title search with subject
and term filters, source-backed course details and handbook links, persistent
saved offerings, integrated permission handling and explicit enrolment
confirmation. Approval matches student, course, year and term. A student can
request human review of a disputed automatic check. Existing catalogues and
records migrate through the generated Drizzle migration; no live site deploy.

Used restrained dark/gold styling as the visual direction. Browser inspection
showed that long requirement text delayed the next action on mobile, so the
published wording is expandable and the offering controls appear earlier.
Added `docs/accounts-and-data.md` and a credential-free mail environment example.
Preserved John's concurrent unfinished `AGENTS.md` edit and untracked `assets/`.

**Verified:**
The initial Docker baseline passed 126 tests. The final Node 24 / pnpm 11.9.0
Docker run passed type checking with zero errors, warnings or hints and all
170 tests. The HTTP suite covers SMTP delivery to a local capture inbox,
verification expiry and reuse, invitation activation, failed delivery and resend,
password/session storage, login throttling, CSRF, forged legacy cookies,
ownership, persistent selections, routing, and cross-term approval rejection.
Existing invariants and the full README rendering test remain enabled.

Ran headless Chrome at 1440 and 390 pixels, with JavaScript disabled, against a
separate temporary database. Inspected screenshots of search, registration and
the mobile course page; checked 13 page/view combinations without horizontal
overflow. Completed request -> assigned reviewer approval -> explicit student
enrolment -> reload in the browser. The isolated preview remains on port 4322;
local screenshots and the browser check report are in the ignored `.data/`.
The staged implementation passed `git diff --cached --check`.

`check:evidence` still fails on the missing reflection, template `PROCESS.md`
and its placeholder commit citations. Those student-authored files were not
rewritten. Actual inbox delivery remains untested until John configures SMTP.
Password recovery, real academic-record integration and deployment are not part
of this completed local increment.

**Commit:** [`20fb86f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/20fb86f)

**What happened:**
The first new HTTP run passed 166/167 tests; the cross-term test mistakenly used
a student who had already passed the course. Replaced that fixture with a
fictional incompatible-course case that requires permission, then demonstrated
rejection in the wrong term and successful enrolment in the approved term.
The user's email-verification choice superseded the earlier no-auth harness
rule; `CLAUDE.md` now records the new contract. No external email was sent by
the automated or browser checks, and no review is attributed to Claude.

## 2026-09-25 14:46 — Locate the local mail configuration and existing requirements

**Prompt:**

> Ty, and the requirements, if I need to provide to you? But there are so many. And for the setup guide, where is the gitignored .env file?

**Result:**
Found that `.env` had not yet been created; the setup guide described copying
the template. Created the root `.env` from `config/mail.env.example`, with
placeholder values only and exclusive creation to avoid overwriting an existing
configuration. No credentials were read or configured. Counted 17 existing
course requirement definitions, so John does not need to supply those again;
additional source material can be collected only for courses he wants to add.

**Verified:**
Read the current harness, setup guide and requirement definitions. Confirmed
`.env` was absent before creation and `git check-ignore -- .env` reports it as
ignored. No application code changed and no app tests or email sends were run.

**Commit:** none — local ignored configuration scaffold and clarification only.

## 2026-09-25 15:53 — Validate mail settings and identify SMTP IP rejection

**Prompt:**

> Then all updated, if those format is correct? And what should be next step?

**Result:**
Checked the local mail settings without displaying credential values. Rejoined
the SMTP hostname that had been placed on a separate line and reduced
`APP_ORIGIN` to its existing local origin, removing its page path and fragment.
Preserved the user's credentials and sender. The local HTTP origin still does
not satisfy the app's HTTPS requirement for remote SMTP delivery; no runtime
configuration or deployment was changed.

**Verified:**
All environment entries use `KEY=value`, with each required setting present
exactly once. `.env` is Git-ignored and excluded from Docker build context.
Ran Nodemailer's SMTP connection/authentication verification from a Node 24
Docker container against the configured Brevo host, without sending email.
Authentication returned `EAUTH`, command `AUTH PLAIN`, response code `525`.
Brevo's official SMTP troubleshooting documentation identifies code 525 as
an unauthorized sending IP. Credentials, sender approval and inbox delivery
are not yet validated. No application code changed or app test suite ran.

**Commit:** none — ignored local configuration correction and diagnostic record only.

**What happened:**
The initial sandboxed Docker inspection could not access the Docker engine;
the approved retry succeeded. The SMTP check reached Brevo but stopped at its
IP authorization restriction. The next external step is authorizing the intended
sending IP in Brevo, then repeating authentication and testing the full flow on
an HTTPS app instance with the same database used for registration.

## 2026-09-25 21:30 — Unblock the local walkthrough and separate planning from enrolment

**Prompt:**

> Currently for we cannot sign-in so later pipeline I cannot experience for now.
>
> And for your list, I finished in ./assets/ANU_enrollment.md. Please check it, I said in top layer, actually the rules to process is quite complicated.

John also described a Machine Learning specialisation sequence: COMP6670 in
S2 preceding two of three advanced courses in a later S1, and offered to supply
source material as screenshots.

**Result:**
Read the supplied workflow and published Crit 7 contract. Added a workflow
review separating proposed degree/specialisation planning from the implemented
offering-level permission flow. The example is a conditional earliest sequence,
not an asserted unique degree plan or verified ANU rule. Documented a small
source collection target, year/source provenance, planned-versus-passed state,
human review of exceptions, and a fictional transcript inconsistency: COMP6670
recorded in S1 despite the current catalogue's S2-only offering.

Added a separate Docker Compose preview on loopback port 4323 and Mailpit inbox
on 8025, with independent persistent volumes and explicit local mail settings.
The user can register, read captured verification mail and sign in without
Brevo, a public role switch, or bypassing the app's verification flow. Prepared
an unconsumed invitation for the fictional COMP8620 reviewer in that local inbox.
The real mail configuration and existing preview containers were preserved.

**Verified:**
Docker Compose configuration validated. Docker Node 24/pnpm 11.9.0 `pnpm check`
passed all 170 tests across 7 files, with zero type errors, warnings or hints.
Live HTTP checks on the new preview covered local captured delivery, refusal
of unverified login, confirmation, sign-in, the fictional profile, COMP8620 S2
request routing to Dr Rowan Ellis, saved selections and request persistence
after reload and an app restart. The reviewer invitation reached the captured
inbox and opened the password-setup page without consuming the token. No real
email was sent. Multi-semester planning remains a documented proposal; no review
is attributed to Claude. Staged whitespace checks passed.

**Commit:** [`2e21311`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/2e21311)

**What happened:**
The initial internal-only Docker network did not publish its browser ports on
this Docker Desktop setup. Recreated only the new stack with a normal bridge
and loopback-bound ports, retaining its volumes. The first smoke request used
S1 for COMP8620 and was correctly rejected because its recorded offering is
S2; corrected the test input and reran successfully. Neither issue was fixed by
weakening the enrolment or account checks.

## 2026-09-25 21:39 — Fix native browser verification submissions

**Prompt:**

> Haha, but after confirmation, jumps to a page: [http://127.0.0.1:4323/api/auth/verify](http://127.0.0.1:4323/api/auth/verify), with one line: Cross-site POST form submissions are forbidden. And I still cannot login

**Result:**
Reproduced the user's failure with a real Chrome form submission and JavaScript
disabled. The verification page's `Referrer-Policy: no-referrer` caused Chrome
to send `Origin: null`, so Astro correctly rejected the POST. Changed the policy
on verification pages to `strict-origin`: the token stays out of the Referer
header while the same-origin form retains its Origin. Kept Astro's and the app's
cross-site checks enabled, added HTTP regression coverage for verification
headers and rejected origins, and added a native-browser check requirement to
the shared harness. Rebuilt and restarted the local preview without resetting
its database or changing the user's accounts.

**Verified:**
Before the fix, headless Chrome with JavaScript disabled submitted the actual
confirmation button with Origin `null` and received 403 with the user's exact
error text. After the fix, a fresh fictional account completed registration,
captured-email confirmation (303), sign-in and authenticated profile access
through actual browser forms. The confirmation request's Origin matched the
preview and its Referer contained no token. Local artifacts record the before
and after outcomes in `.data/verify-browser-before.json` and
`.data/verify-browser-after.json`. Docker Node 24/pnpm 11.9.0 `pnpm check` passed
171 tests across 7 files with zero type errors, warnings or hints. Tests also
confirm null/cross-site origins remain rejected without activating the account
or consuming its token. Staged whitespace checks passed; no external mail sent.

**Commit:** [`a8a28ff`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/a8a28ff)

**What happened:**
The previous HTTP smoke check manually supplied Origin, so it missed this
browser-only failure. Its passing result was insufficient evidence that the
user could submit the verification form. The first new test edit reused a
variable name and failed type checking; renamed it. The first browser rerun
reached login but had an ambiguous email-field selector shared with the resend
form; scoped the selector to the login form and completed the rerun. These
were test-harness corrections, not reasons to relax application security.

## 2026-09-25 21:49 — Inspect saved program HTML and select the first rule version

**Prompt:**

> And I add a downloaded page in ./assets/MCOMP, if you can check it? The Study section, it records the info, but those links, they still points to website, so if it can do, I will download all course pages

When asked which degree and rule year the first planning example should use,
John selected:

> Computing (Advanced), 2026 — current demo profile

**Result:**
Confirmed that the saved HTML contains the full Study section, so the user can
supply downloaded pages without retyping or fixing their external links. Those
links identify sources; they do not include their destination pages. Recorded
the snapshot's MCOMP 2027 identity, source URL and checksum, the visible unit
constraints, eight distinct linked course codes, and the gaps between its
requirements, specialisation link list and sample study table. In particular,
Machine Learning is named in the requirements but omitted from the linked
specialisations. The sample table also omits compulsory COMP6120 and adds an
extra university elective slot. No guesses were imported as executable rules.

Updated the shared harness with John's VCOMP 2026 decision. The next small
source set is that degree page, its Machine Learning specialisation, COMP6670
and the advanced courses named there. Degree-rule year and offering year must
remain separate. The supplied MCOMP 2027 page is retained as separate evidence.

**Verified:**
Read the saved HTML's metadata, Study section, additional academic advice and
the current local catalogue. Parsed the HTML with JSDOM in a Node 24 container
using `--network none`; no scripts ran or linked pages were fetched. Saved the
extracted year, URLs, table rows and checksum in
`.data/MCOMP-2027-source.json`. The source contains the hidden Study tab text
without needing its downloaded images/scripts. No application code or database
changed; application tests were not rerun for this offline source review.

**Commit:** none — source review and agreed planning target recorded; no implementation increment.

## 2026-09-25 21:58 — Inventory the uploaded 2027 degree and specialisation sources

**Prompt:**

> Hmm, and I uploaded them, and 2027's specializations are changed from my turn, there is no Machine Learning, but only the Artificial Intelligence, and I checked those courses are moved from ML to AI. And next I will upload the courses

**Result:**
Inspected all ten uploaded snapshots: three degrees and seven specialisations,
each with 2027 metadata and locally extractable requirements. The AI snapshot
includes COMP6670, COMP8600 and COMP8650, consistent with John's observation.
Kept his reported historical change separate from what these current snapshots
prove: they do not establish the earlier ML rules or transition policy for an
existing student. The saved degree requirement text still mentions ML, so its
inconsistency remains flagged.

Created `docs/uploaded-sources-2027.md` with an inventory, the AI course groups
and 66 distinct explicit 2027 course links to reduce duplicate collection work.
These references include exclusions/advice and are not a claim that all courses
are required or eligible. Updated the moved MCOMP source path, verified its
checksum is unchanged, and kept the earlier VCOMP 2026 planning target intact.

**Verified:**
Parsed the uploaded HTML using JSDOM in a Node 24 container with networking
disabled and no script execution. Extracted per-file year, identifiers, source
URL, SHA-256, requirement text and links into the local evidence artifact
`.data/uploaded-program-sources.json`. Deduplicated only explicit 2027 course
links; unversioned links did not establish a year. No linked course page was
fetched, and no application code or database was changed. App tests were not
rerun for this source inventory.

**Commit:** none — offline source inventory and download checklist only.

## 2026-09-25 22:44 — Audit shared course sources without losing specialisation relationships

**Prompt:**

> Ty, the incognito will do! And I have completed all specializations courses, and I noticed there are overlap, the duplicated, but I keep them duplicated in different specializations, for those express their relations, those links you can refer. And working on rest courses, hew, a big work

**Result:**
Preserved all source copies and their folder context. Audited 64 saved course
pages representing 49 distinct course/year pairs, all 2027. The 15 extra copies
agree on the content fields compared. Updated the source checklist to mark
those 49 codes received and identify 17 remaining links. Recorded the intended
import boundary: one course version can participate in several specialisation
rule groups, preserving exclusions, unit constraints and source provenance.

Found that AI's Advanced Topics in Machine Learning folder contains a COMP8620
page; the correct COMP8650 page is already supplied under Data Science, so no
repeat download is necessary. Recorded two missing requisite headings and
topic-dependent prerequisites that cannot safely be flattened into simple
eligibility. Offering sections include 2027 and 2028 with future availability
labelled indicative, requiring offering-year extraction separate from page year.

**Verified:**
Ran the offline JSDOM audit in a Node 24 container with `--network none` and no
page script execution. All 64 files have code/year metadata and learning-outcome
and offering headings. Compared normalised content fields within duplicate
code/year groups; retained raw SHA-256 hashes as separate provenance. Matched
the uploaded set to the 66 explicit 2027 course links and inspected extracted
COMP6670, COMP8600, COMP8650 and COMP8620 rules. Evidence is saved in
`.data/course-source-audit.json`. No source files or application data were
changed; no application tests were needed for this source audit.

**Commit:** none — offline source audit and collection checklist update only.

## 2026-09-25 23:29 — Distinguish shared titles from course identity and offering status

**Prompt:**

> Done! God! In Courses/Remained, contains rest courses.
>
> But for **Computational Methods for Network Science** one COMP8880, one COMP8980? It has unclear meaning. And some courses does not include the enrollment semester, like COMP8880, it isn't presented with the timeslot

John also compared COMP6434 and COMP8430 Data Wrangling and suggested that
their differing codes might reflect changes across academic years.

**Result:**
Re-audited 95 saved pages representing 76 distinct course/year pairs, all 2027.
Of the original 66 linked codes, 61 are present and five remain unmatched; the
new collection also includes additional catalogue entries. All compared fields
agree within repeated code/year groups. Preserved the previous audit snapshot.

Compared the four named courses directly. The two Data Wrangling entries have
different requisites and permission wording. COMP8980 has a different requisite
expression from COMP8880 and explicitly lists COMP8880 as incompatible. Shared
titles are therefore not sufficient authority to merge the codes, assert a
historical replacement or transfer an approval. All four saved pages carry 2027
metadata. Preserved ambiguous AND/OR grouping rather than inventing a rule.

COMP8430, COMP8880 and COMP8980 explicitly say there are no current offerings;
COMP6434 lists S2 2027 and an indicative S2 2028 offering. Fourteen distinct
courses in the collection carry the explicit no-current-offerings statement.
Recorded the distinction from missing availability and permanent discontinuation
in the source audit and shared harness. Updated the receipt checklist; application
data still use the existing 2026 catalogue.

**Verified:**
Ran JSDOM offline in Node 24 with no network or page script execution. Compared
saved metadata, description, requisite wording, learning outcomes and offering
text for COMP6434, COMP8430, COMP8880 and COMP8980. Forty-three saved-file headers
contain `about:internet`; extraction now retains that value and separately
records the source's canonical URL as fallback provenance. Rechecked the explicit
availability classifications and checklist counts against the extracted records.
No source files were renamed or deleted, no linked page was fetched, and no
application code/database changed. Application tests were not run for this audit.

**Commit:** none — source comparison and inventory update only.

## 2026-09-25 23:52 — Persist source evidence before interpreting course rules

**Prompt:**

> Great, then if we can move on. And if you need like persistent data to store understanding, the relations of those courses? I think it is quite hard to smooth the entangled relations right?

**Result:**
Built an offline importer, a version-controlled normalized dataset, five
additive SQLite tables and a public course library at `/catalogue/`. Imported
105 saved HTML files into 86 code/kind/year identities: 76 courses, three
degrees and seven specialisations. Duplicate copies retain their original
paths and checksums. Stored 394 contextual code/link mentions and 154 offering
rows with their actual years, sessions and published dates.

Kept the difficult distinction explicit: a mention in a requirement block is
not automatically a prerequisite, an allowed elective or an equivalence. The
import preserves paragraph order/list depth and exact AND/OR wording; missing
target years remain unknown. Separate review state survives reseeding. Changed
source wording retains another visible snapshot instead of silently replacing
it or inheriting a previous review. Historical snapshots remain in both the
distributable JSON and the persistent database.

The library supports full/spaced/numeric course search, inline links to matching
year-specific sources, published offerings, related source entries and evidence
disclosures without JavaScript. It labels unknown requirements and distinguishes
explicit no-current-offerings statements from absent information. The existing
2026 enrolment rules and fictional student records remain separate. Automatic
degree planning and a review editor are not implemented. Recorded the model and
next interpretation boundary in `docs/catalogue-data.md` and the shared harness.
Committed the preceding offline source audits alongside the implemented import;
raw user downloads and the user's AGENTS.md edit were left untouched.

**Verified:**
Generated migration `0004` from `src/lib/schema.ts` using Drizzle. Node 24 / pnpm
11.9.0 Docker checks passed: zero type errors, warnings or hints and 213 tests
across nine files. New checks exercise duplicate identity, code/year separation,
ambiguous wording, excluded-course context, explicit/unknown offerings, future
offering years, delivery groups and script-free parsing. SQLite reopen/reseed
tests retain review notes and student enrolments, keep enrolment offerings
unchanged, and preserve conflicting same-code/year snapshots with fresh review
state. HTTP tests verify library search, missing-source handling and the year
boundary against the built app.

Re-imported the full collection and verified byte-for-byte identical JSON with
SHA-256. Compared requirement/outcome/offering text against all 95 earlier
course extracts and requirement text against all ten degree/specialisation
extracts: no non-whitespace differences. Restarted the local preview with the
additive migration. Chrome checks passed eight page/viewport combinations at
1440px and 390px, with JavaScript disabled, no page overflow, native search
submission and native evidence disclosure. Inspected desktop and mobile
screenshots; final screenshots and result are local under `.data/`.

**Commit:** [`978391a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/978391a)

**What happened:**
The first extraction flagged colspan rows in MGMT7020 and REGN8014 as unsupported.
Offline inspection showed they were delivery-group headings, so the parser now
retains On Campus/Online labels with the corresponding class rows. The browser
review also exposed an inherited three-column page heading that cramped the
title; corrected the library heading layout and rechecked the final build.
No ANU pages were fetched, no source scripts executed, and no deployment or push
was performed. This turn did not receive a Claude review.

## 2026-09-26 00:10 — Put degrees before specialisations and courses

**Prompt:**

> Could you make like top are degrees, and specializations and courses? The top-down arrangement I think matches intuition.
>
> Oh for we are building 2026 version, if can transferred to 2027? For our data are 2027, it is stupid to use fictional 2026 info? What is your opinion?

**Result:**
Grouped the course-library overview into Degrees, Specialisations and Courses,
in that order, with counts and matching entry-type filter order. Search and
filters retain the grouping and omit empty sections. This is a presentation
change; the persistent catalogue and enrolment flow are not rewritten.

Recommended moving the active demo to 2027 to match the supplied evidence,
while keeping the academic record explicitly fictional. Inspected the migration
scope instead of relabelling old decisions: all 17 implemented rule courses have
2027 pages, 15 source paragraphs match after whitespace normalization, COMP8620
differs in paragraph/punctuation spacing, and COMP6528's saved source contains
three incompatibilities missing from the existing check. The 66 shared courses
have matching coarse offering-session sets; four current course codes lack a
saved 2027 source. Recorded the concrete year/rule/offering/profile migration
boundary in `docs/catalogue-data.md` and `CLAUDE.md`. The runtime remains 2026;
the recommendation is not an implemented migration or an approval to reinterpret
existing 2026 permission decisions for 2027.

**Verified:**
Re-read the published Crit 7 contract. Compared current course/requisite data
with the imported local 2027 snapshots without fetching ANU course pages.
Node 24 / pnpm 11.9.0 Docker `pnpm check` passed: zero type errors, warnings or
hints and 213 tests. Restarted the local preview and checked Chrome at 1440px
and 390px with JavaScript disabled. Confirmed section order and counts 3/7/76,
specialisation-only filtering, spaced-code search returning one course section,
and no horizontal overflow. Inspected desktop/mobile screenshots; browser
evidence is saved in `.data/catalogue-groups-browser.json` and `.data/screenshots/`.

**Commit:** [`a796061`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/a796061)

**What happened:**
John found the mixed catalogue order unintuitive and challenged the visible
2026/2027 mismatch. The previous flat code sort mixed entry types, while the
year boundary preserved his earlier 2026 cohort choice. The layout now follows
his requested hierarchy, and 2027 is documented as the recommended next demo
target. No push or deployment was performed.

## 2026-09-26 00:17 — Bound source collection to courses the prototype needs

**Prompt:**

> Ah, I missed COMP6442, in page COMP6361, maybe more, I see it is not linked. Hmm, there are bachelor degree courses not linked. I am wondering if I need to add them?

**Result:**
Recommended adding COMP6442's 2027 page and prioritising the five missing
degree/specialisation-linked sources: COMP6442, COMP6490, COMP8405, ENGN6627 and
MATH6005. A full undergraduate catalogue is not required for this postgraduate
enrolment slice. A referenced prerequisite code can be checked against a
student's record using the target course's published requirement, without
recursively importing that prerequisite's own rules. Keep absent course pages
as contextual references; collect them when the prototype needs to display or
enrol in those courses, or when their details resolve a specific ambiguity.

Distinguished two reasons for an unlinked code: a genuinely missing saved
course page, and a source mention that has no explicit target year. Additional
downloads do not automatically resolve an unspecified year. No link-resolution,
eligibility or import behaviour was changed by this advice.

**Verified:**
Read COMP6361's imported requirement and references: COMP6442 explicitly links
to 2027, but no matching imported or newly saved local course page exists.
COMP6260 has an explicit 2027 reference and an existing source. Scanned local
course HTML metadata without executing scripts, and checked the normalized
reference collection. The degree/specialisation source gaps remain the same
five codes; 58 distinct missing references have 1000–4000-level code patterns,
which is a collection count rather than a claim that all are needed. Inspected
the library's exact-kind/code/year link resolution. No application tests were
run because this turn only inspected sources and recorded collection advice.

**Commit:** none — source-link review and collection guidance only.

## 2026-09-26 00:33 — Import the missing pages without guessing a code correction

**Prompt:**

> Oh, I didn't notice the 6442 download is failed. And here we are, except COMP8405. I find there is no COMP8405, but there is a course called COMP8045, **Advanced Topics in Computer Systems & Architecture**, I added into the courses/remained/8000

**Result:**
Imported COMP6442, COMP6490, ENGN6627 and MATH6005 as 2027 course sources. The
library now contains 80 courses, three degrees and seven specialisations from
109 catalogue HTML copies. References such as COMP6361 to COMP6442 now resolve
to the saved page. Updated the download checklist, source audit and migration
assessment; COMP6490 remains explicitly without current offerings.

Read the saved Computer Systems specialisation: its course-choice list names
COMP8045, while later explanatory advice links COMP8405. Preserved both source
statements and documented the inconsistency without creating an alias, inferring
a replacement or asserting that COMP8405 never existed. The original two
matching 2027 COMP8045 catalogue copies were already present.

The new similarly named download was a 2026 Second Semester class summary,
class 9013, topic Systems for AI. Recorded its canonical URL and checksum in
the audit rather than importing it as a 2027 catalogue course. Existing
catalogue snapshots and the 2026 enrolment flow remain unchanged.

**Verified:**
Inspected local metadata and source paragraphs with no page-script execution or
ANU course-page requests. Confirmed all 86 previous semantic snapshots remain
byte-for-byte equal as parsed objects, with only the four named snapshots added.
The final collection has 412 contextual references and 164 offering rows.
Repeated the strict import and confirmed identical generated JSON by SHA-256.
Node 24 / pnpm 11.9.0 Docker `pnpm check` passed with zero type errors, warnings
or hints and 214 tests. Updated persistence tests to compare against the supplied
manifest while still testing repeat imports, conflicts and preserved user state.
New HTTP coverage checks the four pages, restored prerequisite link, unresolved
COMP8405 and absence of an invented 2026 COMP8045 catalogue entry.

Restarted the local preview. Chrome with JavaScript disabled confirmed groups
3/7/80, navigation from COMP6361 to COMP6442 surviving reload, the other three
pages opening, and COMP8045 linking to its 2027 source while COMP8405 stays
unresolved. Browser evidence is `.data/catalogue-followup-browser.json`.

**Commit:** [`3e28971`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/3e28971)

**What happened:**
The first import stopped at the class summary because it lacked catalogue
identity metadata. Offline inspection identified the different document type
and year. That file disappeared from Remained between reads; the agent did not
move or delete it. Discarded a temporary checksum-based exclusion implementation
once unnecessary, leaving the strict importer unchanged. The final import ran
successfully against the remaining 109 valid catalogue files. No push or
deployment was performed.

## 2026-09-26 00:59 — Find courses shares the imported 2027 catalogue

**Prompt:**

> Ty, and for the find courses, I think we can then share those entries? I find they are not updated.

**Result:**
Replaced Find courses' independent 70-course seed view with the same persistent
2027 evidence used by the library: 80 courses, dynamic subjects, published
descriptions, learning outcomes, requirements, credit ranges and links between
the two views. Search initially includes all terms and courses without an
offering; only usable published 2027 class rows permit saving or enrolment.

Completed the previously recommended 2027 enrolment alignment instead of
combining new catalogue labels with old gate defaults. Seventeen explicit
prototype rule interpretations are bound to inspected source hashes. Other
courses display published requirements without claiming automatic eligibility;
changed or conflicting sources require review. Added COMP6528's three published
incompatibilities and exposed COMP8620's additional topic review in the page and
request timeline. Degree and specialisation planning remains unimplemented.

Kept historical 2026 course rules, requests, approvals and enrolments scoped to
their original year. New fictional profiles place COMP6670 in 2026 S2; existing
registered profiles are preserved. Generated migration 0005 from the schema,
including nullable credit for variable-unit course identities. Updated the
shared harness and data documentation. No Claude review was obtained this turn.

**Verified:**
Compared the 17 interpretations with the supplied local 2027 source paragraphs;
no ANU course-page crawling. Node 24 / pnpm 11.9.0 Docker `pnpm check` passed with
zero type errors, warnings or hints and 247 tests. HTTP contracts compare the
same 80 identities in both screens, cover new subjects and source links, reject
unavailable offerings and unreviewed enrolment, and keep approvals from crossing
years in either direction. Populated database tests preserve accounts, profiles,
checks, decisions, events and selections through migration and repeated seed;
failure tests verify transaction rollback and restored foreign-key enforcement.

Backed up the local preview database before restart. Compared private-state
fingerprints immediately afterwards: all eight accounts, three requests, nine
events, three selections, twelve profiles and 42 non-seed transcript rows were
unchanged; no foreign-key errors. Chrome with JavaScript disabled checked ten
page/viewport combinations at 1440 and 390 pixels with no horizontal overflow.
Native forms completed course search, library navigation, local email
verification, sign-in, saving and direct enrolment for COMP6528, and a 2027
COMP8620 request routed to Dr Rowan Ellis with the topic-review limit visible.
Reloads retained these new actions. Evidence is in ignored
`.data/shared-course-state-after.json` and `.data/shared-courses-browser.json`.

**Commit:** [`cd081f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/cd081f4)

**What happened:**
Fresh-database tests passed before the populated upgrade test exposed a foreign
key failure while rebuilding applications with existing child events. Deferring
constraints before calling the migrator did not fix it. The accepted startup
wrapper changes enforcement before Drizzle's transaction, checks references and
restores enforcement before serving requests, following SQLite's documented
table-rebuild procedure. Generated migrations were not hand-edited. A link test
was corrected to compare parsed URL parameters, and the migration helper's
unknown pragma return type was narrowed before the final green check. Preserved
John's unstaged AGENTS.md edit and raw downloads. No push or deployment performed.

## 2026-09-26 01:11 — Assess computable rules and small-model extraction

**Prompt:**

> Hmm, if there is a way to compute eligibility? Or it is too complicated for algorithm?
> And I think, if we can deploy an open-source small LLM, to give out the verdict on permission code requirement?
> If we can store those prerequisite into real data form, instead of only natural language for algorithm to process? Include the current profile.
> You can think if it is feasible first

**Result:**
Recorded a feasibility assessment in `docs/eligibility-feasibility.md`, leaving
the application unchanged. Confirmed the existing 17 checks already combine
structured prerequisite trees with the fictional profile. Recommended extending
that engine with met/unmet/unknown conditions, explicit permission policy,
source-linked rule versions and record snapshots. Proposed a small model as an
authoring aid that drafts rules for validation and review; resulting eligibility
comes from the reviewed rules, with human decisions for discretionary conditions.

Used actual saved examples for intensive-mode permission, topic prerequisites,
GPA, competitive selection, marks/equivalence and absent sections. Proposed
local extraction during catalogue maintenance because the existing Fly config
has 256 MB RAM. Identified Qwen3-4B-Instruct-2507 as one candidate, without
claiming measured extraction accuracy or committing to a model. The assessment
is a proposal for discussion; no inference service or new decision logic was built.

**Verified:**
Read the current requirement types, evaluator, source binding, profile projection,
fictional transcript and Fly configuration. Re-read the published Crit 7 contract
through PowerShell after the browser tool could not retrieve it. Checked the
supplied local source paragraphs without crawling ANU course pages. Consulted
Ollama's official structured-output documentation and Qwen's publisher model card
for JSON-schema support, model size and licence. No model downloaded, deployed,
trained or benchmarked. Docker Node 24 / pnpm 11.9.0 `pnpm check` passed with
zero diagnostics and 247 tests; no new tests or runtime changes were needed.

**Commit:** [`722e30d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/722e30d)

## 2026-09-26 01:23 — Correct the assumption that someone staffs the reviewer queue

**Prompt:**

> Hmm, I am thinking for this project, actually there is no reviewer, so if the student's request will be blocked as always in this way?
> Or, if we use like adversial like way, one agent or model analyzes, and one verdict?
> Or we can present the thinking mid-term production for certain cases of permission request?

**Result:**
Revised the feasibility proposal to distinguish reviewing the rule catalogue
during development from processing every student's request. Recommended an
automated demo decision path under an explicit prototype approval policy, with
saved assessments and concrete next actions for unmet or unknown conditions.
Proposed separate labelled fictional scenarios so visitors can complete the
permission/enrolment flow without inventing missing facts in the published
course evidence or waiting for an unavailable reviewer.

Described an analyst/critic experiment with independent source inspection and
evidence-based objections, followed by validation against rules and demo policy.
Model agreement alone cannot supply missing grades, announced topic requirements
or discretionary selection evidence. Proposed student-facing intermediate
assessment reports showing sources, academic evidence, condition results,
uncertainties and next actions. Automated decisions must have a system actor;
existing reviewer roles and historical decisions remain separate. This turn
changes the proposal only, not runtime approval behavior.

**Verified:**
Read the current application page, decision endpoint and store authorization:
`with-convenor` persists until the assigned authenticated reviewer decides it.
Re-read the published Crit 7 contract, which requires an end-to-end persistent
slice but does not mandate human processing for every request. Reviewed primary
papers by Du et al., Choi et al. and Wynn et al. on multi-agent debate benefits
and failure modes; no model experiment or claimed accuracy improvement here.
Docker Node 24 / pnpm 11.9.0 `pnpm check` passed: zero diagnostics, 247 tests.

**Commit:** [`ab93614`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/ab93614)

**What happened:**
John identified that the earlier recommendation assumed a staffed reviewer
queue. Confirmed this is a real limitation in the running prototype and corrected
the proposed design rather than implying the fictional reviewer is operating
in the background. No runtime change, model deployment or push was performed.

## 2026-09-26 01:36 — Agree both eligibility workstreams and a local Llama baseline

**Prompt:**

> I think it is fundamental or preparing work, it is worth doing.
> And here your test on "assessment report and automated demo decision path first", I think they both worth doing. You can record them.
> And a thing, I think if there are deployable agent harness, I think only model? And published on server as fly.io? And if you need me to download the model? Lets set as llama first?

**Result:**
Recorded the two agreed workstreams in `docs/eligibility-implementation-plan.md`
and linked them from the shared harness. The rule vocabulary, unknown semantics
and manual source-backed reference cases provide the foundation for saved
assessments and an automated demo permission path. The bounded extraction
benchmark follows the reference dataset and does not block the deterministic
demo. COMP8620 is the first proposed complete scenario; its fictional topic
conditions stay separate from published evidence and existing student records.

Selected Llama as requested and proposed `llama3.2:3b` through local Ollama as
the first benchmark baseline, superseding the earlier Qwen candidate. Explained
the separate model weights, inference runtime and application harness. Proposed
ordinary TypeScript coordination with bounded analyst/critic passes using one
loaded model. Kept the website, rule engine and persistence on the existing Fly
app, with local extraction first and a separate inference service only if later
live assistance proves useful. No runtime feature, installer, model download or
deployment was started during this planning turn.

**Verified:**
Re-read the shared harness, earlier assessment, current diff, Fly configuration
and published Crit 7 contract. Read-only hardware checks found 64 GiB RAM and an
RTX 5070 Ti with 16,303 MiB VRAM; Ollama was not found on PATH or at its default
per-user path. Checked Ollama's model package, Windows, CLI and structured-output
documentation: the selected package is about 2 GB and uses the Llama Community
License. Fly's official GPU tutorial now carries a deprecation notice, so it is
not a basis for promising a Fly GPU deployment. Model performance remains
untested. Docker Node 24 / pnpm 11.9.0 `pnpm check` passed with zero diagnostics
and 247 tests. The scoped staged diff check passed; the existing extra blank line
in John's unstaged `AGENTS.md` was preserved along with untracked source assets.

**Commit:** [`e833cf1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/e833cf1)

## 2026-09-26 01:43 — Diagnose Ollama missing from the existing VS Code terminal

**Prompt:**

> I installed Llama in C disk, but in this repo, the terminal in vscode, I input ollama with unrecognized command. I download the setup.exe for windows, not through cli

**Result:**
Confirmed the Windows installer placed Ollama in its default per-user location
and updated the saved user PATH. The existing process PATH lacks that entry.
Tested a process-only PATH addition successfully; recommend the same command in
John's PowerShell terminal or completely reopening VS Code. Clarified that the
installer installs the runtime, while `ollama pull llama3.2:3b` downloads the
chosen model. No permanent environment change or model download was performed.

**Verified:**
The installed executable reports Ollama 0.34.4. `ollama list` returns no installed
models. After appending the install directory to this diagnostic process's PATH,
`Get-Command ollama` resolves it and `ollama --version` succeeds. The unsandboxed
read confirms the saved user PATH entry; the sandboxed registry view did not
expose it. Consulted Ollama's official Windows documentation for installer and
CLI behaviour. No application code was changed. Required Docker Node 24 /
pnpm 11.9.0 `pnpm check` passed with zero diagnostics and 247 tests.

**Commit:** none — read-only diagnosis and a temporary process PATH test; this entry is the only repository change.

**What happened:**
An already-running VS Code process retained its pre-install PATH. Installing
through the graphical Windows installer was correct and did not require a
second CLI installation or moving the executable into the repository.
