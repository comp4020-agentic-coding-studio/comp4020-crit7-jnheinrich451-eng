import reviews from "../data/enrolment-rules-2027.json";
import { REQUISITES, type CourseRules } from "../data/requisites";
import type { CatalogueEvidence } from "./catalogue-types";
import { LEGACY_YEAR } from "./academic-year";

/** Explicit prototype interpretations pinned to inspected snapshots. A changed
 * source, a conflicting version, or a different year needs a fresh review. */
export function rulesForSource(code: string, year: number, source?: { hash: string; evidence: CatalogueEvidence }, conflicted = false): CourseRules | undefined {
  if (year === LEGACY_YEAR) return REQUISITES[code];
  if (!source || conflicted || source.evidence.code !== code || source.evidence.year !== year) return undefined;
  const review = reviews.find(r => r.code === code && r.year === year && r.sourceHash === source.hash);
  if (!review) return undefined;
  return { ...review.rules, text: source.evidence.sections.find(s => s.key === "incompatibility")!.blocks.map(b => b.text).join(" ") } as CourseRules;
}
