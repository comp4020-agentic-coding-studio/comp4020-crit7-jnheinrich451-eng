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
  const section = source.evidence.sections.find(s => s.key === "incompatibility");
  const missing = !section?.present || !section.blocks.length;
  // An explicitly recorded source gap produces an unknown check, never an empty
  // successful checklist. A newly missing section still invalidates other rules.
  if (missing && (review.coverage !== "missing-source" || !review.rules.requires || !("unknown" in review.rules.requires))) return undefined;
  return { ...review.rules,
    coverage: review.coverage,
    source: { code, year, hash: source.hash, section: "incompatibility", blocks: section?.blocks.map((_, i) => i) ?? [] },
    text: missing ? "The saved page has no requisite section. Its requirements are unknown." : section.blocks.map(b => b.text).join(" "),
  } as CourseRules;
}

export const COVERAGE_LABELS = {
  encoded: "Saved requirements encoded for automatic checks",
  partial: "Some conditions may need additional evidence or clarification",
  "missing-source": "Requisite information is missing from the saved page",
};
