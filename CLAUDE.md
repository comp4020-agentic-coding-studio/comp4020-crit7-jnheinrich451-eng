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

## Product rules

The active rules from John's authorised increments, grouped by area. Why and
when each was decided, implementation status and superseded choices are in
`docs/decision-log.md`; don't revive a superseded choice from there. Designs and
limitations are in the doc named under each heading.

### Design and scope

- ANU's visual style is the reference. The portal screenshots and enrolment
  notes describe the existing experience, not a required screen sequence;
  neither ANUHub's workflow nor this prototype's catalogue-first layout is
  fixed. Design around completing enrolment, with permission handling
  integrated into that task.
- Keep the independent-prototype identity visible, including beside the ANU
  artwork (a browser SVG converted from the supplied EPS).
- Accepted features: course search, informative course pages, saved semester
  selections, integrated permission requests, explicit enrolment confirmation.
  The redesign keeps the published scope and the functional guarantees in Rules.
- Search accepts full codes, spaced codes, numbers and titles. A numeric match
  must never silently choose a subject.
- Request pages use the course code as their main heading, in the gold Georgia
  serif at its larger size.
- My courses (formerly My semester) keeps saved candidates, confirmed
  enrolments and completed demo scenarios in separate sections. Confirmed
  enrolments and completed scenarios are prominent there and in My profile.

### Catalogue and sources

See `docs/catalogue-data.md`, `docs/course-source-audit.md`,
`docs/uploaded-sources-2027.md` and `docs/MCOMP-2027-source-review.md`.

- The active enrolment flow uses 2027. The library (`/catalogue/`, overview
  order Degrees, Specialisations, Courses) and the enrolment screens both read
  the persistent catalogue imported from `src/data/catalogue-sources.json`.
- Course identity is code + year. Keep program/rule-year snapshots separate from
  offering years; the MCOMP 2027 page is not VCOMP 2026 evidence.
- Imported references mean "mentioned in this source block", not approved
  prerequisite, equivalence or credit rules. Never wire unreviewed source
  paragraphs into eligibility, or convert a missing referenced page into
  another year.
- Preserve source variants and reviews on reseed, and keep John's duplicate
  raw downloads under specialisation folders. Folder names alone aren't
  authoritative: versioned specialisation rules decide membership and counting.
- Shared titles don't establish equivalent codes or renumbering; keep code/year
  identities separate and preserve published incompatibilities. No silent
  COMP8280 → COMP8260 substitution.
- 2027 CMSY-SPEC lists COMP8045 but its advice links COMP8405. Keep that
  inconsistency; don't alias the codes or change membership.
- An explicit "no current offerings" statement differs from missing
  availability. Neither lets you invent a semester or assume permanent
  discontinuation.
- John's reported ML-to-AI change is versioned evidence, not an automatic
  conversion of existing students' rules.
- Each interpretation in `src/data/enrolment-rules-2027.json` is pinned to its
  source hash with a note; a changed or conflicting source needs a fresh
  interpretation. MGMT7020 and REGN8014 are missing-requisite source gaps.
  Coverage doesn't guarantee a verdict for every record.

### Eligibility

See `docs/eligibility-implementation-plan.md`.

- Results are three-valued: unknown is never reported as a failure or granted.
  Keep the three gate distinctions when adding incomplete assessments.
- GPA, exact marks, equivalence and discretionary evidence stay unknown where
  needed; never infer them from prose.
- Unknown project approval, competitive selection, equivalence, GPA and
  mark-based suitability cannot receive automatic permission.
- A permission condition is not a failed prerequisite or an incompatibility.
  Intensive mode can't be inferred from semester/session names.
- Ambiguous AND/OR groups keep their plausible readings: agreeing results settle
  the group, disagreement is unknown. Repeated rows can't manufacture credit or
  distinct-course counts.
- Completion exclusions and concurrent-enrolment exclusions are distinct
  (COMP7710 has both, for COMP1110/COMP1140/COMP6710). A course with only a
  completion exclusion must not gain a concurrent one.
- Offered-course checks never invent an unavailable offering.
- Manual reference cases: `src/data/eligibility-reference.json`; wider course
  examples: `spec/catalogue-rule-coverage.test.ts`. Historical boolean checks
  stay readable.

### Permission requests and assessments

