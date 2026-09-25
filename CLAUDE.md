# Harness — crit 7: permission code gate

## What we're building

A slice of ANU course enrolment: the permission-code gate. A student selects a
course; the app checks their (seeded) record against the course's rules and
either lets them through, tells them exactly why they need a permission code,
or tells them the course needs a code from everyone. Requests receive an immediate
saved demo assessment by default, with an optional staff route to the convenor of
the course the student actually picked. Both carry a visible status timeline.

The contract is the crit 7 spec on the course site
(`/api/crits/07-anu-system.json`). Re-read it before changing scope.

## Design direction

John has authorised a substantial redesign of the interaction and layout.
Use ANU's visual style as the reference; the supplied portal screenshots and
enrolment notes explain the existing experience, not a required screen sequence.
Neither ANUHub's current workflow nor this prototype's catalogue-first layout
is fixed. Design around completing enrolment with permission handling integrated
into that task. Keep the prototype identity clear.

John accepted course search, informative course pages, saved semester selections,
integrated permission requests and explicit enrolment confirmation. Search accepts
full codes, spaced codes, numbers and titles; numeric matches must not silently
choose a subject. Keep the published scope and functional guarantees below.

For the proposed degree-planning increment, John selected Computing (Advanced)
(VCOMP), 2026 commencement-year requirements as the first example. Planning is
not implemented yet. Keep program/rule-year snapshots separate from offering
years; the supplied MCOMP 2027 page is not VCOMP 2026 evidence. See
`docs/MCOMP-2027-source-review.md` for the offline source review and next inputs.
The later batch of three degrees and seven specialisations is also 2027; see
`docs/uploaded-sources-2027.md`. Preserve John's reported ML-to-AI change as
versioned evidence, not an automatic conversion of existing students' rules.
John intentionally retains duplicate course downloads under specialisation
folders. Preserve the raw copies; use code/year for course identity and the
versioned specialisation rules for membership and counting. Folder names alone
are not authoritative. See `docs/course-source-audit.md` for the current audit.
Shared course titles do not establish equivalent codes or historical renumbering.
Keep code/year identities separate and preserve published incompatibilities.
Distinguish explicit no-current-offerings statements from missing availability;
neither authorises inventing a semester or assuming permanent discontinuation.

The offline source library is now implemented at `/catalogue/`. Its reproducible
dataset is `src/data/catalogue-sources.json`, imported into separate SQLite
catalogue tables at boot. See `docs/catalogue-data.md` for the model and import
workflow. Imported references mean "mentioned in this source block"; they are
not approved prerequisite, equivalence or credit-counting rules. Preserve source
variants and reviews on reseed. Do not wire unreviewed source paragraphs into
eligibility checks or convert a missing referenced page into another year.
The library overview groups Degrees, Specialisations, then Courses. Following
John's question about the year mismatch and shared Find courses entries, the
active enrolment flow now uses 2027. Both screens read the persistent catalogue;
18 prototype rule interpretations are pinned to source hashes in
`src/data/enrolment-rules-2027.json`. Other sources remain browseable and may be
saved when offered, but cannot claim automatic eligibility. Changed or conflicting
sources require a fresh interpretation. See `docs/catalogue-data.md`.
Historical 2026 rules, requests, approvals and enrolments retain their year;
approval never transfers across years. Existing registered profiles are preserved.
New fictional profiles place COMP6670 in 2026 S2 before the 2027 example.
The 2027 CMSY-SPEC course list names COMP8045, while its explanatory advice links
COMP8405. Preserve that unresolved source inconsistency; do not alias the codes
or change allowed-course membership on the assumption that it is a typo.

