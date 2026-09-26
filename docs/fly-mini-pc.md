# Fly to the private mini PC

The runtime image includes pinned Tailscale 1.102.4 binaries. Setting
`TAILSCALE_ENABLED=1` starts a userspace daemon alongside the web app. It needs
no TUN device, extra Fly machine or public model endpoint. Its outbound HTTP
proxy listens only on `127.0.0.1:1055`; its identity persists in
`/data/tailscale/tailscaled.state` on the existing volume. Do not publish or
copy that identity file. The daemon blocks incoming tailnet connections and
does not advertise routes, an exit node or SSH.

## Setup

Keep Ollama running on the mini PC with `llama3.2:3b` installed, and Tailscale
Serve pointing at its loopback Ollama port. Keep the PC awake and online.

1. Deploy this Dockerfile with `TAILSCALE_ENABLED=1` in Fly's environment.
2. Wake the website if its Fly machine is stopped. In Fly SSH, run
   `tailscale --socket=/tmp/tailscaled.sock status --json`. On first boot its
   `AuthURL` is the private device login link. Open that link as the tailnet
   owner and approve the device named `enrolment-fly`. No reusable auth key
   needs to be stored in Git, chat or Fly secrets.
3. Check that `BackendState` is `Running` and that the tailnet's access rules
   allow this device to reach the mini PC on TCP 443. If the login attempt
   expired, use `tailscale --socket=/tmp/tailscaled.sock up
   --hostname=enrolment-fly --accept-dns=false --accept-routes=false
   --shields-up --timeout=20s` to obtain a fresh link.
4. Configure these server-side Fly variables, using the mini PC's actual
   Tailscale Serve hostname:

   ```dotenv
   TAILSCALE_ENABLED=1
   OLLAMA_BASE_URL=https://your-server.your-tailnet.ts.net
   OLLAMA_MODEL=llama3.2:3b
   OLLAMA_HOST_HEADER=localhost:11434
   OLLAMA_PROXY_URL=http://127.0.0.1:1055
   ```

The startup script reconnects the saved identity after an ordinary Fly restart.
Monitor Tailscale device/key expiry in the admin console: reapproval may be
needed later. Revoking the device or deleting its volume requires rejoining.
No global proxy variable is set, so SMTP and other app traffic retain their
existing routes. HTTPS verifies the URL hostname even when Ollama needs a
different HTTP Host. Plain HTTP proxy requests cannot override Host with a
conflicting authority; use the HTTPS Serve URL.

## Verify and recover

Check `/api/tags` through the proxy, then run the existing adviser smoke
benchmark from inside Fly with generated fictional input. A successful tags
request alone does not establish successful model inference. Finally submit
an interest in My profile and reload: successful advice records the model and
digest, and failed earlier requests can be retried. Never edit an account or
its verification state directly to perform this check.

Keep the existing 45-second inference deadline and 60-second request lease.
The app remains available when the tailnet or mini PC is unavailable. A
configured but unreachable model gives a labelled rule-based fallback after
the bounded request; an unset endpoint immediately uses the same planner.

For rollback, unset `OLLAMA_BASE_URL` and `OLLAMA_PROXY_URL`, and set
`TAILSCALE_ENABLED=0`. This restores the deployed rule-based adviser without
deleting accounts, preferences or saved advice. The tailnet identity stays on
the volume for a later retry. No database migration is part of this setup.

Implementation references: [Tailscale userspace networking](https://tailscale.com/docs/concepts/userspace-networking)
and [Node 24 HTTP proxy agents](https://nodejs.org/docs/latest-v24.x/api/http.html#built-in-proxy-support).
