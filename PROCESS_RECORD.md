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

## 2026-09-26 02:03 — Verify local GPU inference and begin unknown eligibility results

**Prompt:**

> Ty, then hardware is set? What should be next move, the previously recorded two branches as process?

**Result:**
Verified a bounded local Llama response, then implemented the first foundation
increment of the agreed sequence. The existing pure evaluator now preserves
met, unmet and unknown results through nested requirement groups, with explicit
fictional-record completeness. Empty groups and absent evidence cannot silently
pass. Unknown does not become an automatic rejection reason, while known unmet
conditions and incompatibilities retain the existing prototype policy.

2027 COMP8620 now represents missing topic-specific prerequisites as an unknown
condition alongside the checkable base prerequisite. A shared checklist displays
the result, next action and source/evidence references on course and request
pages. New requests persist these details in their existing check snapshots;
historical boolean snapshots and 2026 rules retain their meaning. Added a
source-bound reference dataset for COMP6242, COMP8620 and MGMT7020 with six
fictional scenarios. The missing MGMT7020 section remains an inactive reference
case. Updated the shared harness and implementation status to name what remains:
richer operators, versioned rule authoring, complete assessment records, an
automated demo approval path and the Llama extraction benchmark.

**Verified:**
Re-read the published Crit 7 contract, current gate, persistence callers and
saved source paragraphs. Ollama 0.34.4 returned `READY` from `llama3.2:3b`
(`a80c4f17acd5`), with 100% GPU reported by `ollama ps`, 2.3 GB loaded and a
2,048-token context. The cold response took 38.04 seconds, including 20.3 seconds
loading; this verifies setup, not extraction accuracy or steady-state speed.
Docker Node 24 / pnpm 11.9.0 `pnpm check` passed after the final changes: zero
diagnostics, 267 tests across 12 files. New coverage checks the AND/OR truth
table, partial records, empty groups, source identity/version protection, legacy
snapshots and missing prerequisites. Real HTTP checks confirm that COMP8620's
unknown result and next action survive request reloads, while the existing
permission/enrolment flow and historical approval upgrade checks pass. No new
interactive browser walkthrough or LLM extraction benchmark was run. Restarted
only the mounted local preview app, preserving its data volume; the COMP8620
page returned HTTP 200. No deployment or push.

**Commit:** [`4b71983`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/4b71983)

**What happened:**
The first health request immediately after restarting the preview hit a closed
connection during startup. A subsequent request succeeded without another
restart or configuration change.

## 2026-09-26 02:21 — Open the general assessment route and show pending-request reminders

**Prompt:**

> the 8620 is the case of all students required permission code, and yet rest courses, either cannot decide, either passed, either declined, either do not offer.
> Which means actually except global permission code requirement, actually there is no way to send request!
> we can add a reminder of those have already submitted courses, with "You have a processing request, resend requests might slow the process."
> And if the request has a result, no matter declined or approved, then the reminder vanishes.

**Result:**
Corrected request access for offered courses with uninterpreted rules. They now
offer Request assessment and accept it through the same eligibility guard used
by the interface. The first round records unknown conditions and source
references instead of blocking submission or asserting a failed prerequisite.
Known unmet requirements retain their request/dispute route, eligible students
still confirm enrolment directly, and unavailable offerings cannot accept a
request. Updated the shared plan to cover all these cases beyond COMP8620.

Added the pending reminder to the course, request, My requests and My semester
views. It is scoped by the existing student/course/year/term request and rendered
only for pending status. Approval, reviewer rejection and automatic rejection
remove it on the next page load. Duplicate or stale submissions return the
existing pending/approved request without new events, even if a retry contains
an empty explanation. A rejected request stays in history when a new one is
submitted. Requests still use the existing assigned-reviewer route; no automated
final judgement or Llama rule extraction was claimed or added in this turn.

**Verified:**
Re-read the published Crit 7 contract and inspected the request form, pure gate,
submission guard, offering checks and stored request states. Docker Node 24 /
pnpm 11.9.0 `pnpm check` passed after the final changes: zero diagnostics,
272 tests across 13 files. New real-HTTP cases cover unknown-course submission,
source/check persistence, simultaneous duplicate retries, unchanged event counts,
student isolation, pending notices on all four views, disappearance after both
decision outcomes, fresh requests after rejection and automatic rejection.
Existing year-scope, authentication, historical approval and offering checks
remain green. Restarted the mounted local preview without replacing its volume;
ENGN6627 returned HTTP 200. No interactive browser walkthrough, deployment or
push was performed.

