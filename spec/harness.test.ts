import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The carry-forward sensor. A fresh starter repo has no .claude/, so the
// process_record skill only arrives if someone remembers to copy it from last
// week's repo — and C4, C5 and C7 all started without it. This turns that
// silent absence into a red `pnpm check`. Copy this file forward with the skill.
describe("harness carried forward", () => {
  it.each([
    ".claude/skills/process_record/SKILL.md",
    "PROCESS_RECORD.md",
  ])("%s is in the repo", (path) => {
    expect(existsSync(path)).toBe(true);
  });
});
