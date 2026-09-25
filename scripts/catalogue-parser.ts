import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";
import type { CatalogueEvidence, CatalogueKind, CatalogueSnapshot, SourceBlock, SourceReference, SourceSection } from "../src/lib/catalogue-types.ts";

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();
export const sha256 = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
const origin = "https://programsandcourses.anu.edu.au";

function sourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin === origin ? url.href : null;
  } catch { return null; }
}

function references(element: Element): SourceReference[] {
  const result: SourceReference[] = [];
  for (const link of element.querySelectorAll("a[href]")) {
    const url = new URL(link.getAttribute("href")!, origin);
    if (url.origin !== origin) continue;
    const match = url.pathname.match(/^\/(?:(\d{4})\/)?(course|program|specialisation)\/([\w-]+)\/?$/i);
    if (!match) continue;
    result.push({ kind: match[2].toLowerCase() as CatalogueKind, code: match[3].toUpperCase(),
      year: match[1] ? Number(match[1]) : null, url: url.href, basis: "link" });
  }
  for (const match of normalise(element.textContent ?? "").matchAll(/\b[A-Z]{4}\d{4}\b/g)) {
    if (!result.some(r => r.kind === "course" && r.code === match[0])) {
      result.push({ kind: "course", code: match[0], year: null, url: null, basis: "code-mention" });
    }
  }
  return result.filter((r, i) => result.findIndex(other => JSON.stringify(other) === JSON.stringify(r)) === i);
}

function sectionElements(doc: Document, id: string): Element[] {
  const heading = doc.getElementById(id);
  if (!heading) return [];
  const level = Number(heading.tagName.slice(1));
  const result: Element[] = [];
  for (let e = heading.nextElementSibling; e; e = e.nextElementSibling) {
    if (/^H[1-6]$/.test(e.tagName) && Number(e.tagName.slice(1)) <= level) break;
    if (!["SCRIPT", "STYLE"].includes(e.tagName)) result.push(e);
  }
  return result;
}

function section(doc: Document, key: string, title: string): SourceSection {
  const blocks: SourceBlock[] = [];
  // Retain paragraph order and list nesting; never infer AND/OR or count each
  // linked course as compulsory. Inline-only containers become one block.
  function visit(element: Element, depth: number) {
    if (["SCRIPT", "STYLE"].includes(element.tagName)) return;
    const children = [...element.children];
    const nested = children.some(e => /^(P|DIV|UL|OL|LI|TABLE|H[1-6])$/.test(e.tagName));
    if (!nested) {
      const text = normalise(element.textContent ?? "");
      if (text) blocks.push({ text, depth, references: references(element) });
      return;
    }
    let inline = doc.createElement("span");
    const flush = () => { if (normalise(inline.textContent ?? "")) visit(inline, depth); inline = doc.createElement("span"); };
    for (const node of element.childNodes) {
      if (node.nodeType === 1 && /^(P|DIV|UL|OL|LI|TABLE|H[1-6])$/.test((node as Element).tagName)) {
        flush();
        visit(node as Element, depth + (/^(UL|OL)$/.test((node as Element).tagName) ? 1 : 0));
      } else inline.appendChild(node.cloneNode(true));
    }
    flush();
  }
  for (const element of sectionElements(doc, key)) visit(element, /^(UL|OL)$/.test(element.tagName) ? 1 : 0);
  return { key, title, present: !!doc.getElementById(key), blocks };
}

