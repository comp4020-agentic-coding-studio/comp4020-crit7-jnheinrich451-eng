# Harness — crit 7: permission code gate

## What we're building

A slice of ANU course enrolment: the permission-code gate. A student opens a
course; the app checks their (seeded) record against the course's rules and
either lets them through, tells them exactly why they need a permission code,
or tells them the course needs a code from everyone. Applications route to the
convenor of the course the student actually picked, get an automatic first
round, and carry a visible status timeline so nothing gets stuck silently.

The contract is the crit 7 spec on the course site
(`/api/crits/07-anu-system.json`). Re-read it before changing scope.

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
- **No real auth.** An "act as" picker switches between seeded people. Say so
  in the README; don't build login.
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
- Every new page goes into `spec/routes.ts` in the same commit.
- Spec tests drive the running app over HTTP and assert contracts (what a
  user sees and what survives a reload), not implementation details. At
  minimum: each gate outcome shows its own message; an application reaches the
  picked course's convenor; it's still there after a reload.
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