**Commit:** [`436b4d0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/436b4d0)

**What happened:**
John exposed a gap beyond the permission-always example. Known failed checks
already had a request route, but the earlier catalogue-import boundary blocked
uninterpreted courses in both the form and API. Replaced that blanket block with
an explicit assessment request while preserving unknown evidence and keeping
direct enrolment unavailable until a valid decision exists.

## 2026-09-26 02:56 — Saved demo decisions with student explanations kept separate from facts

**Prompt:**

> Yes please, and one variable I just noticed, there are request message from student, which is impredicatible for model? IF we need to take it into consideration, or take a small weight on this response?

**Result:**
Implemented the agreed first automated-decision increment. Course requests now
default to an immediate saved demo assessment; optional staff review is explicitly
labelled as an unstaffed queue. An owner can move an existing pending request to
automatic assessment while retaining its original checks and timeline. Reports
save the selected offering, rule tree and digest, academic record, request reason,
explanation, policy version, condition results and next steps. Generated migration
0006 adds nullable report/scenario fields and an idempotency identity without
rewriting historical decisions.

Student prose receives no numeric weight. The form explicitly distinguishes
recorded checks, record correction, equivalent study and exceptions. The latter
three need evidence or an authorised decision; persuasive wording cannot create
a pass, equivalence or permission. The original text is preserved as self-reported
context, and the interface says that it is not interpreted or verified. No Llama
call is made. Recorded statement-variation and claim-extraction cases for the
later model benchmark in the shared implementation plan.

Added `/demo/`: source-bound COMP8620 base requirements, an explicitly fictional
COMP6670 topic condition and separate fictional record, automatic scenario
permission, then explicit scenario enrolment confirmation. Its permission cannot
authorise profile enrolment or alter a transcript. General unmet/unknown results
give reasons and next actions without inventing a convenor decision or pending
processing. Identical requests and confirmation retries preserve a single result.
Automatic issuance requires a versioned source interpretation or the isolated
scenario; the old 2026 first-round transcriptions cannot acquire new automatic
approval. Historical human approvals retain their original offering scope.

**Verified:**
Re-read the published Crit 7 contract and shared harness. Final Docker Node 24 /
pnpm 11.9.0 `pnpm check`: zero errors, warnings or hints; 287 tests across 14 files.
Coverage includes statement variations and embedded instructions, source drift,
unmet/disputed/unknown reports, escaped text, privacy, offering/year isolation,
duplicate submissions, explicit confirmation, snapshot persistence after a later
enrolment, pending-to-automatic conversion and historical database upgrades.
Existing staff-flow tests explicitly select that supported route.

A hidden Chrome profile with JavaScript disabled submitted the real scenario
form, received permission, confirmed scenario enrolment and retained the result
after reload. A second real form produced an incomplete record-correction report
with no pending reminder. Inspected screenshots at 1440x1000 and 390x844; mobile
content width stayed at 390 pixels, including opened report details. Browser
fixtures and their local SMTP sink used a separate disposable database, not the
preview account data. Stopped that review server afterwards.

Backed up the preview SQLite volume, restarted the checked build, and confirmed
all pre-existing user/request records were retained, with zero foreign-key
violations. The local `/demo/` returned HTTP 200. User activity appended an
enrolment and selections during the check; those additions were preserved.
No deployment, push or Llama accuracy claim.

**Commit:** [`2eff987`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/2eff987)

**What happened:**
The first check found two old tests assuming the staff route remained the default
and a new privacy test expecting 200 where the application correctly returned
404. Corrected the expectations without weakening the access boundary. A quoted
selector in the disposable Chrome driver also needed correction. The initial
whole-table preservation check flagged regenerated seed row IDs and later live
user additions; inspection distinguished those from the unchanged original user
records. No database rollback or manual record repair was needed.

## 2026-09-26 03:15 — COMP7710 gets its actual conflict check and course codes lead request pages

**Prompt:**

> I tried COMP7710, but this time it doesn't work. If you are showing me about the format?
> could you place COMP8620 bigger? Like a phrase in capital position, but it is small, not good in looking!

**Result:**
Found that COMP7710's saved page existed but had no executable interpretation.
Its request had persisted an unknown result despite the fictional profile already
containing a COMP6710 pass. Added the eighteenth source-bound 2027 interpretation:
COMP1110, COMP1140 and COMP6710 exclude COMP7710 when completed or currently
enrolled. Extended the pure evaluator to distinguish completion exclusions from
concurrent-enrolment exclusions, with current enrolments scoped to the selected
year and term. A compatible complete record can enrol directly; a conflict gets
an explicit result and applicable next action. No blanket permission requirement
or waiver is invented. Historical reports remain unchanged.

Corrected the unknown-rule fallback to identify missing application coverage
instead of implying that a rewritten student explanation can supply an absent
rule interpretation. Incompatibility results now suggest compatible study or a
record correction, rather than telling students to complete more prerequisites.
Clarified in the shared harness that the complete COMP8620 scenario does not mean
every catalogue course is encoded or that a general Llama reviewer is running.

Made the course code the primary request-page heading, with the request label and
course title beneath it. The small card-code style no longer controls the heading.

**Verified:**
Re-read the published Crit 7 contract, the supplied COMP7710 source paragraph and
the local request's stored gate without printing account details or the statement.
The rule binds source hash `26e64aa8e5553b48734121517dc2edf47a6de0b78f8faccb989bd6204403e046`,
requisite block 0. Docker Node 24 / pnpm 11.9.0 `pnpm check` passed with zero
diagnostics and 299 tests across 15 files. New checks cover each conflicting code,
completed versus enrolled results, failed attempts, partial records, source drift,
year/term scope, direct enrolment with reload persistence, specific rejection
feedback and record-dispute handling. Existing rules and workflow tests remain
green; completion-only exclusions do not gain new concurrent semantics.

Submitted the real forms in isolated Chrome with JavaScript disabled. COMP7710
reported the COMP6710 conflict and a relevant next step. Inspected request pages
at 1440x1000 and 390x844: COMP8620 measured 60px and 40px respectively, with its
label at 17.6px and no mobile page overflow. Browser tests used a disposable DB
and local mail sink. Stopped the test server, refreshed the existing local preview
without replacing its volume, and received HTTP 200 for COMP7710. No push or
deployment.

**Commit:** [`b908819`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/b908819)

**What happened:**
John's request exposed an overbroad impression from the previous increment: a
working report workflow and one complete scenario did not provide general course
rule coverage. The generic incomplete result also directed attention toward the
student's evidence when the missing work was the app's interpretation. Addressed
that distinction and the specific COMP7710 rule, without claiming all remaining
course conditions are now implemented.

## 2026-09-26 03:57 — Visible confirmations and saved course candidates

**Prompt:**

> if you can use the previous font and gold color for the COMP7710? Yes it is bigger, but turns black haha.
> the enrolled COMP8620, I accepted but not on the list.
> the My semester section, if it needs like rewording? ... It is just like a candidate for courses?

**Result:**
Restored the request heading's Georgia serif and gold colour while keeping its
60px desktop / 40px phone scale. Renamed My semester to My courses, with separate
saved candidates, confirmed academic enrolments and completed demo scenarios.
Confirmed enrolments are read independently of saved selections, so removing a
selection cannot hide an enrolment. Navigation, saving buttons and the guide now
describe this distinction.

The reported COMP8620 confirmation already existed as a scenario-enrolled event;
the profile omitted this deliberately isolated example. Added visible completion
history to My profile and My courses and a confirmed badge in My requests. Kept
scenario evidence separate from academic enrolments and eligibility rather than
promoting its invented topic assumptions into the student's record. One shared
status presenter now distinguishes an approved permission from a subsequently
confirmed enrolment. An automatic exception result says Exception decision needed
and explicitly states that no staff review is in progress. The academic check and
the unresolved waiver remain separate, with saved reports and events preserved.

**Verified:**
Read the shared harness and published Crit 7 contract. Read-only inspection of the
local request states found an undecided COMP7710 exception, a confirmed COMP8620
scenario, and a separate COMP8620 request still with its convenor. The same states
remained after restarting the preview; no database repair or migration was needed.

Docker Node 24 / pnpm 11.9.0 `pnpm check` passed: zero diagnostics across 81 files,
300 tests across 16 test files. HTTP checks cover saving and confirming separate
offerings, removing selections without losing enrolments, approval before versus
after confirmation, scenario completion visibility and privacy, blocked use of
scenario permission for normal enrolment, coexisting staff requests, and consistent
exception labels without pending reminders. Earlier reports retain their results.

Used real Chrome form submissions with JavaScript disabled against a disposable
database and local email sink. Inspected screenshots at 1440x1000 and 390x844:
COMP7710 uses Georgia and rgb(117, 96, 55), at 60px and 40px respectively. Confirmed
the scenario, found it in My profile, saved and directly enrolled in COMP6466,
and checked the three course groups and request badges. No page overflow. Stopped
the disposable preview; the existing preview at 127.0.0.1:4323 serves the updated
guide with HTTP 200. No push or deployment, and no Claude review was performed.

**Commit:** [`55ff703`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/55ff703)

**What happened:**
John caught a visual regression from the previous heading change: larger type had
also become black sans serif. Scenario isolation also hid useful completion
feedback, while My semester mixed candidates and confirmed courses. Two initial
test assertions used the wrong semester wording and a request reason that did not
produce the intended staff-pending fixture; corrected those fixtures. A subsequent
JSDOM equality selector failed on a query-string href despite the actual attribute
matching, confirmed by a separate diagnostic; now the test asserts the attribute
directly. The browser harness initially treated the ordinary 15px desktop scrollbar
as a width failure. Corrected that assertion to detect overflow rather than demand
equal widths, then completed the browser check with another isolated fixture.

## 2026-09-26 04:47 — Source-bound eligibility across all 80 courses

**Prompt:**

> Ty, and if we can propagate to all courses? You mentioned many courses info is not get encoded?

**Result:**
Expanded the 2027 rule dataset from 18 to all 80 supplied course versions, retaining
the original 18 rule trees. There are 62 fully encoded prototype interpretations,
16 containing specific unknown conditions or ambiguous groups, and two missing
requisite sections (MGMT7020 and REGN8014). Each interpretation retains its source
hash and a note explaining its boundaries. Missing text never becomes an empty
successful checklist. Raw downloads and duplicate provenance remain untouched.

Extended the shared evaluator with conditional permission, corequisite use in
the new course rules, explicit credit-choice groups, distinct-course counts,
program exclusions and postgraduate career. Duplicate completion rows cannot
manufacture additional credit. Ambiguous AND/OR wording retains plausible readings:
the result is definite only when those readings agree. Unknown GPA, exact marks,
topic announcements, equivalence, project approval or competitive selection keeps
its own explanation and next action. No model interprets student statements or
issues decisions. Offered-course checks still prevent unavailable enrolments.

The course library and enrolment pages show coverage, and nested requirements can
be expanded. Ordinary source-bound permission courses now complete the profile
workflow under demo-permission-v2 when all recorded conditions are met. Conditional
permission is distinguished from permission required for everyone. Historical v1
reports, staff requests and the separate COMP8620 scenario remain unchanged.

**Verified:**
Read the shared harness, published Crit 7 contract and saved source paragraphs.
Docker Node 24 / pnpm 11.9.0 `pnpm check` passed: zero errors, warnings or hints
across 83 files; 413 tests across 18 test files. Coverage tests check all 80 source
identities and explicit course mentions, 91 manually authored record examples,
unknown propagation, ambiguous readings and conditional permission. HTTP tests
cover COMP6120's same-offering corequisite, preservation of an earlier denial,
COMP8820 approval before versus after confirmation, student/term isolation and
unavailable COMP8712. Compared the previous 18 rule trees with the expanded file:
all 18 remain semantically identical. The staged diff passed whitespace checks.

Used real Chrome forms with JavaScript disabled against a disposable database and
local email sink. Confirmed COMP6120's unmet-record denial, COMP8820's ordinary
permission and confirmed profile enrolment after reload, and MATH6005's unresolved
college evidence. Expanded COMP8800's nested conditions and inspected the missing
MGMT7020 source explanation. Desktop 1440x1000 and phone 390x844 checks passed;
the mobile pages had no horizontal page overflow. Inspected profile and assessment
screenshots. Stopped the disposable preview, refreshed the existing local preview
at 127.0.0.1:4323 and verified the updated guide returned HTTP 200. Read-only checks
confirmed existing requests, events and scenario confirmation were preserved.
No push or deployment, and no Claude review was performed.

**Commit:** [`33722e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/33722e3)

**What happened:**
Typechecking caught an insufficient undefined guard in the missing-source loader;
made the guard explicit. An HTTP test initially assumed COMP6120 was offered in
Semester 1. The application correctly refused that request: the saved page offers
Semester 2. Corrected the fixture and tested that a Semester 1 corequisite does not
qualify a Semester 2 request, keeping the availability and term boundaries intact.
Several old tests used newly encoded courses as missing-rule examples; replaced
those examples with actual source gaps or explicit unresolved evidence conditions.

## 2026-09-26 05:10 — Invited reviewers and explicit exception routing

**Prompt:**

> I think this part, can be finished? And in your opinion, the human reviewer, you thought there will be, if we can add this? BUt how to register as a reviewer like the convenor you set for those courses?

**Result:**
Confirmed the saved-catalogue encoding increment is complete within its documented
evidence limits. The existing human queue, invitation, sign-in and decision flow
already provide the requested reviewer role. Kept public registration student-only
and explained the operator-issued invitation instead of adding a public staff-role
selector. A tester can act as a fictional convenor; no real ANU staffing is implied.
Expanded the setup guide with separate browser sessions, existing-invitation
recovery, COMP8620/COMP7710 assignments and the explicit Send to convenor action.
Corrected its stale 2026-only dataset description to match the current catalogue.

Found and fixed a route gap: choosing exception or equivalent study could still
trigger the automatic first-round rejection on an incompatibility. The optional
staff path now accepts all three explicit judgement reasons, including record
correction, without changing failed/unknown checks or granting permission. The
selected reason is recorded in a student event and retained in the form for
switching back to automatic assessment. Existing automatic reports are preserved.

**Verified:**
Read CLAUDE.md, the published Crit 7 contract, invitation/authentication code,
reviewer queue, decision handlers and account tests. Read-only inspection of the
local database found an unverified account for Dr Rowan Ellis (COMP8620, ID 1)
and no account for Dr Hana Okafor (COMP7710, ID 4). No account was created, promoted
or activated, and no invitation was sent to the user's local or external inbox.

