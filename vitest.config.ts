import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // HTTP suites share one app server; bound JSDOM/axe worker contention in Docker.
    maxWorkers: 4,
    // The new credential-heavy flows get a separate app/database/SMTP fixture.
    // Keep production password concurrency and global auth limits unchanged.
    projects: [
      { test: { name: "core", include: ["spec/**/*.test.ts", "scripts/**/*.test.ts"],
        exclude: ["spec/account-modes.test.ts"], globalSetup: ["./spec/global-setup.ts"] } },
      { test: { name: "account-modes", include: ["spec/account-modes.test.ts"],
        globalSetup: ["./spec/global-setup.ts"] } },
    ],
  },
});
