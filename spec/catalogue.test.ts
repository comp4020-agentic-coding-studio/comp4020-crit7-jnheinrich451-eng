import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";
import catalogue from "../src/data/catalogue-sources.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { seedCatalogue } from "../src/lib/seed-catalogue";
import { seed } from "../src/lib/seed";
import { catalogueReferences, catalogueReviews, catalogueSnapshots, catalogueSources, catalogueVersions, enrolments, offerings, students } from "../src/lib/schema";
import { parseCatalogue } from "../scripts/catalogue-parser";

const base = inject("baseUrl");
async function page(query: string) {
  const res = await fetch(new URL(`/catalogue/${query}`, base));
  const dom = new JSDOM(await res.text());
  return { status: res.status, doc: dom.window.document, text: dom.window.document.body.textContent! };
}

describe("published course library over HTTP", () => {
  it("searches full, spaced and numeric codes without login and survives reload", async () => {
    for (const q of ["COMP6670", "COMP 6670", "6670"]) {
      const p = await page(`?q=${encodeURIComponent(q)}`);
      expect(p.status).toBe(200);
      expect(p.doc.querySelector(".library-results")?.textContent).toContain("COMP6670");
      expect(p.doc.querySelectorAll(".library-results > li")).toHaveLength(1);
    }
    expect((await page("?q=6670")).text).toBe((await page("?q=6670")).text);
  });
  it("keeps same-title codes separate and does not invent offerings", async () => {
    const search = await page("?q=Computational%20Methods%20for%20Network%20Science");
    expect(search.doc.querySelectorAll(".library-results > li")).toHaveLength(2);
    for (const code of ["COMP8880", "COMP8980"]) {
      const p = await page(`?kind=course&code=${code}&year=2027`);
      expect(p.text).toContain("explicitly says there are no current offerings");
      expect(p.doc.querySelectorAll("form[method=post]")).toHaveLength(0);
      expect(p.text).toContain("share the 2027 catalogue");
    }
    expect((await page("?kind=course&code=COMP8980&year=2027")).text).toContain("MADAN");
  });
  it("shows published dates, source copies and degree connections with their year", async () => {
    const p = await page("?kind=course&code=COMP6434&year=2027");
    expect(p.doc.querySelector("table")?.textContent).toContain("2028");
    expect(p.doc.querySelector("table")?.textContent).toContain("31 Aug 2027");
    expect(p.text).toContain("DTSC-SPEC");
    expect(p.text).toContain("SHA-256:");
    expect(p.text).toContain("awaiting review");
  });
  it("preserves specialisation groups and exposes missing evidence without substituting a year", async () => {
    const ai = await page("?kind=specialisation&code=ARTIF-SPEC&year=2027");
    expect(ai.text).toContain("minimum of 12 units of 8000-level");
    expect(ai.doc.querySelector('a[href*="code=COMP6670"]')).toBeTruthy();
    const degree = await page("?kind=program&code=7706XMCOMP&year=2027");
    expect(degree.doc.querySelector('a[href*="code=COMP6442"]')).toBeTruthy();
    expect((await page("?kind=course&code=COMP6434&year=2026")).status).toBe(404);
    expect((await page("?kind=course&code=MGMT7020&year=2027")).text).toContain("requirements are unknown");
  });
  it("links the four newly supplied courses while retaining the unresolved COMP8405 reference", async () => {
    for (const code of ["COMP6442", "COMP6490", "ENGN6627", "MATH6005"]) {
      const p = await page(`?kind=course&code=${code}&year=2027`);
      expect(p.status).toBe(200);
      expect(p.doc.querySelector(".entry-meta")?.textContent).toContain(code);
    }
    const prerequisite = await page("?kind=course&code=COMP6361&year=2027");
    expect(prerequisite.doc.querySelector('a[href*="code=COMP6442"]')).toBeTruthy();
    const systems = await page("?kind=specialisation&code=CMSY-SPEC&year=2027");
    expect(systems.doc.querySelector('a[href*="code=COMP8045"]')).toBeTruthy();
    expect(systems.doc.querySelector('a[href*="code=COMP8405"]')).toBeNull();
    expect(systems.text).toContain("COMP8405 Advanced Topics in Computer Systems is a special topics course");
    expect(systems.text).toContain("COMP8405 · 2027 · saved source not linked");
    expect((await page("?kind=course&code=COMP8045&year=2026")).status).toBe(404);
  });
  it("makes degree specialisations navigable while preserving published differences and missing pages", async () => {
    for (const code of ["7706XMCOMP", "7722XVCOMP", "MMLCV"]) {
      const degree = await page(`?kind=program&code=${code}&year=2027`);
      expect(degree.status).toBe(200);
      const source = catalogue.snapshots.find(s => s.evidence.code === code)!.evidence;
      const text = degree.text.replace(/\s+/g, " ");
      for (const block of source.sections.flatMap(section => section.blocks)) {
        expect(text).toContain(block.text.replace(/\s+/g, " "));
      }
      for (const anchor of degree.doc.querySelectorAll('.degree-contents a')) {
        expect(degree.doc.querySelector(anchor.getAttribute("href")!)).toBeTruthy();
      }
      if (code === "MMLCV") continue;
      const ai = degree.doc.querySelector('.specialisation-options a[href*="code=ARTIF-SPEC"]');
      expect(ai?.textContent).toBe("Artificial Intelligence");
      expect(ai?.getAttribute("href")).toContain("year=2027");
      const ml = [...degree.doc.querySelectorAll(".specialisation-options li")].find(li => li.textContent?.includes("Machine Learning"));
      expect(ml?.textContent).toContain("No saved 2027 page");
      expect(ml?.querySelector("a")).toBeNull();
      expect(degree.doc.querySelector("#academic-advice-0")?.querySelectorAll("h3").length).toBeGreaterThan(2);
    }
    const mcomp = await page("?kind=program&code=7706XMCOMP&year=2027");
    const headings = [...mcomp.doc.querySelectorAll("h3")].map(h => h.textContent);
    expect(headings).toEqual(expect.arrayContaining(["Specialisations", "Credit/Exemption Options", "Approved Credits/Exemptions"]));
    expect(mcomp.doc.querySelector('a[href="https://programsandcourses.anu.edu.au/specialisation/PCOM-SPEC"]')?.textContent).toBe("Professional Computing");
    for (const query of ["?kind=course&code=COMP6670&year=2027", "?kind=specialisation&code=ARTIF-SPEC&year=2027"]) {
      expect((await page(query)).doc.querySelector(".degree-section")).toBeNull();
    }
  });
});