John has agreed two increments: structured eligibility with explicit
unknown results and a manually reviewed reference set; and saved assessment
reports with an automated, clearly labelled demo permission path. See
`docs/eligibility-implementation-plan.md` for dependencies and acceptance checks.
The first automated demo path is now implemented; existing pending staff requests
remain pending unless their owner explicitly requests automatic assessment. Preserve
the existing gate distinctions when adding incomplete assessments. Separate ANU
source rules from our demo approval policy, and attribute automated decisions to
a system actor. The first model trial will use Llama through a local runtime;
this supersedes the earlier Qwen candidate, not the deterministic decision engine.
Model benchmarking follows the reference set and need not block the demo flow.
Automatic issuance requires a versioned source interpretation or the explicit
fictional scenario. Historical 2026 transcriptions cannot gain automatic approval
just because their old first-round checklist passed; existing human approvals
retain their offering scope.
The first foundation increment is now implemented: three-valued requirement
results, explicit fictional-record completeness, source/evidence references and
unknown topic conditions for 2027 COMP8620. New request snapshots retain these
results; historical boolean checks remain readable. The initial manual reference
cases are in `src/data/eligibility-reference.json`. GPA, exact marks, conditional
permission and versioned authoring remain future work. Automated assessment reports
now save the offering, rule and record snapshots, selected request reason, student
statement and versioned demo policy. COMP8620's complete fictional topic scenario
is at `/demo/`; its permissions and confirmation are isolated from profile
enrolments. Its topic assumptions must never become published ANU conditions.
Student messages are self-reported context, never numerically weighted authority.
The explicit record-correction, equivalent-study and exception reasons produce
evidence/decision-needed results. Prose is preserved but not semantically assessed
yet; it cannot alter a grade, source rule or permission. Future model extraction
must keep claims separate from verified facts and pass a statement-variation
benchmark before it influences handling. No model is called by the demo policy.
John clarified that permission handling must extend beyond COMP8620's blanket
permission requirement. An offered course with uninterpreted or uncertain rules
now accepts an assessment request, preserving unknown rather than claiming a
failure or granting permission. Known unmet requirements retain their exception
request route; eligible students enrol directly, and unavailable offerings cannot
accept enrolment requests. Show the resubmission reminder only while the matching
student/course/year/term request is pending. Approval or rejection removes it;
retries reuse the existing pending or approved request without adding events.
Automatic incomplete results are not pending staff work. Identical automatic
submissions reuse the saved result; new evidence or a changed reason gets a new
snapshot. Staff review remains an explicit optional route with an unstaffed-queue
notice. Converting a pending request preserves its original checks and events.
COMP7710 now has a source-bound check for both completed and currently enrolled
COMP1110/COMP1140/COMP6710. Keep these two exclusion types distinct; a course with
only a completion exclusion must not acquire a concurrent-enrolment exclusion.
Missing automatic rules are an application coverage gap, not a request for the
student to fix the gap by rewriting their explanation. The full catalogue is not
yet encoded; the COMP8620 scenario is one complete example, not a general model
reviewer. Request pages use the course code as their main, prominent heading.

## Rules

- **The schema is the ground truth.** Edit `src/lib/schema.ts`, run
  `pnpm db:generate`, commit the schema and the migration together. Never edit
  a committed migration, never touch the database by hand.
- **Routing is by id, never by typed text.** Applications reference a course
  row; the convenor comes from that row. No free-text course codes anywhere in
  the apply flow — that's the bug this app exists to fix.
- **Three gate outcomes, three distinct messages.** Eligible → proceed.
  Rules not met → "permission code needed" plus each unmet rule by name.
  Course requires a code from everyone → its own message, never phrased as a
  failed prerequisite. Don't collapse these.
- **Every state change writes an event.** An application's status is shown as
  its event timeline (who, what, when); no transition without a row.
- **The eligibility check is pure.** It lives in one module, takes a student
  record and a course's rules, and returns outcome + reasons. Pages and API
  routes call it; they don't re-implement it.
- **Seed data is honest.** Students and convenors are fictional. Course codes,
  titles and requisites follow ANU's published courses, transcribed by hand
  and verified by John — do not crawl ANU sites (their robots.txt disallows AI
  agents). Don't put real staff names on invented decisions.
- **Verified accounts.** John's 25 September instruction replaces the original
  no-auth design. Student registration accepts exactly the `anu.edu.au` email
  domain, hashes passwords, and requires a single-use SMTP email verification
  link before sign-in. Domain matching alone is not proof of ownership.
- **Staff are invited.** Never grant a reviewer role from public registration
  or a browser-supplied actor id. Provision staff through `scripts/invite-staff.ts`;
  reviewers can access only their assigned requests and relevant evidence.