/** JSDOM's default disables scripts and external resources. No fetches. */
export function parseCatalogue(html: string, path: string): CatalogueSnapshot {
  const dom = new JSDOM(html);
  try {
    const doc = dom.window.document;
    doc.querySelectorAll("script,style").forEach(e => e.remove());
    const meta = (key: string) => doc.querySelector<HTMLMetaElement>(`meta[name="${key}"]`)?.content ?? "";
    const kind = (["course", "program", "specialisation"] as const).find(k => meta(`${k}-code`));
    if (!kind) throw new Error(`No catalogue identity: ${path}`);
    const code = meta(`${kind}-code`).toUpperCase();
    const year = Number(meta(`${kind}-year`));
    const title = normalise(meta(`${kind}-name`));
    if (!/^[A-Z0-9-]+$/.test(code) || !Number.isInteger(year) || year < 2000 || year > 2100 || !title) {
      throw new Error(`Invalid catalogue identity: ${path}`);
    }
    const description = JSDOM.fragment(meta(`${kind}-description`));
    description.querySelectorAll("script,style").forEach(e => e.remove());
    const unitsElement = doc.querySelector(".degree-summary__requirements-units")?.cloneNode(true) as Element | undefined;
    unitsElement?.querySelectorAll(".degree-summary__requirements-heading").forEach(e => e.remove());
    const sections = kind === "course"
      ? [section(doc, "incompatibility", "Requisite and Incompatibility"), section(doc, "learning-outcomes", "Learning Outcomes")]
      : kind === "program"
        ? [section(doc, "program-requirements", "Program Requirements"), section(doc, "specialisations", "Specialisations"), section(doc, "academic-advice", "Academic Advice")]
        : [section(doc, "requirements", "Requirements"), section(doc, "other-information", "Other Information")];
    const offeringElements = sectionElements(doc, "terms");
    const offeringText = normalise(offeringElements.map(e => e.textContent).join(" "));
    const issues: string[] = [];
    const offerings: CatalogueEvidence["offerings"] = [];
    if (kind === "course") {
      for (const container of offeringElements) {
        for (const table of container.querySelectorAll("table.table-terms")) {
          const panel = table.closest(".course-tab-content");
          const yearText = [...doc.querySelectorAll(".course-tabs-menu a")].find(a =>
            a.getAttribute("href")?.split("#")[1] === panel?.id)?.textContent?.trim();
          const offeringYear = yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : null;
          let previous = table.previousElementSibling;
          while (previous && previous.tagName !== "H3") previous = previous.previousElementSibling;
          const session = previous ? normalise(previous.textContent ?? "") : null;
          const headers = [...table.querySelectorAll("thead th")].map(e => normalise(e.textContent ?? ""));
          if (!headers.length || !offeringYear || !session) issues.push("Offering table needs review: missing year, session or headings.");
          let deliveryGroup: string | null = null;
          for (const row of table.querySelectorAll("tbody tr")) {
            const cells = [...row.querySelectorAll(":scope > td")];
            if (!cells.length) continue;
            if (cells.length === 1 && headers.length > 1 && Number(cells[0].getAttribute("colspan")) === headers.length) {
              deliveryGroup = normalise(cells[0].textContent ?? "");
              continue;
            }
            if (cells.length !== headers.length || cells.some(e => Number(e.getAttribute("colspan") ?? 1) !== 1)) {
              issues.push("Offering table needs review: unsupported row layout; see the complete offering text.");
              continue;
            }
            offerings.push({ year: offeringYear, session, fields: {
              ...(deliveryGroup ? { "Delivery group": deliveryGroup } : {}),
              ...Object.fromEntries(cells.map((e, i) => [headers[i], normalise(e.textContent ?? "")])) } });
          }
        }
      }
    }
    const availability = kind !== "course" ? "not-applicable" : offeringText.includes("There are no current offerings for this course.")
      ? "explicit-none" : offerings.length ? "listed" : "unknown";
    if (!sections[0].present) issues.push("Requirement section missing: requirements are unknown.");
    if (availability === "unknown") issues.push("Availability unknown: no readable offering rows or explicit no-offerings statement.");
    if (availability === "explicit-none" && offerings.length) issues.push("Offering rows contradict the no-current-offerings statement.");
    const evidence: CatalogueEvidence = { kind, code, year, title, description: normalise(description.textContent ?? ""),
      units: unitsElement ? normalise(unitsElement.textContent ?? "") || null : null,
      sections, availability, offerings, offeringText, issues: [...new Set(issues)] };
    const saved = html.match(/saved from url=\(\d+\)([^\s]+)/)?.[1] ?? null;
    const canonical = doc.querySelector("link[rel=canonical]")?.getAttribute("href") ?? null;
    const url = sourceUrl(saved) ?? sourceUrl(canonical);
    return { hash: sha256(JSON.stringify(evidence)), evidence, sources: [{ path: path.replace(/\\/g, "/"),
      sha256: sha256(html), url, urlBasis: sourceUrl(saved) ? "saved-from-url" : url ? "canonical-link" : "unknown" }] };
  } finally { dom.window.close(); }
}

export function mergeSnapshots(snapshots: CatalogueSnapshot[]): CatalogueSnapshot[] {
  const byHash = new Map<string, CatalogueSnapshot>();
  for (const snapshot of snapshots) {
    const existing = byHash.get(snapshot.hash);
    if (existing) existing.sources.push(...snapshot.sources);
    else byHash.set(snapshot.hash, { ...snapshot, sources: [...snapshot.sources] });
  }
  return [...byHash.values()].map(s => ({ ...s, sources: s.sources.filter((source, i, all) =>
    all.findIndex(other => other.path === source.path && other.sha256 === source.sha256) === i)
    .sort((a, b) => a.path.localeCompare(b.path, "en") || a.sha256.localeCompare(b.sha256, "en")) }))
    .sort((a, b) => `${a.evidence.kind}:${a.evidence.code}:${a.evidence.year}:${a.hash}`.localeCompare(`${b.evidence.kind}:${b.evidence.code}:${b.evidence.year}:${b.hash}`, "en"));
}
