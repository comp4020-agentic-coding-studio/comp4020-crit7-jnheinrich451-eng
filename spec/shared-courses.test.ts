import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";
import catalogue from "../src/data/catalogue-sources.json";
import reviews from "../src/data/enrolment-rules-2027.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { rulesForSource } from "../src/lib/course-rules";
import { gate } from "../src/lib/eligibility";

const base = inject("baseUrl");
const cookie = inject("fixtureCookies")["Offering test student"];
const sources = catalogue.snapshots as CatalogueSnapshot[];
async function page(path: string) {
  const res = await fetch(new URL(path, base), { headers: { cookie }, redirect: "manual" });
  return { status: res.status, doc: new JSDOM(await res.text()).window.document };
}
async function post(path: string, fields: Record<string, string>) {
  return fetch(new URL(path, base), { method: "POST", headers: { cookie, origin: base }, body: new URLSearchParams(fields), redirect: "manual" });
}

describe("shared course evidence", () => {
  it("lists the same 80 course identities as the library, including new subjects and unavailable courses", async () => {
    const find = (await page("/")).doc;
    const library = (await page("/catalogue/?kind=course&year=2027")).doc;
    const codes = [...find.querySelectorAll(".course-card .code")].map(e => e.textContent);
    expect(codes).toHaveLength(80);
    expect(codes).toEqual([...library.querySelectorAll(".library-results strong")].map(e => e.textContent));
    for (const code of ["COMP6442", "COMP6490", "ENGN6627", "MATH6005"]) expect(codes).toContain(code);
    const law = (await page("/?subject=LAWS")).doc;
    expect(law.querySelectorAll(".course-card").length).toBeGreaterThan(0);
    expect([...law.querySelectorAll(".code")].every(e => e.textContent?.startsWith("LAWS"))).toBe(true);
  });
  it("shares published title, description, credit range, requirements and links in both directions", async () => {
    const source = sources.find(s => s.evidence.kind === "course" && s.evidence.units === "6 to 24 units")!;
    const { code, description, title, units } = source.evidence;
    const doc = (await page(`/courses/${code}/`)).doc;
    expect(doc.querySelector("h1")?.textContent).toBe(title);
    expect(doc.querySelector("main")?.textContent).toContain(description);
    expect(doc.querySelector(".facts")?.textContent).toContain(units);
    expect([...doc.querySelectorAll<HTMLAnchorElement>('a[href^="/catalogue/"]')].some(a => {
      const url = new URL(a.getAttribute("href")!, base);
      return url.searchParams.get("code") === code && url.searchParams.get("year") === "2027";
    })).toBe(true);
    const library = (await page(`/catalogue/?kind=course&code=${code}&year=2027`)).doc;
    expect(library.querySelector(`a[href="/courses/${code}/?year=2027"]`)).toBeTruthy();
    const prerequisite = (await page("/courses/COMP6361/")).doc;
    expect(prerequisite.querySelector('a[href*="code=COMP6442"]')).toBeTruthy();
  });
  it("does not invent offerings or reuse a missing course's 2026 entry", async () => {
    const none = (await page("/courses/COMP6490/")).doc;
    expect(none.querySelector("main")?.textContent).toContain("explicitly lists no current offerings");
    expect(none.querySelector('input[name="offeringId"]')).toBeNull();
    expect(none.querySelector('form[action="/api/enrol"]')).toBeNull();
    const invalid = await post("/api/enrol", { courseCode: "COMP6490", year: "2027", term: "S1" });
    expect(new URL(invalid.headers.get("location")!, base).searchParams.get("error")).toContain("isn't offered");
    expect((await page("/courses/ENGN8501/")).status).toBe(404);
    expect((await page("/courses/ENGN8501/?year=2026")).status).toBe(200);
    expect((await page("/courses/COMP8620/?year=2028")).status).toBe(404);
  });
  it("allows assessment of an explicit source gap while blocking direct enrolment", async () => {
    const doc = (await page("/courses/MGMT7020/")).doc;
    expect(doc.querySelector("#gate-heading")?.textContent).toBe("Assessment incomplete");
    expect(doc.querySelector("main")?.textContent).toContain("Requisite and Incompatibility");
    const offeringId = doc.querySelector<HTMLInputElement>('input[name="offeringId"]')!.value;
    await post("/api/selections", { offeringId, action: "add" });
    expect((await page("/plan/")).doc.querySelector("main")?.textContent).toContain("MGMT7020");
    const term = doc.querySelector<HTMLOptionElement>('select[name="term"] option')!.value;
    expect(doc.querySelector('form[action="/api/applications"]')).toBeTruthy();
    const result = await post("/api/enrol", { courseCode: "MGMT7020", year: "2027", term });
    const url = new URL(result.headers.get("location")!, base);
    expect(url.pathname).toBe("/courses/MGMT7020/");
    expect(url.searchParams.get("year")).toBe("2027");
    expect(url.searchParams.has("error")).toBe(true);
    const requested = await post("/api/applications", { courseCode: "MGMT7020", year: "2027", term, statement: "Assess the published requirements against my fictional record." });
    expect(requested.headers.get("location")).toMatch(/^\/applications\/\d+\/$/);
    expect((await page(requested.headers.get("location")!)).doc.querySelector("main")?.textContent).toContain("Unknown: The saved MGMT7020 page has no requisite section");
  });
});

describe("rules are bound to inspected source snapshots", () => {
  it("accounts for all 80 saved courses but requires review after source changes or conflicts", () => {
    expect(reviews).toHaveLength(80);
    for (const review of reviews) {
      const source = sources.find(s => s.hash === review.sourceHash)!;
      expect(rulesForSource(review.code, 2027, source)).toBeDefined();
      expect(rulesForSource(review.code, 2027, { ...source, hash: "changed" })).toBeUndefined();
      expect(rulesForSource(review.code, 2027, source, true)).toBeUndefined();
      expect(rulesForSource(review.code, 2028, source)).toBeUndefined();
    }
  });
  it("enforces COMP6528's published incompatibilities without rewriting the historical rule", () => {
    const source = sources.find(s => s.evidence.code === "COMP6528")!;
    const record = { program: "VCOMP" as const, passed: [{ code: "COMP4528", units: 6 }], failed: [], enrolled: [] };
    expect(gate("COMP6528", rulesForSource("COMP6528", 2027, source), record)).toMatchObject({ outcome: "rules-not-met", incompatible: ["COMP4528"] });
    expect(gate("COMP6528", rulesForSource("COMP6528", 2026), record).outcome).toBe("eligible");
  });
});