- **Generated records are fictional.** New student accounts automatically get
  the labelled Computing (Advanced) demonstration record. Never describe it as
  imported or verified ANU academic history. Seed updates must preserve these
  profiles and user-created state.
- **Offerings scope decisions.** Save year/term-specific offerings. Approval
  applies only to the matching student, course, year and term. Saving a course
  or approving a request does not itself enrol the student.
- **Forms work without JavaScript.** POST + 303 redirect, as the starter does.
  JS is enhancement only.

## Checks

- `pnpm check` is green before every commit. Don't delete the invariants or
  the README test.
- **On John's Windows machine, run checks in Docker, not on the host.**
  better-sqlite3 v13 publishes no prebuilt binaries, so a Windows install
  needs a Visual Studio C++ toolchain this machine doesn't have. The Linux
  container builds it the way CI and Fly do (bash):

  ```sh
  MSYS_NO_PATHCONV=1 docker run --rm -v "D:/8020/comp4020-crit7-jnheinrich451-eng:/app" \
    -v crit7_node_modules:/app/node_modules -v crit7_pnpm_store:/pnpm-store \
    -e pnpm_config_store_dir=/pnpm-store -w /app node:24 sh -c \
    'git config --global --add safe.directory /app && npm i -g pnpm@11.9.0 >/dev/null 2>&1 \
     && CI=true pnpm install --frozen-lockfile && pnpm check'
  ```

  Swap `pnpm check` for `pnpm db:generate` (or add `-p 4321:4321` and run
  `pnpm dev --host`) as needed. A host `pnpm install` failing on
  better-sqlite3 is this, not a broken repo. The store volume and the
  `pnpm_config_` prefix (pnpm 11 ignores `npm_config_store_dir`) keep pnpm's
  store out of the repo; a `.pnpm-store/` appearing means that line was lost.
- **Deploying from this machine** (no flyctl installed; Fly's own image
  instead). `FLY_API_TOKEN` in the gitignored `mise.local.toml` is a deploy
  token scoped to this one app. Read it into a variable; never print it:

  ```sh
  T=$(sed -nE 's/^FLY_API_TOKEN\s*=\s*"(.*)"\s*$/\1/p' mise.local.toml)
  MSYS_NO_PATHCONV=1 docker run --rm -e FLY_API_TOKEN="$T" \
    -v "D:/8020/comp4020-crit7-jnheinrich451-eng:/app" -w /app flyio/flyctl:latest \
    deploy --remote-only --ha=false -a comp4020-crit7-jnheinrich451-eng
  ```

  After a deploy, run CI's probes by hand until the repo is public: 200 on
  `/`, 401 for anonymous `/api/events`, a same-origin form POST not 403, a
  cross-site one 403, and linkinator over internal links.
- Every new page goes into `spec/routes.ts` in the same commit.
- Spec tests drive the running app over HTTP and assert contracts (what a
  user sees and what survives a reload), not implementation details. At
  minimum: each gate outcome shows its own message; an application reaches the
  picked course's convenor; it's still there after a reload.
- When changing authentication or verification headers, also submit the real
  forms in a browser with JavaScript disabled, through verification and sign-in.
  HTTP tests that supply `Origin` themselves cannot catch a browser changing it
  under `Referrer-Policy`. Keep the token out of referrers and CSRF checks active.
- The guestbook and its test go when the starter's plumbing is replaced — in
  the same commit.

## Working

- Small commits that each leave the app working; the message says why.
- **Record every turn.** At the end of a turn that changed the repo or made a
  decision, append an entry to `PROCESS_RECORD.md` using the
  `.claude/skills/process_record/SKILL.md` format: work commit first, record
  commit second. `PROCESS.md` and the reflection are picked from this record.
  The skill lives under the gitignored `.claude/`, so stage it with
  `git add -f`; `spec/harness.test.ts` goes red if it's missing.
- Before shipping: `pnpm check:evidence`, then `/comp4020:preflight`.
- `README.md` (served at `/readme/`), `PROCESS.md` and
  `reflections/crit-7.md` are John's to write; draft only when asked, and
  never invent process history — cite real commits.
