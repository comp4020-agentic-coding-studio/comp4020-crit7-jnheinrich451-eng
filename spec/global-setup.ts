import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { SMTPServer } from "smtp-server";
import { type AddressInfo, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";
import { ollamaFixture } from "./ollama-fixture";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    fixtureCookies: Record<string, string>;
    mailDir: string;
    testDatabase: string;
    expiredToken: string;
    expiredSession: string;
    expiredEmailCheck: string;
    expiredPasswordChange: string;
  }
}

// Boot the BUILT server (the same artefact the Dockerfile runs) on a free
// port with a throwaway database, so the spec asserts what actually ships —
// not the dev server, and never your local data.
export default async function setup(project: TestProject): Promise<() => void> {
  const entry = "./dist/server/entry.mjs";
  if (!existsSync(entry)) {
    throw new Error(`${entry} not found — run \`pnpm test\`, which builds first`);
  }

  const port = await new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, () => {
      const address = probe.address() as AddressInfo;
      probe.close(() => resolve(address.port));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const directory = mkdtempSync(join(tmpdir(), "spec-db-"));
  const database = join(directory, "test.db");
  const mailDir = mkdtempSync(join(tmpdir(), "spec-mail-"));
  let rejectFirstDelivery = true;
  const smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ["AUTH", "STARTTLS"],
    logger: false,
    onRcptTo(address, _session, done) {
      if (address.address === "delivery-failure@anu.edu.au" && rejectFirstDelivery) {
        rejectFirstDelivery = false;
        done(new Error("Simulated provider rejection"));
      } else done();
    },
    onData(stream, session, done) {
      let message = "";
      stream.on("data", (chunk: Buffer) => {
        message += chunk.toString();
      });
      stream.on("end", () => {
        if (session.envelope.rcptTo.some(r => r.address === "recovery-rejection@anu.edu.au") && message.includes("Reset your enrolment prototype password")) {
          done(new Error("Simulated password-reset rejection")); return;
        }
        if (session.envelope.rcptTo.some(r => r.address === "password-change-failure@anu.edu.au") && message.includes("Change your enrolment prototype password")) {
          done(new Error("Simulated password-change rejection")); return;
        }
        if (session.envelope.rcptTo.some(r => r.address === "email-check-failure@anu.edu.au") && message.includes("Test your enrolment prototype")) {
          done(new Error("Simulated test-message rejection")); return;
        }
        for (const recipient of session.envelope.rcptTo) {
          writeFileSync(
            join(
              mailDir,
              createHash("sha256").update(recipient.address.toLowerCase()).digest("hex") + ".eml",
            ),
            message,
          );
        }
        done();
      });
    },
  });
  await new Promise<void>((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  const smtpPort = (smtp.server.address() as AddressInfo).port;
  const model = ollamaFixture("localhost:11434");
  await new Promise<void>(resolve => model.listen(0, "127.0.0.1", resolve));
  const modelPort = (model.address() as AddressInfo).port;
  const env = {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    DATABASE_PATH: database,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtpPort),
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    MAIL_FROM: "prototype@example.test",
    APP_ORIGIN: baseUrl,
    OLLAMA_BASE_URL: `http://127.0.0.1:${modelPort}`,
    OLLAMA_MODEL: "llama3.2:3b",
    OLLAMA_HOST_HEADER: "localhost:11434",
  };
  const fixtureFile = join(directory, "fixtures.json");
  const fixture = spawn("node", ["--import", "tsx", "spec/fixtures.ts"], {
    env: { ...env, SPEC_FIXTURE: "1", SPEC_FIXTURE_FILE: fixtureFile },
    stdio: "inherit",
  });
  await new Promise<void>((resolve, reject) => {
    fixture.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Fixture failed: ${code}`))));
    fixture.on("error", reject);
  });
  const data = JSON.parse(readFileSync(fixtureFile, "utf8"));
  const server = spawn("node", [entry], {
    env,
    stdio: "ignore",
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    if (attempt >= 50) {
      server.kill();
      throw new Error(`server did not come up at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  project.provide("baseUrl", baseUrl);
  project.provide("fixtureCookies", data.cookies);
  project.provide("expiredToken", data.expiredToken);
  project.provide("expiredSession", data.expiredSession);
  project.provide("expiredEmailCheck", data.expiredEmailCheck);
  project.provide("expiredPasswordChange", data.expiredPasswordChange);
  project.provide("mailDir", mailDir);
  project.provide("testDatabase", database);
  return () => {
    server.kill();
    smtp.close();
    model.close();
  };
}
