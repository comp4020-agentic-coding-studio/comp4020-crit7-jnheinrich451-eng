// Optional private networking for Fly. The web app remains available if the
// mini PC or tailnet is offline; the adviser already has a bounded fallback.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const children = new Set();
let stopping = false;
let retry;
function child(command, args, options = {}) {
  const process = spawn(command, args, options);
  children.add(process);
  process.once("exit", () => children.delete(process));
  process.once("error", () => children.delete(process));
  return process;
}
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  clearTimeout(retry);
  for (const process of children) process.kill("SIGTERM");
  setTimeout(() => {
    for (const process of children) process.kill("SIGKILL");
    process.exit(code);
  }, 3000);
}
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => shutdown(0));

if (process.env.TAILSCALE_ENABLED === "1") {
  const state = "/data/tailscale";
  mkdirSync(state, { recursive: true, mode: 0o700 });
  const socket = "/tmp/tailscaled.sock";
  function network() {
    if (stopping) return;
    const daemon = child("tailscaled", ["--tun=userspace-networking",
      "--outbound-http-proxy-listen=127.0.0.1:1055", `--state=${state}/tailscaled.state`, `--socket=${socket}`],
    { stdio: "ignore" });
    let restarted = false;
    const restart = () => {
      if (restarted || stopping) return;
      restarted = true;
      console.error("Private adviser network stopped; retrying in 10 seconds.");
      retry = setTimeout(network, 10_000);
    };
    daemon.once("error", restart);
    daemon.once("exit", restart);
    // Allow the daemon to bind its socket. On first boot this starts device login;
    // an operator reads AuthURL via `tailscale status --json`, not public logs.
    setTimeout(() => {
      if (stopping || restarted) return;
      const login = child("tailscale", [`--socket=${socket}`, "up", "--hostname=enrolment-fly",
        "--accept-dns=false", "--accept-routes=false", "--shields-up", "--timeout=20s"],
      { stdio: "ignore" });
      login.once("error", () => console.error("Private adviser network CLI could not start."));
      login.once("exit", code => {
        if (code && !stopping) console.error("Private adviser network needs attention; check Tailscale status over Fly SSH.");
      });
    }, 1000);
  }
  network();
}

const app = child(process.execPath, ["./dist/server/entry.mjs"], { stdio: "inherit" });
app.once("error", () => shutdown(1));
app.once("exit", code => shutdown(code ?? 1));