Docker Node 24 / pnpm 11.9.0 `pnpm check` passed: zero diagnostics across 83 files,
416 tests across 18 test files. Three added HTTP scenarios verify a recorded
COMP6710 incompatibility remains visible when a COMP7710 judgement request reaches
Dr Hana Okafor. They cover reason preservation, an ignored forged convenor ID,
wrong-reviewer rejection, duplicate pending requests, approval followed by explicit
profile enrolment, mandatory rejection feedback and conversion back to automatic
assessment. Earlier automatic denials retain their original result. Existing
invitation activation, access boundary and persistence tests also passed.

Refreshed the local preview and confirmed HTTP 200 on sign-in and unchanged
reviewer setup/pending counts. No new browser visual pass was run: this turn
changed routing and explanatory copy, not authentication headers or layout.
The staged diff passed whitespace checks. No push, deployment or Claude review.

**Commit:** [`4fbd143`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/4fbd143)

**What happened:**
Reviewing how to register a human reviewer exposed that only the older
record-correction flag bypassed first-round rejection. A student asking for an
exception would otherwise have needed to mislabel it as an incorrect record to
reach the reviewer. Corrected that distinction before documenting the workflow.
The published-spec web tool failed; the same endpoint was read successfully
through Invoke-RestMethod. An initial patch failed its context check and made no
changes; reapplied it against the actual harness text before running the checks.

## 2026-09-26 05:27 — Explicit invitation switching and a browseable reviewer catalogue

**Prompt:**

> if I am logged as a student, then I clicked the reviewer link, it is ineffective, I think it should pop out a window like please log out or something equivalent?
> the Course Catalogue, it cannot be interacted, I clicked the button and find will be routed into review requests.
> after deployment, how should we let teaching team(marker) know how to get access to reviewer?

John selected: "Invite each marker's real @anu.edu.au address; they verify it and
create their own password."

**Result:**
Verification now displays the active identity and an explicit Sign out and
continue step. Its POST revokes the current session and preserves the unused
verification token. The verification endpoint also rejects activation during an
active session, so a stale or crafted form cannot skip the prompt. Expired or
already-used links explain how to leave the current account and sign in again.
The return path accepts only a verification token, never an arbitrary URL.

Moved the reviewer landing-page choice into successful sign-in, removing the
unconditional queue redirect from the course catalogue. Reviewers can browse and
search course information while student enrolment actions remain unavailable.
The queue lists assigned courses in expandable details. Its empty state explains
Optional staff review / Send to convenor and that automatic reports do not enter
the human queue. An empty Hana queue is valid when no student has sent her a
staff request; no fake pending request was added to the user's preview.

Added public teaching-team guidance to Help, linked from sign-in, and documented
the selected real-inbox invitation procedure. The current one-role-per-email and
one-account-per-convenor limits are explicit. Production SMTP delivery, actual
marker recipients and administrative provisioning against the deployed database
are deployment tasks; the lean production image does not contain the development
invitation script or tsx. No production access or email delivery is claimed.

**Verified:**
Read the shared harness, published Crit 7 contract, auth handlers, navigation and
existing reviewer tests. Final Docker Node 24 / pnpm 11.9.0 `pnpm check` passed:
zero diagnostics across 83 files; 417 tests across 18 files. Extended HTTP tests
cover signed-in students/reviewers opening invitations, blocked activation without
token consumption, explicit logout and session revocation, cross-origin rejection,
expired-link guidance, reviewer login destination, catalogue navigation/search,
assigned-course isolation and an empty queue. The staged diff passed whitespace
checks.

Used real Chrome forms with JavaScript disabled on an isolated database and SMTP
capture server: registered and verified a student; opened a reviewer invitation in
that student session; signed out explicitly; activated and signed in as Hana;
browsed/searched the catalogue; submitted a COMP7710 exception from a separate
student session; approved it as Hana; confirmed enrolment and reloaded the student
profile. All three verification/logout POSTs returned 303 with the correct Origin
and no token in Referer. The mobile catalogue width was 390px at a 390px viewport.
Inspected desktop 1440x1000 invitation/catalogue and phone 390x844 queue screenshots.

Stopped the disposable server, refreshed the local preview, and confirmed HTTP 200
and the new guidance. Read-only inspection found Hana's existing account verified
with no pending requests, matching John's screenshot. No user accounts or requests
were altered by the browser tests. No real emails, push, deployment or Claude review.

**Commit:** [`0660604`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/0660604)

**What happened:**
The invitation page forced an anonymous header even while a student session was
active; activation then led to sign-in, which redirected that existing student.
The reviewer landing redirect also intercepted the catalogue navigation link.
John found both through actual use after the previous checks had passed. Extended
coverage around those paths. After the first green suite, added the already-used
link case and reran the full check on the final code. The first local readiness
probe raced the server restart; a subsequent probe returned HTTP 200.

## 2026-09-26 06:06 — Count enrolled units and assess overload separately

**Prompt:**

> I just recall the ANU has a limitation of 24 credits per semester, which equals
> to 4 courses. So we cannot choose unlimitedly. And there is another overload
> section, but needs approval. I saved the overload page into the ./assets/Overload
> Spec, could you check and add this function?

John selected **Immediate assessment plus optional human review.** He asked for
the normal fifth-course block and a short explanation instead of a separate
lengthy application.

**Result:**
Read the saved information page and encoded a versioned interpretation, preserving
its hash and source clauses. Its rules are more than a four-course counter: 24
units per semester/half-year, non-standard-session overlap, a 36-unit ceiling,
UG/PG completed-unit and average thresholds, late-enrolment discretion, and a
special final-30-unit completion request. The linked full policy and appeals
procedure were not imported. No live ANU crawl or future-policy verification is
claimed; the source interpretation and limits are in `docs/overload-design.md`.

Confirmed enrolments now share a transactional load guard, including those with
course permission codes. Saved candidates remain available for planning. Semester
groups, date overlap and credit values are computed separately from academic
eligibility. A 12-unit course counts correctly. COMP8820's 6–24-unit range now
requires an explicit validated credit value; the whole-unit range picker is a
labelled prototype convention, not a claim about the teaching team's class
options. Unknown historical variable-unit loads are not silently filled in.

Added Study load, a short request form, immutable automatic reports, an optional
human-review action, status history and scoped 30/36-unit approvals. Dr Avery Hart
is the separate fictional program-load reviewer, invited through the existing
email flow and landing on the overload queue. Course convenors cannot decide
these requests. Approval still requires the student to return and explicitly
confirm the course. Pending retries reuse the current half-year request and
decisions remove the pending notice.

Generated migration 0007 adds the new requests/events, reviewer purpose, saved
enrolment units and nullable exact-mark/program/institution evidence. Existing
fictional grades were not converted to fabricated marks. Missing evidence stays
visible; a student message cannot change academic facts. Current grade-only
profiles therefore often need evidence or discretionary review. Cross-institutional
imports, degree-completion auditing, evidence editing and appeals remain absent.
No model makes overload decisions.

**Verified:**
Read CLAUDE.md, AGENTS.md, the published Crit 7 contract and the supplied overload
page. Docker Node 24 / pnpm 11.9.0 `pnpm check` passed with zero diagnostics across
94 files and 449 tests across 20 files. New pure checks cover 24/30/36 boundaries,
12-unit courses, half-year/year scope, non-overlap and uncertain dates, missing
marks, NCN/WN, credit attribution, repeats, UG/PG thresholds, weighting ambiguity,
late evidence and final-30 discretion. HTTP checks cover blocked direct/permission
enrolment, immutable reports, explicit review, role isolation, required decision
notes, automatic approval, later confirmation, reloads and competing submissions.
The populated historical migration test preserves existing state; all new pages
remain in the accessibility invariants. Staged whitespace checks passed.

Chrome with JavaScript disabled, a disposable database and captured SMTP mail:
verified and signed in a student with a 24-unit fixture; blocked COMP6800; submitted
an overload explanation; received an evidence-needed report; sent it for review;
activated and signed in the invited Avery account; approved 30 units; returned as
the student and explicitly confirmed COMP6800. All eight native POSTs returned
303 with the expected Origin and no token in Referer. A later six-unit COMP8820
selection showed 36 units against the approved 30-unit cap. Screenshots covered
form, report, queue and confirmation at 1440x1000 and 390x844, with no horizontal
page overflow; inspected desktop form/queue and mobile report visually.

Backed up the real local preview database before migration. After catalogue
initialisation, hashes confirmed preservation of all 10 accounts, 10 course
requests, 32 request events, three non-seed enrolments, eight registered profiles,
48 registered transcript rows and eight selections; foreign-key check returned
zero errors. Local `/` and `/guide/` returned 200 with the new guidance. Avery is
available but uninvited in this local database. Stopped the disposable browser
server. No production invitations, deployment, push or Claude review occurred.

**Commit:** [`88f6f50`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/88f6f50)

**What happened:**
The first full check passed 446 tests and failed three. One existing permission
flow exposed the previously unselected variable credit value on COMP8820; added
the explicit range choice instead of assuming six units. Two new checks had
incorrect fixture assumptions: the blocked form is absent rather than disabled,
and COMP6780 has no recorded 2027 offering. Corrected the assertions and used
actual offered courses before accepting the 449-test run. The first backup
attempt could not write through the preview's read-only source mount; the backup
succeeded through a helper with the data volume read-only and ignored backup
directory writable. The Help route did not initialise the lazy database module;
loading the catalogue applied migration/seed before the preservation check.

## 2026-09-26 13:30 — Drop and swap without losing the original enrolment