- By case: eligible → enrol directly; known unmet requirements → exception
  request route; offered course with uninterpreted or uncertain rules →
  assessment request that preserves unknown; unavailable offering → no
  enrolment request.
- Automatic assessment is the default. It's a clearly labelled demo policy,
  kept separate from ANU source rules and attributed to a system actor. No model
  is called by it. New assessments with conditional permissions use
  demo-permission-v2; saved v1 reports keep their policy and facts.
- The first model trial for this handling uses Llama through a local runtime
  (superseding the Qwen candidate, not the deterministic decision engine).
  Benchmarking follows the reference set and needn't block the demo flow.
- Automatic issuance needs a versioned source interpretation or the explicit
  fictional scenario. Historical 2026 transcriptions can't gain automatic
  approval because their old first-round checklist passed.
- Reports save the offering, rule and record snapshots, selected reason, student
  statement and policy version, and new request snapshots keep the three-valued
  results, record completeness and source/evidence references. Identical
  automatic submissions reuse the saved result; new evidence or a changed reason
  gets a new snapshot. Display changes never rewrite saved reports or historical
  events.
- Student messages are self-reported context: never numerically weighted, and
  they can't alter a grade, source rule or permission. Record-correction,
  equivalent-study and exception reasons produce evidence/decision-needed
  results. Future model extraction must keep claims separate from verified facts
  and pass a statement-variation benchmark before it influences handling.
- An automatic exception result says "Exception decision needed", with no staff
  review in progress; its unmet academic check stays separate from the
  unresolved waiver. Automatic incomplete results aren't pending staff work.
- A missing automatic rule is an application coverage gap. Never ask the student
  to fix it by rewriting their explanation.
- Staff review is an explicit optional route with an unstaffed-queue notice. It
  accepts explicitly selected exception, equivalent-study and record-correction
  requests even when checks fail: checks stay unchanged, the reason is saved in
  a student event, routing is not approval, and the reason stays selected if the
  student switches back to automatic assessment.
- Existing pending staff requests stay pending unless their owner explicitly
  requests automatic assessment; converting one preserves its original checks
  and events.
- Show the resubmission reminder only while the matching student/course/year/term
  request is pending; approval or rejection removes it. Retries reuse the
  existing pending or approved request without adding events.
- Approval still needs explicit enrolment confirmation. Historical 2026 rules,
  requests, approvals and enrolments keep their year: approval never transfers
  across years, and existing human approvals keep their offering scope.
- Ordinary source-bound permission courses can complete the profile workflow
  when every recorded condition is met.

### COMP8620 demo scenario

- The complete fictional topic scenario is at `/demo/`. Its permissions and
  confirmation are isolated from profile enrolments, and its topic assumptions
  must never become published ANU conditions.
- Scenario completions come from persisted confirmation events and show in My
  courses, My profile and My requests. They never enter the academic record used
  by eligibility.

### Accounts and reviewers

See `docs/accounts-and-data.md`.

- Public registration stays student-only; local reviewers activate emailed
  invitations, using real @anu.edu.au addresses for markers. Reviewer sign-in
  lands on the queue, and the catalogue stays browseable.
- A verification link opened during an existing session shows the current
  identity and requires explicit sign-out before activation. Carry the token
  through that POST without accepting arbitrary return URLs.
- Deployment docs must say it needs working SMTP and unused reviewer addresses;
  local captured mail doesn't prove remote delivery.
- Verified, signed-in users can send a repeatable verification test from My
  account to their saved email only. Test tokens and durable receipts are
  separate from activation tokens. Confirmation cannot activate an account,
  change credentials or revoke sessions. Preserve profiles and enrolment history;
  no account deletion is part of this increment. Limit tests to three per
  account per 15 minutes. See `docs/accounts-and-data.md`.
- Explain UID-style and name-based ANU addresses without treating syntax as
  proof of ownership. The proposed public demo inbox is still a separate future
  access mode, described in `docs/demo-inbox-design.md`; it is not implemented.

### Study load, overload, drop and swap

See `docs/overload-design.md` and `docs/course-changes-and-logo.md`.

- Overload applications get an immediate assessment plus optional human
  review. Student prose in them is context only.
- The 24-unit limit counts confirmed units, not courses or saved candidates. The
  transactional guard covers both direct and permission-code enrolment.
