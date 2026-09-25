import type { Term } from "../data/courses";
import type { CatalogueEvidence } from "./catalogue-types";

export const TERM_LABELS: Record<Term, string> = {
  Summer: "Summer Session", S1: "First Semester", Autumn: "Autumn Session",
  Winter: "Winter Session", S2: "Second Semester", Spring: "Spring Session",
};

/** Only published class rows in the requested year create semester offerings.
 * An empty/malformed source or a contradictory table cannot invent a term. */
export function publishedTerms(evidence: CatalogueEvidence, year: number): Term[] {
  if (evidence.availability !== "listed" || evidence.issues.some(issue => issue.startsWith("Offering"))) return [];
  return (Object.keys(TERM_LABELS) as Term[]).filter(term => evidence.offerings.some(o =>
    o.year === year && o.session === TERM_LABELS[term] && /^\d+$/.test(o.fields["Class number"] ?? "")));
}

export function fixedUnits(evidence: CatalogueEvidence): number | null {
  const match = evidence.units?.match(/^(\d+) units?$/i);
  return match ? Number(match[1]) : null;
}
