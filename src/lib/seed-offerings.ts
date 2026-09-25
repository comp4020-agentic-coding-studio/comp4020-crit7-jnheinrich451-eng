import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { ACTIVE_YEAR } from "./academic-year";
import { fixedUnits, publishedTerms } from "./course-evidence";
import type { CatalogueEvidence } from "./catalogue-types";
import { convenorFor, CONVENORS } from "../data/people";
import { catalogueSnapshots, catalogueVersions, convenors, courses, offerings } from "./schema";

/** The catalogue is authoritative for new offerings. Existing course ids and
 * historical decisions survive. Stale offerings are retained for history;
 * store.offeringFor also validates against the current source before use. */
export function seedPublishedOfferings(db: BetterSQLite3Database): void {
  db.transaction(tx => {
    const versions = tx.select().from(catalogueVersions).where(and(eq(catalogueVersions.kind, "course"), eq(catalogueVersions.year, ACTIVE_YEAR))).all();
    for (const version of versions) {
      const sources = tx.select().from(catalogueSnapshots).where(eq(catalogueSnapshots.versionId, version.id)).all();
      if (!sources.length) continue;
      const evidence = JSON.parse(sources[0].evidence) as CatalogueEvidence;
      const reviewer = CONVENORS.find(c => c.key === convenorFor(version.code))!;
      const convenor = tx.select().from(convenors).where(eq(convenors.email, reviewer.email)).get()!;
      tx.insert(courses).values({ code: version.code, title: evidence.title, units: fixedUnits(evidence), terms: "[]", convenorId: convenor.id }).onConflictDoNothing().run();
      const course = tx.select().from(courses).where(eq(courses.code, version.code)).get()!;
      if (sources.length !== 1) continue;
      for (const term of publishedTerms(evidence, ACTIVE_YEAR)) {
        tx.insert(offerings).values({ courseId: course.id, year: ACTIVE_YEAR, term }).onConflictDoNothing().run();
      }
    }
  });
}
