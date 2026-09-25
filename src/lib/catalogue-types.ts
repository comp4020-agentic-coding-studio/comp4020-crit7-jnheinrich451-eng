/** Published evidence, not executable eligibility rules. All text is rendered escaped. */
export type CatalogueKind = "course" | "program" | "specialisation";
export interface SourceReference {
  kind: CatalogueKind;
  code: string;
  year: number | null;
  url: string | null;
  basis: "link" | "code-mention";
}
export interface SourceBlock {
  text: string;
  depth: number;
  references: SourceReference[];
}
export interface SourceSection {
  key: string;
  title: string;
  present: boolean;
  blocks: SourceBlock[];
}
export interface PublishedOffering {
  year: number | null;
  session: string | null;
  /** Preserve source headings and values, including census and enrolment dates. */
  fields: Record<string, string>;
}
export interface CatalogueEvidence {
  kind: CatalogueKind;
  code: string;
  year: number;
  title: string;
  description: string;
  units: string | null;
  sections: SourceSection[];
  availability: "listed" | "explicit-none" | "unknown" | "not-applicable";
  offerings: PublishedOffering[];
  offeringText: string;
  issues: string[];
}
export interface CatalogueSource {
  path: string;
  sha256: string;
  url: string | null;
  urlBasis: "saved-from-url" | "canonical-link" | "unknown";
}
export interface CatalogueSnapshot {
  hash: string;
  evidence: CatalogueEvidence;
  sources: CatalogueSource[];
}
