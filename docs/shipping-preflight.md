# Crit 7 shipping preparation

Snapshot: 26 September 2026, Canberra time. Prepared for review; this is not a
record of deploying the current build or publishing the repository.

John confirmed **Bada, Monday 15:30**. The two-hour shipping cutoff is
**Monday 28 September 2026 at 13:30 Canberra time**, using the published
[group schedule](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crit-groups.json)
and [assessment guidance](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/).
The [Crit 7 spec](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json)
is the contract: a deployed, persistent ANU workflow slice, with process evidence.

## Verified locally

- Docker Node 24 / pnpm 11.9.0: `pnpm check` passed, including 495 tests in
  25 files and zero Astro diagnostics. `pnpm check:evidence` passed; all four
  PROCESS.md commit citations resolve.
- Inspected the adviser in Chrome with JavaScript disabled at 1920 x 1080 and
  390 x 844. Suggested course codes retain gold serif text with aligned lining
  numerals; neither viewport had horizontal overflow. This used a disposable
  test database and real mini-PC inference, not John's academic records.
- PROCESS.md now contains a concise draft based on the recorded work. The
  reflection is in `reflections/crit-7.md`. Personal reflection wording needs
  John's review; passing evidence checks does not establish authorship approval.
- README.md is still the starter About page. `docs/README-draft.md` supplies a
  factual replacement for review rather than silently replacing John's text.
- Raw browser downloads under `assets/` remain on disk and are now Git-ignored.
  The tracked normalized catalogue and converted public logo remain available
  to the build. Raw downloads were already excluded from the Docker context.
- The course secret scanner completed worktree and publishable-history scans.
  Its exit code was 2, requiring review, rather than a clean result. The two
  remaining surfaces both match `const token = Astro.url.searchParams.get("token") ?? "";`
  in `src/pages/verify.astro` (current file and historical commits `0660604`
  and `20fb86f`). These are expression-based false positives, not embedded
  credentials. No concrete-key finding was reported. Re-scan before publication.

## Deployment and publication checks

- GitHub repository is private and not archived. After fetching origin, local
  HEAD was 28 commits ahead of origin/main before this preparation's commits.
  The latest three CI runs were skipped under the private-repository condition.
  Local checks are not a successful public CI run.
- Fly has an existing deployment. Its home page and linked CSS returned 200.
  This verifies the older deployed build only; the current local changes have
  not been deployed during this preparation.
- The course plugin is 0.14.22; its version check reported 0.14.23 available.
  The deadline helper required unavailable jq, so the public JSON schedule was
  read directly and combined with John's group confirmation.
- SMTP delivery and invitation activation on the deployed origin are untested.
  John requested these checks after deployment. Local captured mail does not
  establish real inbox delivery.
- The mini-PC adviser works from the local machine through Tailscale. Fly still
  needs private connectivity before live inference can use it. Deterministic
  suggestions remain available without the model; do not advertise live AI as
  verified on Fly yet.

## Remaining shipping steps

1. Review the process/reflection and About-page draft; finish the About page.
2. Refresh the course plugin and run preflight again against the final commit.
3. Push the intended commits and deploy the current app when authorised. Check
   the home page, anonymous events (401), legitimate form submission (not 403),
   foreign-origin submission (403), internal links and persistence after reload.
4. Configure production APP_ORIGIN and SMTP secrets, then verify a real ANU
   inbox, sign-in, and an invited reviewer's assigned queue. Keep credentials
   out of Git and chat. Do not promise marker access before these checks pass.
5. Either establish and test Fly-to-mini-PC connectivity or present the deployed
   rule-based adviser with its explicit fallback label.
6. Run the final secret/history scan and obtain the course ship workflow's
   explicit approval before making source, commit history and CI logs public.
   Confirm the public CI/deploy result and live URL before the cutoff.

John clarified that the removable demo section is the COMP8620 scenario, not
the fictional-record notices. Its visible section can be removed after the
first deployed workflow check while retaining saved history and a Help entry.
No scenario removal or data deletion is included in this preparation.
