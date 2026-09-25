import type { ProgramKey } from "./requisites";

// Everyone here is fictional: invented names, invented uIDs, invented
// results. Course codes are real (see ./courses.ts); the convenor attached to
// each is not — CLAUDE.md: no real staff names on invented decisions.

export const CONVENORS = [
  { key: "ai", name: "Dr Rowan Ellis", email: "rowan.ellis@example.edu" },
  { key: "ml", name: "Dr Mara Quinn", email: "mara.quinn@example.edu" },
  { key: "sys", name: "Dr Tomas Weller", email: "tomas.weller@example.edu" },
  { key: "se", name: "Dr Hana Okafor", email: "hana.okafor@example.edu" },
  { key: "theory", name: "Dr Leo Brandt", email: "leo.brandt@example.edu" },
  { key: "proj", name: "Dr Sam Achterberg", email: "sam.achterberg@example.edu" },
] as const;

export type ConvenorKey = (typeof CONVENORS)[number]["key"];

const AREAS: Record<ConvenorKey, string[]> = {
  ai: ["COMP6262", "COMP6320", "COMP8620", "COMP8691"],
  ml: [
    "COMP6242", "COMP6528", "COMP6670", "COMP8535", "COMP8536", "COMP8539",
    "COMP8600", "COMP8650", "ENGN6528", "ENGN8501",
  ],
  sys: [
    "COMP6034", "COMP6300", "COMP6310", "COMP6330", "COMP6331", "COMP6464",
    "COMP6800", "COMP8045", "COMP8300", "COMP8703", "ENGN6539",
  ],
  se: [
    "COMP6120", "COMP6250", "COMP6390", "COMP6442", "COMP6540", "COMP6710",
    "COMP6720", "COMP6730", "COMP6780", "COMP7710", "COMP8020", "COMP8131",
    "COMP8260", "COMP8280", "COMP8350", "COMP8610",
  ],
  theory: [
    "COMP6240", "COMP6260", "COMP6261", "COMP6361", "COMP6434", "COMP6466",
    "COMP6490", "COMP8011", "COMP8410", "COMP8430", "COMP8460", "COMP8490",
    "COMP8712", "COMP8880", "COMP8980", "ENVS6025", "MATH6111", "MATH6112",
    "MATH6213", "MATH6406", "MATH8201",
  ],
  proj: ["COMP6445", "COMP6470", "COMP8500", "COMP8715", "COMP8800", "COMP8820", "COMP8830", "ENGN9820"],
};

export function convenorFor(code: string): ConvenorKey {
  for (const [key, codes] of Object.entries(AREAS)) {
    if (codes.includes(code)) return key as ConvenorKey;
  }
  return "proj";
}

type Result = [code: string, grade: "HD" | "D" | "CR" | "P" | "N", term: string];

export interface SeedStudent {
  uid: string;
  name: string;
  program: ProgramKey;
  /** Six units each unless the code is in the catalogue with other units. */
  results: Result[];
  /** Current enrolments, by catalogue code. */
  enrolled: string[];
  /** What this record is here to show, for the "act as" picker. */
  shows: string;
}

export const STUDENTS: SeedStudent[] = [
  {
    uid: "u7000101",
    name: "Mei Lin",
    program: "VCOMP",
    results: [
      ["COMP6710", "HD", "2025 S1"],
      ["COMP6260", "D", "2025 S1"],
      ["COMP6262", "CR", "2025 S1"],
      ["COMP6442", "D", "2025 S2"],
      ["COMP6320", "HD", "2026 S1"],
      ["COMP6670", "D", "2026 S2"],
    ],
    enrolled: ["COMP6466"],
    shows: "strong record: most gates open; COMP8620 still needs a code",
  },
  {
    uid: "u7000102",
    name: "Tom Okoye",
    program: "MCOMP",
    results: [],
    enrolled: ["COMP6710", "COMP6262"],
    shows: "first semester: program-only courses open, the rest need a code",
  },
  {
    uid: "u7000103",
    name: "Ana Ruiz",
    program: "GDCOMP",
    results: [
      ["COMP6710", "N", "2025 S2"],
      ["COMP6730", "CR", "2026 S1"],
      ["COMP6240", "D", "2026 S1"],
    ],
    enrolled: [],
    shows: "a failed attempt that doesn't count as passed",
  },
  {
    uid: "u7000104",
    name: "Kenji Sato",
    program: "MMLCV",
    results: [
      ["COMP4670", "D", "2024 S2"],
      ["COMP6710", "D", "2025 S2"],
      ["COMP6670", "HD", "2026 S2"],
    ],
    enrolled: [],
    shows: "an incompatible undergraduate course (COMP4670 vs COMP8600)",
  },
  {
    uid: "u7000105",
    name: "Olivia Park",
    program: "MCOMP",
    results: [
      ["COMP3620", "D", "2024 S1"],
      ["COMP6710", "CR", "2025 S1"],
      ["COMP6310", "D", "2025 S2"],
    ],
    enrolled: [],
    shows: "has a COMP8620 request waiting with its convenor",
  },
];
