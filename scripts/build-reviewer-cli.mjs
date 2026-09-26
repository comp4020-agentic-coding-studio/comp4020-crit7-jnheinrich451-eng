import { build } from "esbuild";

// Operator-only entrypoint: no web route, activation token or SMTP credentials
// are emitted by the bundle. Production dependencies stay external.
await build({ entryPoints: ["scripts/invite-staff.ts"], outfile: "dist/admin/invite-staff.mjs",
  bundle: true, platform: "node", target: "node24", format: "esm", packages: "external" });