**Prompt:**

> I think should add two functions, which are drop course and swap the course.
> In My courses, and the My profile, the confirmed enrolments and Demo scenario completions, those parts are not apparent.
> could you try to use the ./assets/ANU_Primary_Vertical_GoldWhite.eps as ANU logo?
> this part is my idea you can save and act in next stage

John also proposed a coherent fictional 2026 history, preset 2027 S1, an assigned
specialisation and useful course suggestions for 2027 S2, without guaranteeing
graduation on time. That direction was recorded rather than implemented now.

**Result:**
Confirmed enrolments now offer Drop and Swap on both My courses and My profile.
Drop has explicit confirmation, releases the enrolled units and removes the
saved selection while keeping permission decisions and history. Swap previews
an available replacement in the same year/session and checks eligibility,
permission and the load after replacement. The final write rechecks inside an
immediate transaction: a failed replacement leaves the old enrolment intact.
Equal-unit swaps can therefore succeed at the normal 24-unit limit.

Kept courses retain satisfied concurrent prerequisites, and their own published
concurrent incompatibilities can block a replacement. These checks do not invent
the inverse exclusion on courses with completion-only rules. Missing variable
credit values get an explicit range prompt. Source links remain on replacement
checks. The feature does not model university withdrawal deadlines, fees or
transcript penalties; John's account of the current portal is motivation rather
than verification of ANU's implementation.

Generated migration 0008 adds ended state, revisions and enrolment events.
Re-enrolment reactivates the offering with a new revision; old forms cannot end
the new enrolment. Relevant course-permission and linked overload timelines
retain the change without rewriting assessments. Seed now inserts original
enrolments only when absent, so a dropped seed course cannot reappear on restart.

Count links, prominent panels and larger gold course codes make confirmed courses
and completed demos visible before saved candidates or academic result tables.
The demo panel is visible when empty and states that it uses zero load units.
Converted the supplied EPS through TeX Live epstopdf and Poppler pdftocairo to a
committed vector SVG for the shared header, retaining the independent-prototype
label. No logo was redrawn or generated.

Recorded the next stage in `docs/profile-suggestions-next-stage.md` and linked it
from CLAUDE.md: versioned fictional templates, separate completed/current study,
explicit historical assumptions, source-year specialisations, prerequisite-aware
suggestions and later alternatives. Existing profiles and the selected semester
were not migrated to the proposed 2027 S2 example.

**Verified:**
Read the shared harness and published Crit 7 contract. Docker Node 24 / pnpm
11.9.0 `pnpm check` passed: zero diagnostics across 99 files and 471 tests across
21 files. HTTP tests exercise the 24-unit swap, persistent drop and re-enrolment,
stale revisions, competing changes, ownership and reviewer rejection, unavailable
or foreign-session replacements, permission and variable-unit requirements,
concurrent dependencies and incompatibilities. A deliberately rejected SQLite
replacement write returns 500 and rolls the outgoing change/events back. The
overload journey confirms a drop appears in its timeline while the original
report and approval remain unchanged. Repeated seed tests retain ended rows and
their events. New pages are included in the accessibility invariants.

Claude actually returned a bounded read-only review through the installed CLI.
It verified rollback/savepoint behaviour, stale-form protection, ownership and
additive migration. Its findings covered kept-course concurrent exclusions,
missing overload drop/swap events, variable-unit wording, source references and
transaction/timestamp consistency. Addressed these before the passing run; no
Claude edits or independent Claude test execution are claimed.

Chrome with JavaScript disabled and fixture sessions on a disposable database:
blocked an oversized swap, swapped at 24 units, cancelled a drop, confirmed a
drop to 18 units and reloaded, then completed a separate COMP8620 demo. Both pages
showed three confirmed courses and one demo. All four native POSTs returned 303.
Captured My courses, My profile, swap and drop at 1440x1000 and 390x844, with no
horizontal page overflow. Visually inspected the final desktop course page and
mobile profile, including the supplied logo and corrected demo row alignment.

Backed up the actual local preview database before migration. After restart and
catalogue initialisation, hashes preserved all 10 accounts, 10 course requests,
32 request events, seven enrolments including seed rows, eight registered
profiles, 48 registered transcript rows, nine selections, one overload request
and three overload events. Foreign-key check returned zero errors. Local home,
Help and SVG returned 200. Stopped the disposable server. Staged whitespace
checks passed. No deployment or push; John's assets and pre-existing AGENTS.md
change were left outside this commit.

**Commit:** [`dc4aae8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/dc4aae8), [`6593ecf`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/6593ecf)

**What happened:**
Early tests incorrectly assumed COMP6528 was ineligible for VCOMP; used an
actually unmet ENGN6627 case instead. The rollback fault initially expected a
user-error redirect, but operational errors correctly propagate as 500; changed
that assertion while retaining rollback verification. A later MCOMP concurrency
fixture could not directly enrol COMP6442, so its unrelated outgoing course was
changed to the eligible COMP6528. A long overload HTTP journey exceeded Vitest's
five-second default under concurrent load; gave that test a bounded 15-second
timeout without removing assertions. Browser inspection caught a detached
semester label in the demo row, which was grouped with its course information.
The final disposable server initially lacked MAIL_FROM because its launch used
SMTP_FROM; corrected the test launch and reran the browser journey successfully.
The required repeat before the record commit exposed a separate existing
assessment journey's five-second timeout (470 passed, one timed out). Limited
Vitest to four workers because its HTTP suites share one app server and run
JSDOM/axe concurrently. The full check then passed all 471 tests; cumulative
test execution time fell from 80.41 to 33.01 seconds, with wall time 14.12 seconds.
Assertions and the ordinary five-second test timeout remain intact.

## 2026-09-26 13:59 — A generated record that leaves room for the degree

**Prompt:**

> Wow good! Then next stage implementation please, and if you have some questions for me? If not then can directly act on it!

This authorises the profile/template and semester-suggestion direction recorded
in the preceding turn, including complete 2026 history, preset 2027 S1 study,
an assigned specialisation and useful 2027 S2 suggestions without promising
on-time graduation. No further preference was needed for the first example.

**Result:**
Implemented VCOMP with the supplied 2027 Artificial Intelligence specialisation.
New registrations receive the reproducible `vcomp-ai-2027-s2-v1` template:
completed 2026 S1/S2 and 2027 S1, 24/18/18 units respectively, 60 units in total.
The scenario date is 1 July 2027. Marks derive consistently from the template,
profile seed and course code; grades and VCOMP/ANU attribution are explicitly
fictional. Generation checks the persistent source versions, prerequisite and
incompatibility rules, semester loads, level mix and 2027 S1 offerings before
writing an account, results, metadata snapshot and creation event atomically.

2026 offerings remain labelled historical assumptions. COMP6250 gets a specific
note because its 2027 page explicitly has no current offerings. It is not an
invented 2027 offering, and COMP8280 is never substituted for COMP8260. Existing
accounts and grade-only records are preserved, with no invented marks or new
history. Existing VCOMP users can save an AI focus and semester against their
own stored fictional record.

My profile now offers source-linked suggestions, partial requirement progress,
permission/evidence next steps and later offering gaps. The deterministic engine
uses the existing eligibility gate; current enrolments, saved candidates and
future results cannot become passed prerequisites. It composes compatible options
within the confirmed/approved load, reserves suggestion space for saved courses,
and leaves degree space for the compulsory research project. Saving an option
still only creates a candidate. Explicit enrolment confirmation remains separate.

The reviewed source-bound degree/AI definition uses exclusive credit buckets and
the 8000-level threshold as an overlay. AI foundation credit is capped at 12;
surplus is visible. Duplicate rows cannot manufacture credit; the repeatable
project needs distinct consecutive 12-unit semester results. GPA, supervision,
project approval, credit substitutions and graduation remain unverified. The
ordinary course gate still does not authorise repeated project enrolment after
a completion, so guidance identifies the continuation requirement without
claiming that workflow is implemented.

Generated migration 0009 adds planning metadata and preference events without
altering existing tables. Preferences survive reload and reseed. 2028 planning
uses indicative class rows in the 2027 sources and provides evidence links,
without enrolment/save controls or invented 2028 rules. Find courses follows a
saved preference within its supported catalogue year; All terms still overrides
it. No LLM generates academic facts or decides suggestions.

**Verified:**
Read CLAUDE.md, AGENTS.md, the recorded plan, the published Crit 7 contract and
the supplied offline degree, specialisation and course evidence. Claude returned
a real bounded read-only source review through the installed CLI, confirming the
draft prerequisite chains but identifying level-mix, AI-cap, project, historical
offering and ambiguous-rule issues. The draft was corrected in response; Claude
did not edit files or independently test the final implementation.

Docker Node 24 / pnpm 11.9.0 `pnpm check` passed with zero diagnostics across 106
files and 484 tests across 23 files. New checks cover reproducible marks, source
changes/conflicts, chronological prerequisites, unavailable offerings, AI caps,
duplicate and consecutive-project credit, a missing COMP6670 bottleneck,
permission/unknown cases, load and saved candidates, project-space reservation,
later indicative options, preference ownership/CSRF, and preservation of generated
snapshots and results through repeated migrations/reseeds. Registration tests
verify the stored 60-unit/10-result template and 2027 S2 preference.

Chrome with JavaScript disabled on a disposable database and captured SMTP mail:
registered, verified and signed in a new student; inspected the completed
scenario and progress; saved suggested COMP8539 without enrolment; explicitly
enrolled from its course page; reloaded; switched to 2028 S1 and confirmed the
future options have no enrolment controls. All six native POSTs returned 303,
carried the expected Origin and exposed no verification token in Referer. Ten
academic-result rows remained ten after enrolment. Also inspected an existing
fixture profile without rewriting its record. Screenshots at 1440x1000 and
390x844 showed no horizontal page overflow; viewed the generated desktop profile
and mobile future-planning page.

Backed up the actual local preview database before migration. After restart and
catalogue initialisation, hashes preserved all 10 accounts, 10 course requests,
32 request events, seven enrolments, eight registered profiles, 48 registered
transcript rows, nine selections, one overload request, three overload events
and the empty enrolment-event table. Foreign-key check returned zero errors.
Home and updated Help returned 200. Stopped the disposable browser server.
Staged whitespace checks passed. Local commits only; no deployment or push.
John's assets, AGENTS.md change and authored reflection files remain untouched.

**Commit:** [`b4e9474`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/b4e9474)

**What happened:**
The first 72-unit draft passed individual course checks but had 66 lower-level
units. Claude caught that reaching the required 48 advanced units would then
take at least 114 units for a 96-unit degree. Replaced that draft with a complete
60-unit record containing 42 lower-level and 18 advanced units, explicitly
labelling its lighter semesters. This preserves room for the 24-unit research
project, one advanced AI course and a further six-unit elective, subject to the
remaining evidence and allocation checks. Suggestions also needed to reserve
that project space, rather than fill every available semester unit with electives.

The first typecheck caught nullable year/session fields in published offering
rows; added explicit validation before using later dates. Browser automation
initially matched both sign-in and resend email inputs; scoped the selector to
the sign-in field and reran with a fresh disposable account. The real browser
workflow and final checks then passed.

## 2026-09-26 14:39 — Interest matching inside the checked course planner

**Prompt:**

> "yes you can do that preference-aware course adviser"
> "After deployment, if they needs to use their own anu emails, or they can register by a fictional email?"

**Result:**
Added Course adviser inside My profile: study-interest text, an explicit personal
unit ceiling, persisted responses, original source excerpts, rechecked suggestions
and a return to standard suggestions. Local compose connects to Windows Ollama
with Llama 3.2 3B. The model selects source passage IDs from a bounded eligible
pool; it cannot write facts, enrolments or permissions. The deterministic planner
checks the combined selection, including personal units, incompatibilities and
degree/project space. Context changes make old advice stale. Courses matched but
left out carry the planner's reason.

Generated migration 0010 stores adviser exchanges, snapshots, model identity and
outcomes separately from academic facts. Planning events record transitions.
Calls have a 45-second deadline, no automatic retry, two global in-flight slots,
a per-student throttle, a recoverable pending lease and conditional completion.
Failed calls fall back to rule-based suggestions. An unconfigured deployment
explicitly offers unit preferences without AI. This is a synchronous bounded
helper, not a durable background-job system or unrestricted chat service.

Recorded the email-access answer and next-stage delivery check: deployed SMTP
verification requires a real inbox at exactly anu.edu.au; local captured email
does not make fictional addresses work publicly. Existing reviewer invitations
still use separate real addresses. No authentication bypass or guest mode added.
Fly model hosting and prerequisite-extraction benchmarking remain separate work.

**Verified:**
Read the shared harness, published Crit 7 JSON contract, current code and Ollama's
official structured-output/generate documentation. Claude returned a bounded
read-only review of the draft through the installed CLI. Applied its conditional
completion, pool bounds, missing-configuration messaging, omitted-match and
provenance improvements. The final source-ID design superseded the draft quotes
Claude inspected; Claude did not independently test the final version.

Docker Node 24 / pnpm 11.9.0 check passed: zero diagnostics across 114 files and
492 tests across 25 files. New coverage checks source identities, conservative
relevance, prompt bounds, prerequisites, lower personal limits, saved/confirmed
load, stale contexts, model failure/timeout, persistence, idempotent retries,
duplicate in-flight submissions, identity/CSRF boundaries and escaped text.
The migration/reseed check now preserves adviser exchanges too.

Four live development smoke cases passed with model digest
a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72:
vision chose COMP8539, software engineering chose COMP6120, guaranteed marks and
rule-override requests produced no accepted match. These cases were used during
development, not held-out accuracy evaluation. The relevance filter can miss
synonyms/acronyms and does not certify semantic understanding.

Chrome with JavaScript disabled used disposable accounts and databases. Verified
live advice, six-unit ceiling, reload, changed interests, explicit save, stale
selection handling and dismissal. Repeated the unit-preference flow without a
configured model. Native POSTs returned 303 with the expected Origin; ten academic
results stayed ten and no enrolments were created. Inspected final 1440x1000 and
390x844 layouts with no horizontal overflow; condensed the initial verbose reply
into a native details section. Stopped the disposable server.

Backed up the real local preview before applying the migration. Preservation
hashes matched all 11 accounts, one study plan/event, ten requests/32 events,
seven enrolments, nine registered profiles/58 result rows, nine selections and
one overload request/three events; foreign-key errors zero. Refreshed local
preview and Help returned 200; the main app reached llama3.2:3b. Local commit only,
no push/deployment or real email delivery. User assets and AGENTS.md left intact.

**Commit:** [`09ed6c1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/09ed6c1)

