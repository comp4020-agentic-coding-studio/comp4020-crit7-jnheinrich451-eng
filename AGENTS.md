# Shared guidance for Codex and Claude

Read `CLAUDE.md` before reviewing or changing this repository. It is the shared
project harness; do not maintain a competing set of product rules here.

## Contract and scope

- Read the published Crit 7 brief and spec at
  <https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json>.
  The brief poses the problem; the published spec is the contract. Local plans
  describe our choices, not additional course requirements.
- Keep the work focused on the permission-request and enrolment slice described
  in `CLAUDE.md`. Distinguish proposed behaviour from implemented and tested
  behaviour.
- Treat John's COMP8620/COMP9095 experience as his reported motivation, not
  evidence of the university's internal implementation or a verified course rule.

## Collaboration

- Check `git status` and the current diff before editing. Preserve existing work.
- Give each concurrent worker a bounded task and explicit file ownership. Use
  read-only reviews when ownership has not been agreed; avoid simultaneous edits
  to the same files.
- Share findings as: problem, evidence, proposed change, and acceptance check.
  Attribute a review to Claude only when Claude has actually returned it.
- Work in small build/check/review steps. Follow the checks and authorship rules
  in `CLAUDE.md`; report failures and checks not run accurately.
- Use the Node and pnpm versions in `mise.toml`. On Windows, use `pnpm.cmd` if
  PowerShell blocks the `pnpm.ps1` launcher.

