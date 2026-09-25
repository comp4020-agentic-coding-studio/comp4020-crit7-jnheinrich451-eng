import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { CatalogueSnapshot } from "./catalogue-types";
import { catalogueReferences, catalogueReviews, catalogueSnapshots, catalogueSources, catalogueVersions } from "./schema";

/** Add evidence, never replace it or reset a review. Duplicate source copies
 * point to one snapshot. Conflicting copies remain separate visible variants. */
export function seedCatalogue(db: BetterSQLite3Database, snapshots: CatalogueSnapshot[]): void {
  db.transaction(tx => {
    for (const snapshot of snapshots) {
      const { kind, code, year } = snapshot.evidence;
      tx.insert(catalogueVersions).values({ kind, code, year }).onConflictDoNothing().run();
      const version = tx.select().from(catalogueVersions).where(and(eq(catalogueVersions.kind, kind), eq(catalogueVersions.code, code), eq(catalogueVersions.year, year))).get()!;
      tx.insert(catalogueSnapshots).values({ versionId: version.id, hash: snapshot.hash, evidence: JSON.stringify(snapshot.evidence) }).onConflictDoNothing().run();
      const saved = tx.select().from(catalogueSnapshots).where(eq(catalogueSnapshots.hash, snapshot.hash)).get()!;
      for (const source of snapshot.sources) {
        tx.insert(catalogueSources).values({ snapshotId: saved.id, ...source }).onConflictDoNothing().run();
      }
      let position = 0;
      for (const section of snapshot.evidence.sections) {
        section.blocks.forEach((block, index) => {
          for (const reference of block.references) {
            tx.insert(catalogueReferences).values({ snapshotId: saved.id, position: position++, section: section.key, block: index, quote: block.text, ...reference }).onConflictDoNothing().run();
          }
        });
      }
      tx.insert(catalogueReviews).values({ snapshotId: saved.id }).onConflictDoNothing().run();
    }
  });
}