- Half-years include the named non-standard sessions; only proven non-overlap
  permits the saved-page exemption. Missing dates or units stay explicit.
- Variable-unit courses need a validated credit choice saved with the
  enrolment. Never silently assume six units.
- Overload approval (`/overload/`, policy in `src/data/overload-policy.json`)
  raises the student's year/half-year limit to 30 or 36. It never waives course
  conditions or confirms enrolment. The source supports nothing above 36 units
  and no trimester rules; completion exceptions and late enrolment stay
  discretionary.
- Dr Avery Hart is the separate fictional program-load reviewer; ordinary
  course convenors cannot decide overload requests. Requests
  keep policy, load and academic snapshots with events.
- Exact marks and program/institution attribution are nullable. Never backfill
  existing grade-only profiles with invented numbers.
- Drop and swap are explicit, revision-checked actions with preserved history.
  Swap checks the resulting load and replacement eligibility atomically and
  never drops the old course while waiting for replacement permission. Kept
  courses must keep any already-satisfied concurrent requirements.
- Ended enrolments don't count as active load or eligibility evidence, and seed
  must not resurrect them. No withdrawal deadlines, fees or transcript
  penalties are modelled.

### Profiles and suggestions

See `docs/profile-suggestions-next-stage.md`.

- New fictional profiles use the versioned VCOMP + ARTIF-SPEC template:
  completed 2026 S1/S2 and 2027 S1 with exact fictional marks (COMP6670 in
  2026 S2), loads of 24/18/18 so lower-level study doesn't crowd out the 48-unit
  advanced minimum, and an initial 2027 S2 planning preference. Historical 2026
  availability is an explicit assumption, notably COMP6250.
- Generated snapshots and planning preferences persist separately from
  transcript facts. Preserve existing registered profiles and don't reseed old
  accounts; existing VCOMP accounts can save an AI focus and semester from their
  current record. Profile enrolments come from enrolment rows even when a saved
  selection is removed.
- Suggestions call the deterministic gate, respect confirmed and saved-candidate
  load, exclude undated/future completions from dated progress, and separate
  ready options, permission/evidence cases and later offering gaps. A saved
  candidate is never passed credit or an enrolment.
- Degree buckets allocate each course once; the 8000-level threshold is an
  overlay. A source hash mismatch disables planning interpretations. 2028
  options use indicative rows in 2027 sources, never invented 2028 rules or
  enrolment endpoints.
- GPA, supervisor/project approval, credit substitutions, full degree audits and
  graduation remain unverified. Suggestions never promise on-time graduation or
  authorise repeated project enrolment.

### Course adviser

See `docs/course-adviser.md` for validation, runtime limits and timings.

- The model cannot approve, enrol or edit records. The adviser doesn't
  implement model-based prerequisite extraction or permission review (future
  extraction has its own conditions under Permission requests).
- It takes study interests and an explicit unit preference in My profile;
  exchanges persist separately from academic facts. Personal unit ceilings are
  separate from institutional limits, and context changes invalidate old advice.
- A bounded server-side Ollama call selects source passage IDs from ready
  options; the app renders the original excerpts and rechecks the combination
  through the deterministic planner. Missing or failed inference falls back to labelled
  rule-based planning.
- Compose defaults to Windows-host Ollama; the ignored `.env.adviser-minipc`
  selects John's mini-PC over private Tailscale Serve (no public Funnel or model
  exposure). An optional server-only `OLLAMA_HOST_HEADER` supplies the upstream
  hostname, and native HTTPS keeps TLS verification tied to `OLLAMA_BASE_URL`
  because Node fetch discarded the Host override.
- Fly can join the private tailnet using the optional userspace daemon in the
  app container. Persist its identity under `/data/tailscale`; bind its outbound
  proxy to loopback and scope `OLLAMA_PROXY_URL` to model requests only. Keep
  TLS verification and the existing inference deadline. Device approval is an
  operator action; missing connectivity must preserve rule-based fallback.
  See `docs/fly-mini-pc.md`. Do not expose Ollama through a public Funnel.

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
- When John authorises an increment, add its active rules as bullets under the
  matching Product rules heading and its history or status to
  `docs/decision-log.md`. Replace a superseded rule instead of stacking a new one.
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
