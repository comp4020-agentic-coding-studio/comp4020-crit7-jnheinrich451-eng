import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["spec/**/*.test.ts", "scripts/**/*.test.ts"],
    globalSetup: ["./spec/global-setup.ts"],
    // HTTP suites share one app server; bound JSDOM/axe worker contention in Docker.
    maxWorkers: 4,
  },
});