**What happened:**
The initial live model design failed all four cases: copied quotations were
paraphrased/invented and courses duplicated. Replaced free-text quotes with
source-passage selection and program-rendered original text. A subsequent trial
still selected irrelevant passages for difficulty/override requests; added a
conservative shared-subject-word filter. Its first draft accidentally treated
common words such as "the" and "and" as subjects; corrected the stop-word list.

The first full test run found three failures with the same cause: passing a
six-unit preference as the institutional limit still permitted twelve units,
because the overload evaluator correctly clamps its normal limit to at least
24. Introduced a separate personal ceiling in the planner and retained the
institutional policy unchanged. Targeted checks then passed. A later typecheck
caught a synthetic pool-size fixture missing CourseRules.text; corrected that
fixture and reran the full successful check. The user's pre-existing AGENTS.md
trailing blank still fails an unstaged whitespace check; the staged work passed.

## 2026-09-26 15:36 — Private mini-PC inference for the course adviser

**Prompt:**

> Yes please, could you do that?

John approved incorporating the required proxy Host header into the app and
benchmarking the actual adviser on his Ryzen 5 7430U / 16 GB Windows mini PC.
The previous turn had established that Tailscale reached Ollama, but a normal
request returned 403 while curl with the local Host header returned 200.

**Result:**
Added optional server-side OLLAMA_HOST_HEADER for discovery and generation.
Native HTTP/HTTPS is used only for this override; default connections retain
fetch. TLS SNI and certificate verification use the endpoint hostname, independently
of the forwarded Host. Redirects are not followed and the existing abort signal
covers the response body. Invalid authorities fail before transport. Student
form values cannot change connection configuration, and academic decision rules
and the 45-second request deadline remain unchanged.

Compose now accepts optional connection variables. The ignored
`.env.adviser-minipc` selects John's private endpoint; the running local preview
was recreated with this file. The example configuration, shared harness and
adviser documentation explain the proxy setup, first-prompt cost and deployment
boundary. Fly still needs private network access; nothing was pushed or deployed.

**Verified:**
Read CLAUDE.md, the published Crit 7 contract, existing diff and transport/tests.
Docker Node 24 / pnpm 11.9.0 check passed with zero diagnostics in 115 files and
495 tests across 25 files. Real HTTP tests cover direct and proxy connections,
wire-level Host enforcement, malformed configuration, redirect rejection and
abort during a stalled response body. The built app's model fixture now requires
the Host override, so the existing persistence/identity/fallback flow tests
exercise the new transport too.

The four existing fictional development cases all passed through Docker against
the mini PC's Ollama 0.34.4, using the real 13-course pool and model digest
a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72.
Vision matched COMP8539 in 23.855 seconds; software engineering matched COMP6120
in 1.988 seconds; guaranteed marks and instruction override returned no match
in 1.666 and 2.647 seconds. The first request spent 2.57 seconds loading and
19.87 seconds processing the prompt. Later calls reused a warm shared prefix.
The running-model API reported zero VRAM use, about 4.1 GB residency and a
16,384-token context. This is a sequential development smoke test, not a
concurrency test or an independent accuracy benchmark.

Chrome with JavaScript disabled exercised the built app and real mini-PC model
using disposable fixtures: advice, reload, six-unit ceiling, changed interests,
explicit course save, stale advice and dismissal. All four POSTs returned 303;
desktop/mobile widths had no overflow. Ten transcript results remained ten and
no enrolments were created. Stopped the disposable test server afterwards.
Backed up the persistent preview, then compared all 25 table fingerprints after
restart: no differences, zero foreign-key errors, homepage 200. Private addresses
and benchmark/browser evidence stay in ignored local files.

