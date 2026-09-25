import { describe, expect, it } from "vitest";
import { mergeSnapshots, parseCatalogue } from "./catalogue-parser";

const page = (code: string, body: string, year = 2027) => `<html><head>
  <meta name="course-code" content="${code}"><meta name="course-year" content="${year}">
  <meta name="course-name" content="Shared title">
  <link rel="canonical" href="https://programsandcourses.anu.edu.au/${year}/course/${code}">
  </head><body>${body}</body></html>`;

describe("offline catalogue interpretation boundary", () => {
  it("merges duplicate evidence, preserves provenance, and separates codes, years and changed rules", () => {
    const html = page("COMP8880", '<h2 id="incompatibility">Rules</h2><p>Requires COMP6670.</p>');
    const a = parseCatalogue(html, "assets/a.html");
    const b = parseCatalogue(html, "assets/AI/a.html");
    const otherCode = parseCatalogue(html.replaceAll("COMP8880", "COMP8980"), "assets/b.html");
    const otherYear = parseCatalogue(html.replaceAll("2027", "2026"), "assets/c.html");
    const changed = parseCatalogue(html.replace("Requires", "Incompatible with"), "assets/a.html");
    const merged = mergeSnapshots([a, b, otherCode, otherYear, changed]);
    expect(merged).toHaveLength(4);
    expect(merged.find(s => s.hash === a.hash)?.sources).toHaveLength(2);
    expect(mergeSnapshots([...merged, a, b])).toEqual(merged);
  });

  it("preserves mixed AND/OR wording, exclusions, list order and unversioned mentions without inferring a rule", () => {
    const rules = 'COMP6670 OR (COMP6710 or COMP6730) AND COMP8410 AND be enrolled in MADAN.';
    const s = parseCatalogue(page("COMP8980", `<h2 id="incompatibility">Rules</h2><p>${rules}</p>
      <p>Cannot count the following:</p><ul><li><a href="/2027/course/COMP8880">COMP8880</a></li></ul>`), "assets/rules.html");
    expect(s.evidence.sections[0].blocks.map(b => b.text)).toEqual([rules, "Cannot count the following:", "COMP8880"]);
    expect(s.evidence.sections[0].blocks[2].depth).toBe(1);
    expect(s.evidence.sections[0].blocks[2].references[0]).toMatchObject({ kind: "course", code: "COMP8880", year: 2027, basis: "link" });
    expect(s.evidence.sections[0].blocks[0].references[0]).toMatchObject({ code: "COMP6670", year: null, basis: "code-mention" });
  });

  it("keeps offering year distinct from catalogue year and retains delivery groups and dates", () => {
    const s = parseCatalogue(page("COMP6434", `<h2 id="terms">Offerings</h2><div>
      <div class="course-tabs-menu"><a href="#course-tab-2">2028</a></div>
      <div class="course-tab-content" id="course-tab-2"><h3>Second Semester</h3>
      <table class="table-terms"><thead><tr><th>Class number</th><th>Census date</th></tr></thead>
      <tbody><tr><td colspan="2">Online</td></tr><tr><td>11046</td><td>31 Aug 2028</td></tr></tbody></table></div></div>`), "assets/offers.html");
    expect(s.evidence.year).toBe(2027);
    expect(s.evidence.offerings).toEqual([{ year: 2028, session: "Second Semester", fields: { "Delivery group": "Online", "Class number": "11046", "Census date": "31 Aug 2028" } }]);
    expect(s.evidence.availability).toBe("listed");
  });

  it("does not equate missing requirements or missing availability with unrestricted enrolment", () => {
    const unknown = parseCatalogue(page("COMP8880", ""), "assets/unknown.html");
    const none = parseCatalogue(page("COMP8880", '<h2 id="terms">Offerings</h2><p>There are no current offerings for this course.</p>'), "assets/none.html");
    expect(unknown.evidence.availability).toBe("unknown");
    expect(unknown.evidence.sections[0].present).toBe(false);
    expect(unknown.evidence.issues.join(" ")).toContain("requirements are unknown");
    expect(none.evidence.availability).toBe("explicit-none");
  });

  it("uses canonical provenance when Chrome loses the URL and ignores scripts", () => {
    const s = parseCatalogue('<!-- saved from url=(0014)about:internet -->' + page("COMP6670", `<script>throw new Error('Do not run source scripts');</script>
      <h2 id="incompatibility">Rules</h2><p>Published text<script>document.body.innerHTML='wrong';</script></p>`), "assets/script.html");
    expect(s.sources[0].urlBasis).toBe("canonical-link");
    expect(s.evidence.sections[0].blocks[0].text).toBe("Published text");
  });
});
