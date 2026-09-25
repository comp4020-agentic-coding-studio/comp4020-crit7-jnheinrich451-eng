import { eq } from "drizzle-orm";
import { db } from "./db";
import { catalogueReferences, catalogueReviews, catalogueSnapshots, catalogueSources, catalogueVersions } from "./schema";
import type { CatalogueEvidence, CatalogueKind, SourceReference } from "./catalogue-types";

export function catalogueEntries() {
  return db.select().from(catalogueSnapshots)
    .innerJoin(catalogueVersions, eq(catalogueSnapshots.versionId, catalogueVersions.id))
    .innerJoin(catalogueReviews, eq(catalogueSnapshots.id, catalogueReviews.snapshotId)).all()
    .map(row => ({ ...row.catalogue_versions, snapshotId: row.catalogue_snapshots.id,
      hash: row.catalogue_snapshots.hash, evidence: JSON.parse(row.catalogue_snapshots.evidence) as CatalogueEvidence,
      review: row.catalogue_reviews }))
    .sort((a, b) => a.code.localeCompare(b.code) || b.year - a.year || a.hash.localeCompare(b.hash));
}
export function catalogueSourcesFor(snapshotId: number) {
  return db.select().from(catalogueSources).where(eq(catalogueSources.snapshotId, snapshotId)).all();
}
export function catalogueMentions(code: string) {
  return db.select().from(catalogueReferences)
    .innerJoin(catalogueSnapshots, eq(catalogueReferences.snapshotId, catalogueSnapshots.id))
    .innerJoin(catalogueVersions, eq(catalogueSnapshots.versionId, catalogueVersions.id))
    .where(eq(catalogueReferences.code, code)).all();
}
export function catalogueLink(kind: CatalogueKind | string, code: string, year: number) {
  return `/catalogue/?${new URLSearchParams({ kind, code, year: String(year) })}`;
}
export function referenceLink(reference: SourceReference, entries: ReturnType<typeof catalogueEntries>): string | null {
  return reference.year !== null && entries.some(e => e.kind === reference.kind && e.code === reference.code && e.year === reference.year)
    ? catalogueLink(reference.kind, reference.code, reference.year) : null;
}