**Commit:** [`5a3a6d0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/5a3a6d0)

**What happened:**
The initial Node 24 fetch probe still returned 403 despite specifying Host;
this ruled out a headers-only change. Native HTTPS initially failed because
Node derived TLS SNI from the upstream Host. Explicit URL-based SNI fixed the
handshake while retaining certificate verification, then the live adviser passed.

The first backup attempt hit the preview container's read-only source mount;
repeated it with a helper that had read-only database access and a writable
evidence directory. A bounded read-only review was requested from the installed
Claude CLI, but it returned no output after several minutes and was stopped.
No Claude review is claimed. John's existing AGENTS.md change and assets were
preserved; only the connection files and this record were staged.

## 2026-09-26 16:06 — Suggestions visible inside the adviser reply

**Prompt:**

> It works, but the output is in See your checked options below? Where is the suggestions?

**Result:**
The adviser now lists the checked course codes, titles and units inside its
reply, with distinct labels for interest matches and other study-plan suggestions.
Each course links to its detailed card; a visible View course details and save
link jumps to the full list. Moved that list immediately after the adviser,
ahead of the completed-study breakdown and graduation-planning note. Empty
results explain the absence of options; stale results hide the old shortlist.
The unit limit is labelled as a maximum rather than a promise to fill all units.
No model prompt, rule, account or database change was needed.

**Verified:**
Read the shared harness, published Crit 7 contract and current rendering path.
Docker Node 24 / pnpm 11.9.0 check passed: zero diagnostics, 495 tests in 25 files.
Used a disposable built app and real mini-PC inference with John's example
interest text and a 24-unit preference. Chrome with JavaScript disabled showed
COMP8539 as an interest match and COMP6120 as a study-plan suggestion inside the
reply. Verified every shortlist anchor had a target and clicked both a course
link and the detail-list link. Reload retained the list; saving a course made
the advice stale and removed the shortlist. All four form POSTs returned 303;
ten academic results remained ten and no enrolments were created.
Inspected 1440-pixel and 390-pixel screenshots with no horizontal overflow.
Stopped the disposable server and restarted the normal local preview; homepage
returned 200. The mini-PC connection and existing data volume were retained.

**Commit:** [`59adefe`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/59adefe)

**What happened:**
John's screenshot showed only a successful matching message and a vague
"See your checked options below" instruction. The course cards existed farther
down the page, separated from the adviser by academic-progress content. The
previous functional checks passed but did not establish that the answer was
easy to find. The correction makes the result explicit at the response point.

## 2026-09-26 16:37 - Aligned course codes and shipping preparation

**Prompt:**

> Wow good, and a minor fix, the font here is not aligned haha, and then we prepare the PROCESS.md and reflections! And prepare the ship, and we fix the SMTP after deployed page. Oh and another thing, the demo column, if after deployed can delete?

John clarified the removable section as the COMP8620 scenario and confirmed
his crit group as "Bada - Monday 15:30".

**Result:**
Suggested course codes use Cambria with lining numerals, preserving their gold
serif appearance while aligning the letter and digit heights. Prepared a concise
PROCESS.md with four real commit citations and a reflection draft based on the
recorded prompts. Personal reflection wording remains for John's review. Kept
the README replacement as a separate draft because the About page is John's
account of the work. The shipping report distinguishes local checks from pending
publication, current-build deployment, production SMTP and Fly-to-mini-PC access.
The Bada cutoff is 28 September at 13:30 Canberra time. The COMP8620 scenario can
be removed from the main interface after the first deployed check while retaining
its history and Help entry; no demo removal was made in this increment.

**Verified:**
Read the shared harness, published Crit 7 contract, assessment guidance and group
schedule, and applied the installed course preflight skill. Docker Node 24 /
pnpm 11.9.0 passed check: zero diagnostics and 495 tests in 25 files. Evidence
checks passed and all four process citations resolve. Chrome with JavaScript
disabled, a disposable test database and real mini-PC inference displayed the
gold course code in the new font at 1920 x 1080 and 390 x 844. Both screenshots
were inspected and neither viewport overflowed horizontally. Stopped the isolated
server and refreshed the normal preview, whose homepage returned 200.

GitHub remains private; after fetching origin there were 28 unpushed commits
before this increment. Existing Fly homepage and CSS returned 200, but that does
not verify this local build. No push, deployment, visibility change or real SMTP
delivery was performed. The preflight report records the plugin update warning
and remaining acceptance steps. Preserved John's unrelated AGENTS.md change.

**Commit:** [`2d757aa`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/2d757aa)

**What happened:**
The secret scanner first flagged credential-like text in untracked raw browser
downloads. Added assets/ to Git ignore without deleting those files; the app uses
the tracked normalized catalogue, and Docker already excluded raw assets. The
rerun completed with two surfaces requiring review: current verify.astro and
publishable history. Both were the URL-token-reading expression, with historical
matches in 0660604 and 20fb86f, not embedded credentials. Its exit code remained
2; the findings were manually classified rather than reported as a clean scan.
The deadline helper lacked jq, so the public group JSON was read directly.

## 2026-09-26 16:55 - Process account follows John's layered decisions

**Prompt:**

> And for PROCESS.md, the second section How I get there, those I think, can introduce the critical decisions and implementations, and how I guide you with ideas including harness.

John requested a brief motivation and rebuild overview, then the progression
from permission requests and persistent data through SMTP verification, real
catalogue evidence, review routes, overload and planning. He highlighted his
manual course downloads, coherent profile generation and mini-PC hosting choice.

**Result:**
Revised PROCESS.md to follow that progression in roughly 270 words. Removed
the agent-collaboration introduction, retained the reported motivation, and
connected each implementation stage to John's direction and actual commits.
Distinguished the explored LLM-review idea from the implemented rule-based
permission/overload assessments and Llama course adviser. Human review remains
an optional route for uncertainty and exceptions, not automatic approval.
The mini-PC avoids paid inference hosting; Fly connectivity remains pending.
README manual work is deferred as requested. Preserved John's removal of the
draft banner and his unrelated AGENTS.md edit.

**Verified:**
Read the current diff, CLAUDE.md, process-record skill, implementation chronology
and cited commits. Docker Node 24 / pnpm 11.9.0 check passed with 495 tests in
25 files; check:evidence resolved all eight PROCESS.md commit citations. No
application code, profile data or deployment changed. The published Crit 7 JSON
could not be re-fetched through either HTTP tool this turn; the contract had
been read during the preceding shipping preparation, and this edit changes no
product scope or course requirements.

**Commit:** [`1f4cb87`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/1f4cb87)

**What happened:**
The previous draft emphasized selected technical corrections and agent
collaboration more than John's layered direction of the rebuild. His revision
request supplied the intended narrative. The revised account keeps the practical
decisions and their evidence without becoming a feature manual or claiming that
an LLM currently approves applications.

## 2026-09-26 17:03 - Recognizable course names in academic results

**Prompt:**

> This is compact, but actually I don't know the courses, and need to check. In your sense, if only use a hyperlink is enough, of show the full name of the course as well?

**Result:**
Academic results now show a linked course code with the full title immediately
underneath. Links open the matching saved catalogue entry. A single note identifies
the 2027 catalogue as the source of names and links, without claiming those pages
establish the historical result terms. Missing catalogue entries stay unlinked;
conflicting titles are not silently resolved. Names wrap within the first column;
the table scrolls horizontally on narrow screens and is keyboard-focusable.
No transcript facts, eligibility rules or database schema changed.

**Verified:**
Docker Node 24 / pnpm 11.9.0 check passed: zero diagnostics and 495 tests in 25
files, including the accessibility invariants. On the disposable preview with
JavaScript disabled, all ten transcript links returned 200 and retained the
correct code and 2027 source year. Clicked COMP6442 and confirmed its Software
Construction heading. The first result remained 2026 S1 and the table retained
ten rows. Inspected 1920 x 1080 and 390 x 844 captures: titles are readable and
the page does not overflow horizontally; the mobile table can scroll to its
last column. Repeated browser checks on the corrected build, stopped the test
server and refreshed the normal local preview. Preserved John's concurrent
PROCESS.md, reflection and AGENTS.md edits.

**Commit:** [`4975f62`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/4975f62)

**What happened:**
The first check found a duplicate accessible name between the results section
and its new scrollable region. Gave the table region its own distinct name;
the complete check then passed. A bare code link would still require opening
each page to identify a course, so the title remains visible in the table.

## 2026-09-26 17:20 - A public manual for students and reviewers

**Prompt:**

> Good, and if you can draft the README.md as manual? Introduce the core of the site, the purpose, and how to use it properly, as students and reviewers!

**Result:**
Replaced the README starter with a user manual covering purpose, decision
boundaries and the two roles. Student instructions follow verification, course
selection, permission assessment, explicit enrolment, suggestions, overload and
drop/swap. A results table explains what each assessment outcome requires next.
Reviewer instructions cover emailed invitations, separate account roles, assigned
course queues, approval/rejection and the separate overload-review role. Clearly
distinguished saved candidates, approved requests, confirmed enrolments and
isolated COMP8620 scenario completions. Kept the fictional-record scope, optional
unstaffed human queue, rule-based decisions and bounded Llama adviser explicit.
The closing section identifies pending deployed email and model checks.

**Verified:**
Read John's newly organised CLAUDE.md and checked the actual navigation, forms,
status labels, verification page and account documentation. Docker Node 24 /
pnpm 11.9.0 check passed on the rerun: zero diagnostics and 495 tests in 25 files,
including the whole-README rendering contract and accessibility invariants.
Refreshed the local app. Anonymous Chrome with JavaScript disabled returned 200
for /readme/, opened all three internal section links, and reported no page
overflow at 1920 x 1080 and 390 x 844. No application behaviour, accounts or
deployment changed. Preserved John's pending harness, decision-log, process and
reflection edits; only README.md and this record belong to this increment.

**Commit:** [`834aa52`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/834aa52)

**What happened:**
The initial full check passed the README contract but two overload-flow tests
received HTTP 500 where they expected redirects. The existing fixture suppresses
server output, so that run does not identify a root cause. A fresh full run passed
all 495 tests without any application or test-code change. Retained both local
logs and reported the earlier failure; no overload fix is claimed.

## 2026-09-26 17:20 — Natural-voice process account and a rule-shaped CLAUDE.md

**Prompt:**

> could you check the PROCESS.md along with the repo, and see if PROCESS.md and ./reflections/crit-7.md can be modified into natural tone?

> in CLAUDE.md, it records my big orders, and if it is most effective way for you or for agent to execute?

> keep the rules checks those instructive signals for agent, and move contents instructions to else where, yes please reconstruct it

**Result:**
Rewrote PROCESS.md and the reflection in a conversational first-person voice
without changing any claim or citation. The first draft ran to about 390 words;
the course's assessment page gives 150-300 words for a crit-week PROCESS.md and
per reflection entry, so it was trimmed to about 295 words of prose (reflection
273). The trim dropped "the spec's requirement that requests persist" and
"persistence tests".

For CLAUDE.md, the 2,100-word Design direction section was a chronological log
mixing active rules with status ("is now implemented") and superseded choices
(VCOMP 2026, Qwen). Rather than delete history, it moved verbatim to
docs/decision-log.md, and CLAUDE.md now carries grouped Product rules (design,
catalogue, eligibility, permission requests, COMP8620 scenario, accounts, load,
profiles, adviser), each pointing to its doc. Rules, Checks and Working stayed
unchanged apart from a note on adding future increments in this shape. The file
shrank only from 3,043 to about 2,790 words, well short of the 1,000-1,200
estimated beforehand: keeping every active rule costs most of the space. The
gain is findability and no stale status, not size.

**Verified:**
Checked each PROCESS.md citation against its commit subject and the record's
COMP9095, quotation and suggestion-visibility facts before rewording. A separate
read-only audit compared every old Design direction sentence with the new rules.
Docker Node 24 / pnpm 11.9.0 check passed 495 tests in 25 files, and
check:evidence resolved all eight citations. Rules, Checks, Working and the
header were diffed against HEAD: only the new Working bullet differs.

**Commit:** [`4949d2e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/4949d2e), [`f72e915`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/f72e915)

