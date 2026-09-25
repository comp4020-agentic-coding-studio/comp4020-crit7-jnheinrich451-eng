import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { mergeSnapshots, parseCatalogue } from "./catalogue-parser.ts";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types.ts";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? entry.name.endsWith("_files") ? [] : files(file)
      : /\.html?$/i.test(entry.name) ? [file] : [];
  });
}

// Explicit local inputs only. The generated snapshot is bundled into the app;
// raw Chrome downloads and their scripts never enter the runtime or web root.
const inputs = ["assets/Courses", "assets/Degrees", "assets/Specializations"].flatMap(files).sort();
const output = "src/data/catalogue-sources.json";
const previous = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : { format: 1, snapshots: [] };
if (previous.format !== 1 || !Array.isArray(previous.snapshots)) throw new Error("Unsupported catalogue snapshot format");
// Retain earlier snapshots in the distributable dataset too, so a clean
// checkout and an existing persistent database see the same history.
const snapshots = mergeSnapshots([...(previous.snapshots as CatalogueSnapshot[]),
  ...inputs.map(file => parseCatalogue(readFileSync(file, "utf8"), relative(process.cwd(), file)))]);
writeFileSync(output, JSON.stringify({ format: 1, snapshots }, null, 2) + "\n");
const identities = new Set(snapshots.map(s => `${s.evidence.kind}:${s.evidence.code}:${s.evidence.year}`));
console.log(JSON.stringify({ files: inputs.length, versions: identities.size, snapshots: snapshots.length,
  byKind: Object.fromEntries(["course", "program", "specialisation"].map(kind => [kind, new Set(snapshots.filter(s => s.evidence.kind === kind).map(s => `${s.evidence.code}:${s.evidence.year}`)).size])),
  issues: snapshots.filter(s => s.evidence.issues.length).map(s => ({ code: s.evidence.code, issues: s.evidence.issues })) }, null, 2));
