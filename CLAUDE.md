# Harness — crit 7: permission code gate

## What we're building

A slice of ANU course enrolment: the permission-code gate. A student selects a
course; the app checks their (seeded) record against the course's rules and
either lets them through, tells them exactly why they need a permission code,
or tells them the course needs a code from everyone. Applications route to the
convenor of the course the student actually picked, get an automatic first
round, and carry a visible status timeline so nothing gets stuck silently.

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