**What happened:**
The first rules draft drifted in meaning. It said overload decisions "stay with
the deterministic engine", which contradicts the optional human review by
Dr Avery Hart. It moved the Llama/Qwen model-trial sentence from permission
handling to the adviser. It merged two lists so that known exact marks read as
barred from automatic permission, and it dropped qualifiers such as
"explicitly", "alone", "existing" and "optional". The audit caught these, and
each was restored to the original wording before commit. Another session
committed record.astro work mid-turn; it was left untouched.

## 2026-09-26 17:45 — Fly redeploy with SMTP secrets; Brevo blocks unauthorised IPs

**Prompt:**

> I pushed, and if can ship now? I need to let it stay online to check SMTP if it has issue

**Result:**
Preflight had found the live Fly app on an old build (`/catalogue/`, `/demo/`,
`/login/` returned 404) and no secrets set on Fly. With John's choice, SMTP
settings were staged as Fly secrets from the local `.env` without printing
values. APP_ORIGIN was set to the fly.dev origin, and the sender display name
changed from plain "ANU" to "ANU enrolment prototype" so mail to @anu.edu.au
inboxes doesn't read as a real ANU message. The current `main` was then deployed.
Making the repo public is deferred until John has confirmed real delivery.
`fly.toml` auto-stop was left as the course requires; the app restarts on
request.

**Verified:**
Post-deploy probes: 200 on `/`, 401 anonymous `/api/events`, same-origin login
POST 200 (not 403), cross-site POST 403. linkinator scanned 279 internal links
with none broken. `.dockerignore` excludes `.env` and `mise.local.toml` from the
build upload.

**Commit:** none — deployment and Fly secrets only; no repo change besides this entry.

**What happened:**
A nodemailer `verify()` inside the Fly machine failed with EAUTH 525. The same
check from this PC returned "525 5.7.1 Unauthorized IP address". Brevo's
authorised-IP protection blocks both the local IP and Fly's egress IP
(75.102.33.82 at the time), so this is not a credential or app fault. Real
delivery needs John to authorise the IP or turn off IP blocking in Brevo. Fly's
shared egress IP isn't guaranteed static, so authorising a single IP may break
again after a machine move.

## 2026-09-26 18:15 — Crit 7 shipped public; SMTP authorised from Fly

**Prompt:**

> Done, and if you can check? And if we can ship it haha

> Plugin updated, how about now? Yes I need to ship, which is fine to be public, I need to test from public site from now on

**Result:**
After John approved Fly's egress IP (75.102.33.82) in Brevo, a nodemailer
`verify()` inside the Fly machine succeeded. The secret scan (plugin 0.14.22,
repeated on 0.14.23) listed three credential-assignment surfaces. Each was read
before the flip. `verify.astro` and `docs/shipping-preflight.md` hold the
`searchParams.get("token")` line. History holds test-only passphrases in
`spec/accounts.test.ts` (20fb86f) and a fixture password hash. No real key
shape was found; the SMTP and Fly credentials exist only in gitignored files.
John confirmed the permanent public flip, the repo went public, and the
`checks` workflow was dispatched.

**Verified:**
CI run 36229122230 passed check and deploy. Its deploy verification covers the
site being online, private events needing auth, https awareness, CSRF and
internal links. The plugin's verify-deploy script confirmed the page and its
stylesheet at the fly.dev URL. All six Fly secrets survived the CI deploy, and
SMTP verify from the redeployed machine still succeeded from 75.102.33.82.
Actual inbox delivery through registration is left for John to confirm on the
public site.

**Commit:** none — visibility flip and CI deploy only; no repo change besides this entry.

## 2026-09-27 01:19 — Fly gains a private model connection, awaiting device approval

**Prompt:**

> Ty, yes it is the next step, the Fly to mini-pc configuration.

> And next step you can think in separate in next time, I think if can make a dummy email system?

**Result:**
Added pinned Tailscale binaries and an optional userspace daemon to the existing
Fly container. Its identity persists on the existing volume; only model calls
use its loopback outbound proxy. Kept HTTPS verification, the mini PC's required
Host override, and the existing inference deadline and rule-based fallback.
Deployed the container with networking enabled. The owner must approve the new
device through Tailscale; the login link was provided privately in the session.
Ollama variables remain unset while that approval is pending, so live model
inference from Fly is not yet claimed. Prepared the existing fictional-input
benchmark for that next check without creating accounts or sending email.

Recorded guest access as a later proposal: an isolated captured demo inbox,
because a fictional address cannot receive real SMTP email. Registration and
verification remain unchanged.

**Verified:**
Docker Node 24 / pnpm 11.9.0 full check passed with zero Astro diagnostics and
497 tests in 26 files; process evidence passed. The proxy tests cover trusted
and untrusted certificates, hostname mismatch, the upstream Host, no redirects,
stalled body cancellation, and a stalled CONNECT socket closing on abort.
The exact runtime image served HTTP 200 with Tailscale awaiting login, at about
80 MiB in a 212 MiB smoke-test limit. Fly retained its existing machine and
volume. Deployed home and stylesheet returned 200, anonymous events 401,
same-origin POST 200 and cross-site POST 403; 279 internal links passed.
Created a pre-deploy SQLite backup and compared all 25 tables: the registered
transcript and other 24 tables were unchanged. Built-in seed transcript row IDs
changed on startup, but their contents were unchanged. The course preflight
confirmed a public repository and current plugin; the new local commits still
need pushing. The secret scan repeated the three previously reviewed expression
and test-fixture surfaces, rather than reporting a clean scan.

**Commit:** [`fd25cad`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/fd25cad), [`7010b88`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/7010b88)

**What happened:**
The initial transport tests passed, but a further test of a proxy that never
answers CONNECT timed out: Node's built-in proxy agent did not apply the
request's abort signal before the tunnel existed. Passing the signal in agent
options also failed. Attaching the same signal to the socket returned by
createConnection fixed both rejection and socket closure; the full suite passed
again before the correction was deployed. An initial plain-HTTP fixture also
showed Node rejects conflicting Host authorities there; HTTPS tunnelling supports
the required upstream Host while retaining certificate verification.

## 2026-09-27 01:50 — Live Fly inference and repeatable verification without deletion

**Prompt:**

> Approved! And the demo inbox idea, I am thinking a rule, here the uniformed anu account is u+7digits@anu.edu.au

> And if we can delete existing account? I just want to use my anu account to test the SMTP verification again and again.

John subsequently approved the current Fly login and chose:

> Add the verification test; keep my data

**Result:**
Finished the private Fly-to-mini-PC connection. The earlier first-login link
changed after Fly stopped/restarted; a bounded temporary keepalive allowed the
owner to approve the current device. The saved identity then survived both the
configuration restart and the next deployment. Set the private Ollama endpoint,
model, Host and loopback proxy variables on Fly. Removed the temporary keepalive;
the existing machine size, volume and auto-stop policy remain unchanged.

Added My account with a signed-in verification-test action sending only to the
stored account email. Separate hashed tokens and persisted send/receipt statuses
cannot activate accounts, alter passwords, revoke sessions or change enrolment
data. Links last 30 minutes, confirmation is a single-use POST, and tests are
limited to three per account per 15 minutes. The additive schema migration was
generated and deployed after a database backup. No account was deleted and no
real verification-test message was sent by the agent.

Added wording for UID-style ANU addresses and aliases. ANU's published email
guidance supports both, so address shape cannot safely select simulated versus
real delivery. Recorded the proposed explicit real/demo choices, generated
`.test` identity and private captured inbox in `docs/demo-inbox-design.md`.
The public demo inbox remains a design, not an implemented feature.