it("persists evidence and reviews across reopen/reseed, preserves conflicts, and leaves student enrolments untouched", () => {
  const path = join(mkdtempSync(join(tmpdir(), "catalogue-")), "app.db");
  let client = new Database(path);
  let db = drizzle(client);
  client.pragma("foreign_keys = ON");
  migrate(db, { migrationsFolder: "./drizzle" });
  seed(db);
  const student = db.insert(students).values({ uid: "catalogue-test", name: "Fictional student", program: "vcomp" }).returning().get();
  const offer = db.select().from(offerings).get()!;
  db.insert(enrolments).values({ studentId: student.id, courseId: offer.courseId, year: offer.year, term: offer.term, via: "direct" }).run();
  const before = db.select().from(enrolments).all();
  const offeringCount = db.select().from(offerings).all().length;
  const snapshots = catalogue.snapshots as CatalogueSnapshot[];
  const versionCount = new Set(snapshots.map(s => `${s.evidence.kind}:${s.evidence.code}:${s.evidence.year}`)).size;
  const sourceCount = snapshots.reduce((total, s) => total + s.sources.length, 0);
  seedCatalogue(db, snapshots);
  const saved = db.select().from(catalogueSnapshots).get()!;
  db.update(catalogueReviews).set({ notes: "Grouping still requires confirmation." }).where(eq(catalogueReviews.snapshotId, saved.id)).run();
  client.close();
  client = new Database(path);
  client.pragma("foreign_keys = ON");
  db = drizzle(client);
  seedCatalogue(db, snapshots);
  expect(db.select().from(catalogueVersions).all()).toHaveLength(versionCount);
  expect(db.select().from(catalogueSnapshots).all()).toHaveLength(snapshots.length);
  expect(db.select().from(catalogueSources).all()).toHaveLength(sourceCount);
  expect(db.select().from(catalogueReviews).where(eq(catalogueReviews.snapshotId, saved.id)).get()?.notes).toContain("requires confirmation");
  expect(db.select().from(enrolments).all()).toEqual(before);
  expect(db.select().from(offerings).all()).toHaveLength(offeringCount);
  const conflict = parseCatalogue('<meta name="course-code" content="COMP8880"><meta name="course-year" content="2027"><meta name="course-name" content="Changed published wording"><h2 id="incompatibility">Rules</h2><p>COMP6670 OR COMP8600; grouping unresolved.</p>', "assets/conflict.html");
  seedCatalogue(db, [conflict]);
  expect(db.select().from(catalogueVersions).all()).toHaveLength(versionCount);
  expect(db.select().from(catalogueSnapshots).all()).toHaveLength(snapshots.length + 1);
  const mentioned = db.select().from(catalogueReferences).where(eq(catalogueReferences.quote, "COMP6670 OR COMP8600; grouping unresolved.")).all();
  expect(mentioned.map(r => r.code)).toEqual(["COMP6670", "COMP8600"]);
  expect(mentioned.every(r => r.year === null)).toBe(true);
  const added = db.select().from(catalogueSnapshots).where(eq(catalogueSnapshots.hash, conflict.hash)).get()!;
  expect(db.select().from(catalogueReviews).where(eq(catalogueReviews.snapshotId, added.id)).get()?.status).toBe("unreviewed");
  client.close();
});
