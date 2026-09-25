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