**Verified:**
Four actual adviser smoke cases ran inside Fly through the mini PC, using
generated fictional input and the same bundled adviser functions: computer
vision matched COMP8539 in 27.631 seconds, software engineering matched COMP6120
in 2.113 seconds, and the guaranteed-marks and permission-override cases returned
no interest match in 1.704 and 2.689 seconds. All used the expected model digest
and passed within 45 seconds. This was not a load test or held-out evaluation.

Docker Node 24 / pnpm 11.9.0 passed zero Astro diagnostics, all 516 tests in
27 files and process-evidence checks. Tests cover recipient isolation, token
expiry/replay, activation-token separation, delivery failure and preservation
of the password/session, transcript, an existing enrolment and a request.
Chrome with JavaScript disabled completed registration, verification, sign-in
and two receipt tests; every POST returned 303 with the correct Origin.
Inspected screenshots at 1440 and 390 pixels with no horizontal page overflow.

Fly's SMTP connection check passed without sending mail. After deployment,
the new table existed with zero test messages, core account/workflow tables and
the registered transcript matched the pre-deploy backup, and Tailscale was
Running with Ollama discovery returning 200. Home/stylesheet returned 200,
anonymous events 401, same-origin POST 200, cross-site POST 403, and all 279
public internal links passed. My account redirects anonymous users to sign-in;
the receipt page is not cached. Actual delivery of the new test email is left
for John to trigger and confirm through My account. Work remains committed
locally rather than pushed.

**Commit:** [`8d84950`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/8d84950)

**What happened:**
The first owner approval appeared in the tailnet while the restarted app still
needed login. Holding the current process awake, approving its current link,
and testing a restart resolved that boundary. Astro initially parsed an inline
less-than comparison as fragment syntax; moving the expiry calculation into
frontmatter fixed it. The preservation fixture initially requested COMP7710,
which the generated record could enrol in directly; it was corrected to the
permission-required COMP8830 rather than weakening the course gate.

## 2026-09-27 — Verification email sender renamed; ANU delivery diagnosed

**Prompt:**

> I send 3 emails only received one in my real inbox, even junk box does not contain email, but Brevo sender shows 3 emails are delivered. So if ANU email has some security blocker?

> Then I plan to change the heading of the email, current is "ANU enrolment prototype" [...] If can be set as "Crit-7 project enrolment prototype"

**Result:**
ANU's MX is Microsoft 365 (`anu-edu-au.mail.protection.outlook.com`), so
Brevo's "delivered" means only that Exchange Online accepted the message. The
first hypothesis, an unaligned Gmail sender failing authentication, was wrong.
John's headers show Brevo rewrote the From to `12257996.brevosend.com`, with
spf/dkim/dmarc/compauth all passing, SCL 1, SFV:NSPM, and SFTY 9.25
(first-contact tip only, no impersonation code). An all-folder search found one
message (sends 0:25, 0:30, 1:57; one received 0:32), and John's quarantine view
was empty. That points to an ANU-side verdict after acceptance, such as an
admin-only quarantine or transport rule, or rate-based handling of a new
sender. Only an ANU IT message trace with Brevo's Message-IDs can settle it.
Tokens are not invalidated by resends, so the app does not explain the gap.
At John's request the Fly `MAIL_FROM` display name changed from "ANU enrolment
prototype" to "Crit-7 project enrolment prototype", which keeps the prototype
identity clear. The address is unchanged.

**Verified:**
DNS lookups for the ANU MX and the gmail.com/anu.edu.au DMARC records. After the
secret update restarted the machine, SMTP `verify()` inside Fly succeeded from
75.102.33.82 and read the new display name; `/` returned 200. Actual inbox
arrival under the new name is for John to confirm with spaced email tests.

**Commit:** none — Fly secret change and diagnosis only; no repo change besides this entry.

## 2026-09-27 02:36 — Chosen demo identities and email-confirmed password changes

**Prompt:**

> The change the password! If you want to change the password, then the verfication email is needed to change!
>
> the left is normal, right is demo [...] don't choose the generated email, let them choose [...] open a private inbox containing its confirmation link
>
> how to achieve the reviewer invitation, what should be the pipeline?

**Result:**
Replaced the standalone test-email interface with signed-in password management:
current password, a fresh link in the saved inbox, then explicit confirmation of
a different password. Only the final POST changes credentials and revokes
sessions. Separate token purposes, expiry, stored credential fingerprints and
atomic consumption prevent activation or receipt links from changing passwords.
Existing receipt links and academic history remain intact; no account was deleted.

Added Normal / Demo tabs. Normal still verifies real ANU addresses and aliases
through SMTP. Demo visitors choose their own `@enrolment.test` address and password,
open a private captured inbox and confirm into a persistent fictional profile.
An HttpOnly browser capability is stored only as a hash; captured links are
reconstructed with HMAC and cannot be obtained by guessing an address. Password
authentication reopens a new inbox after sign-out or expiry. Demo mail never
enters SMTP, and simulated confirmation never claims a verified ANU identity.

Refined the earlier separate-guest-queue proposal: demo students may explicitly
send labelled requests to their assigned invited reviewer. A marker can use one
real mailbox for reviewing and a chosen demo account for student testing. Public
signup stays student-only. Packaged the existing invitation function into the
production image as an owner-only CLI with a read-only assignment listing; no
web invitation endpoint or automatic role conversion was added. Updated the
harness, decision log, Help and operator documentation. Preserved the concurrent
sender-name/delivery record in 061fa6c and its Fly configuration.

**Verified:**
Docker Node 24 / pnpm 11.9.0 passed zero Astro diagnostics, 552 tests in 28 files
and process-evidence checks. Built-server cases cover chosen identities,
duplicate registration, cross-inbox access, password-gated inbox recovery,
no demo SMTP, role injection, expired/replayed/cross-purpose tokens, CSRF,
failed email, session revocation and unchanged transcripts, plans, enrolments
and requests. Existing normal accounts migrate with kind `normal`.

Chrome with JavaScript disabled completed normal registration, SMTP-captured
confirmation, password change and repeat sign-in; the equivalent demo sequence
entered its profile directly and retained all ten transcript rows after reload.
All 14 form POSTs returned 303 with the correct Origin. Inspected registration,
inbox, password and account screenshots at 1440 and 390 pixels with no horizontal
page overflow. The bundled invitation CLI sent only to an isolated local capture;
a separate no-JavaScript browser activated it and reached Dr Rowan Ellis's queue.

Backed up Fly's SQLite database before deployment. After deployment and again
after restart, the registered account, transcript, enrolments, requests, planning
and adviser history matched that backup; foreign-key checks were clean. The
new tables were present and empty. The deployed CLI listed available assignments
without sending mail. Seven public routes returned 200, anonymous events 401,
same-origin POST 303, cross-origin POST 403; the stylesheet and 281 internal
links passed. Private Ollama discovery returned 200 with the expected Llama 3.2
3B digest, and SMTP connection verification passed without sending an email.
Actual receipt of the new password message remains for its owner to confirm.

Course preflight checked the published contract, public repository and existing
green CI. The deadline helper lacked jq, so the published group JSON confirmed
Bada's Monday 28 September 13:30 cutoff directly. This turn does not push commits.

**Commit:** [`dfe164a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-jnheinrich451-eng/commit/dfe164a)

**What happened:**
The historical migration fixture used today's account schema before applying
today's migrations; corrected its historical-column insert and comparison.
Kept the session cookie first for existing HTTP clients and avoided clearing a
nonexistent demo cookie. The expanded authentication suite now has an independent
app/database/mail fixture so it does not compete with the original suite's
production authentication limits. An inline expiry comparison confused Astro's
parser; frontmatter resolved it. Browser inspection caught white tab text inherited
from global navigation CSS; explicit tab colours fixed it.

A combined post-deploy diagnostic timed out. Another image became active during
the checks, then HTTP and even a no-op SSH command stalled despite a started
machine. A restart restored access; bounded, separate diagnostics and preservation
checks then passed. The cause of that transient stall was not established. No
machine-size, volume, networking or mail-secret changes were made by this turn.

## 2026-09-27 — Verification email moved to an authenticated johnz.fyi sender

**Prompt:**

> Ty, the Brevo suggests using a authenticated domain, and gmail those emails cannot fit.

> Oh I have one! [...] johnz.fyi [...] And if the .env is correctly configured?

**Result:**
Brevo flagged the Gmail sender as non-compliant. Its fallback sent as a shared
`brevosend.com` subdomain with Brevo's default DKIM, so authentication passed
but on a shared domain's reputation. John registered `johnz.fyi` through
Cloudflare Registrar and authenticated and branded it in Brevo. Fly `MAIL_FROM`
is now "Crit-7 project enrolment prototype <crit7@johnz.fyi>". In the local
`.env`, John was advised to remove the inline comment from `APP_ORIGIN`, since
Docker `--env-file` would keep it as part of the URL, and to add the standard
space before `<` in `MAIL_FROM`. Credential values were checked only for
presence and shape, never printed.

**Verified:**
DNS for johnz.fyi: `brevo-code` TXT, `brevo1`/`brevo2._domainkey` CNAMEs to
Brevo DKIM, DMARC `p=none`, and `crit7.johnz.fyi` pointing to Brevo's branded
domain. It has no MX record, so the address cannot receive replies yet. After
the secret restart, SMTP `verify()` inside Fly succeeded from 75.102.33.82 with
the new MAIL_FROM and the fly.dev APP_ORIGIN. Inbox delivery and DKIM alignment
(`header.from=johnz.fyi`) are for John to confirm from a received header.

**Commit:** none — Fly secret change only; no repo change besides this entry.
