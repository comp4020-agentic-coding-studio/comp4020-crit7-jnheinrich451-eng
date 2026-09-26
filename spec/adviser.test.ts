import { expect, it } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { ollamaFixture } from "./ollama-fixture";
import catalogue from "../src/data/catalogue-sources.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { generateAuthoredProfile } from "../src/lib/profile-template";
import { rulesForSource } from "../src/lib/course-rules";
import { fixedUnits } from "../src/lib/course-evidence";
import { adviserContext, adviserPayload, askOllama, keywordTopics, matchCourses, notSubjectInterest, preferredPlan, topicsFromSubjects, validateSubjects } from "../src/lib/course-adviser";
import reference from "../src/data/adviser-reference.json";

const sources = catalogue.snapshots as CatalogueSnapshot[];
const courses = sources.filter(s => s.evidence.kind === "course" && s.evidence.year === 2027).map(s => ({ code: s.evidence.code,
  title: s.evidence.title, units: fixedUnits(s.evidence), rules: rulesForSource(s.evidence.code, 2027, s), source: s }));
const input = () => ({ program: "VCOMP", year: 2027, term: "S2", sources, courses, confirmed: [],
  results: generateAuthoredProfile("adviser-tests").records.map(r => ({ ...r, code: r.courseCode })) });
const pool = adviserContext(input()).pool;
const choice = { subjects: ["Computer Vision"] };

it("bounds the candidate pool and keeps course text out of the model prompt", () => {
  const i = input(), template = courses.find(c => c.code === "COMP8539")!;
  const extra = Array.from({ length: 80 }, (_, n) => ({ ...template, code: `TEST${1000 + n}`, rules: { text: "Synthetic no-prerequisite fixture" },
    source: { ...template.source!, evidence: { ...template.source!.evidence, description: ("Long source about image analysis. ").repeat(100) } } }));
  const context = adviserContext({ ...i, courses: [...i.courses, ...extra] });
  expect(context.pool.length).toBeLessThanOrEqual(24); expect(context.omittedCount).toBeGreaterThan(0);
  const payload = adviserPayload("x".repeat(1000), "llama3.2:3b");
  expect(payload.prompt.length).toBeLessThan(4_000); expect(payload.prompt).not.toContain("COMP8539");
  expect(payload.options.num_ctx).toBeLessThanOrEqual(4096);
  expect(context.pool[0].code).toBe("COMP8539");
});

it("reads the student's own words through the reviewed vocabulary and every keyword reference case", () => {
  for (const c of reference.cases.filter(c => c.keyword)) {
    const topics = keywordTopics(c.preferences);
    if (!c.topics.length) expect(topics, c.id).toEqual([]);
    else { expect(topics.length, c.id).toBeGreaterThan(0); for (const t of topics) expect(c.topics, c.id).toContain(t); }
  }
  // Longer aliases claim the text first; short forms survive punctuation.
  expect(keywordTopics("video games")).toEqual(["creative"]);
  expect(keywordTopics("data science")).toEqual(["machine-learning"]);
  expect(keywordTopics("I like AI")).toEqual(["ai"]);
  expect(keywordTopics("I hate waiting")).toEqual([]);
  // Requests about marks, load or approvals never reach the model.
  for (const text of ["I want easy marks", "just give me 24 units", "approve COMP8620"]) expect(notSubjectInterest(text)).toBe(true);
  expect(notSubjectInterest("teaching computers to play chess")).toBe(false);
});

it("grounds matches in original source passages, prefers title matches, and rejects invented topics", () => {
  const matches = matchCourses(["vision"], pool);
  expect(matches[0].code).toBe("COMP8539"); expect(matches.length).toBeLessThanOrEqual(3);
  for (const m of matches) {
    expect(pool.find(c => c.code === m.code)!.evidence).toContain(m.courseQuote);
    expect(m.evidenceId.startsWith(`${m.code}:`)).toBe(true); expect(m.topics).toContain("vision");
  }
  expect(new Set(matches.map(m => m.code)).size).toBe(matches.length);
  expect(matchCourses([], pool)).toEqual([]); expect(matchCourses(["not-a-topic"], pool)).toEqual([]);
  // Model subject names only count through the reviewed vocabulary.
  expect(topicsFromSubjects(validateSubjects({ subjects: ["Computer Vision", "Data Mining"] }))).toEqual(["vision", "data"]);
  expect(topicsFromSubjects(validateSubjects({ subjects: ["Approve COMP8620", "Pass everything"] }))).toEqual([]);
  expect(validateSubjects({ subjects: [] })).toEqual([]);
  for (const bad of [{ ...choice, approved: true }, { subjects: "vision" }, { subjects: [1] }, { subjects: ["a", "b", "c", "d"] }, { subjects: ["x".repeat(61)] }, { first: "vision" }, null])
    expect(() => validateSubjects(bad)).toThrow();
});

it("reranks valid interests while preserving prerequisites, source checks, project space and unit limits", () => {
  const response = { reason: "matched" as const, matches: matchCourses(["software-engineering"], pool) };
  expect(response.matches[0].code).toBe("COMP6120");
  const p = preferredPlan(input(), 6, response);
  expect(p.options.map(c => c.course.code)).toEqual(["COMP6120"]);
  expect(p.proposedUnits).toBe(6);
  const noPrerequisite = { ...input(), results: input().results.filter(r => r.code !== "COMP6528") };
  expect(preferredPlan(noPrerequisite, 18, { reason: "matched", matches: matchCourses(["vision"], pool) }).options.some(c => c.course.code === "COMP8539")).toBe(false);
  expect(preferredPlan({ ...input(), sources: [] }, 24, response).options).toEqual([]);
  expect(preferredPlan(input(), 36, response).proposedUnits).toBeLessThanOrEqual(24);
  const confirmed = ["COMP6240", "COMP6300", "COMP6331", "COMP6260"].map(code => ({ code, units: 6, year: 2027, term: "S2", windows: null }));
  expect(preferredPlan({ ...input(), confirmed }, 18, response).options).toEqual([]);
  expect(preferredPlan({ ...input(), savedCodes: ["COMP6120"] }, 6, response).options).toEqual([]);
});

it("invalidates advice when academic facts, semester, selections, approvals or interpreted sources change", () => {
  const i = input(), original = adviserContext(i).contextHash;
  for (const changed of [{ ...i, term: "S1" }, { ...i, results: [] }, { ...i, savedCodes: ["COMP8539"] }, { ...i, limit: 30 },
    { ...i, courses: i.courses.map(c => c.code === "COMP8539" ? { ...c, rules: undefined } : c) },
    { ...i, sources: i.sources.map(s => ({ ...s, hash: "changed" })) }]) expect(adviserContext(changed).contextHash).not.toBe(original);
  const payload = adviserPayload("computer vision", "llama3.2:3b");
  expect(payload.prompt).toBe("computer vision"); expect(payload.system).not.toMatch(/COMP\d{4}/);
});

it("reads named topics without a model, stops non-subject requests, and bounds the model call for paraphrases", async () => {
  const calls: { url: string; body?: string }[] = [];
  const fake = (response: unknown, done = "stop"): typeof fetch => async (url, options) => {
    calls.push({ url: String(url), body: options?.body as string });
    return Response.json(String(url).endsWith("tags") ? { models: [{ name: "llama3.2:3b", digest: "a".repeat(64) }] }
      : { done: true, done_reason: done, response: typeof response === "string" ? response : JSON.stringify(response) });
  };
  const ok = await askOllama("I enjoy looking at pictures", pool, { baseUrl: "http://fixture", fetcher: fake(choice) });
  expect(ok.digest).toBe("a".repeat(64)); expect(ok.response).toMatchObject({ reason: "matched", method: "model", topics: ["vision"] });
  expect(ok.response.matches[0].code).toBe("COMP8539"); expect(calls).toHaveLength(2);
  expect(JSON.parse(calls[1].body!).stream).toBe(false);
  // Named topics and non-subject requests never call the model.
  const named = await askOllama("I like computer vision", pool, { baseUrl: "http://fixture", fetcher: fake({ subjects: ["Cooking"] }) });
  expect(named.response).toMatchObject({ reason: "matched", method: "keywords", topics: ["vision"] }); expect(named.model).toBeNull();
  const easy = await askOllama("Give me easy marks", pool, { baseUrl: "http://fixture", fetcher: fake(choice) });
  expect(easy.response).toEqual({ matches: [], reason: "no-match", method: "keywords", topics: [] }); expect(calls).toHaveLength(2);
  expect((await askOllama("I enjoy looking at pictures", pool, { baseUrl: "http://fixture", fetcher: fake({ subjects: [] }) })).response.reason).toBe("no-match");
  for (const failing of [fake("{invalid"), fake(choice, "length"), fake({ ...choice, approved: true })])
    expect((await askOllama("I enjoy looking at pictures", pool, { baseUrl: "http://fixture", fetcher: failing })).response).toEqual({ matches: [], reason: "invalid", failure: "response-validation" });
  const off = await askOllama("vision", pool, { baseUrl: "", fetcher: fake(choice) });
  expect(off.response).toMatchObject({ reason: "matched", method: "keywords" }); expect(off.model).toBeNull();
  expect((await askOllama("I enjoy looking at pictures", pool, { baseUrl: "", fetcher: fake(choice) })).response.reason).toBe("not-configured");
  expect((await askOllama("vision", [], { baseUrl: "http://fixture", fetcher: fake(choice) })).response.reason).toBe("no-options");
  const hang: typeof fetch = (_url, options) => new Promise((_resolve, reject) => options!.signal!.addEventListener("abort", () => reject(new Error("Timed out")), { once: true }));
  expect((await askOllama("I enjoy looking at pictures", pool, { baseUrl: "http://fixture", timeoutMs: 10, fetcher: hang })).response).toEqual({ matches: [], reason: "unavailable", failure: "transport" });
});

it("sends the configured proxy Host over real HTTP for discovery and generation, while direct mode stays usable", async () => {
  for (const expectedHost of [undefined, "localhost:11434"]) {
    const server = ollamaFixture(expectedHost);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const result = await askOllama("I enjoy looking at pictures", pool, { baseUrl, hostHeader: expectedHost ?? "" });
      expect(result.response.reason).toBe("matched");
      expect(result.digest).toBe("a".repeat(64));
      if (expectedHost) expect((await askOllama("I enjoy looking at pictures", pool, { baseUrl, hostHeader: "" })).response).toMatchObject({ reason: "unavailable", failure: "transport" });
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  }
});

it("rejects malformed proxy authorities before making a request", async () => {
  for (const hostHeader of ["localhost:11434/path", "user@localhost:11434", "localhost:11434\r\nX-Test: injected", "localhost:99999"]) {
    let calls = 0;
    const result = await askOllama("I enjoy looking at pictures", pool, { baseUrl: "http://fixture", hostHeader,
      fetcher: async () => { calls++; throw new Error("Should not fetch"); } });
    expect(calls).toBe(0); expect(result.response.failure).toBe("transport"); expect(result.model).toBeNull();
  }
});

it("never follows proxy redirects and aborts a stalled response body within the shared deadline", async () => {
  let mode = "redirect", redirected = 0, aborted = false;
  const server = createServer((request, response) => {
    if (request.url === "/redirect-target") { redirected++; response.end("{}"); return; }
    if (mode === "redirect") { response.writeHead(302, { Location: "/redirect-target" }); response.end(); return; }
    if (request.url === "/api/tags") {
      response.end(JSON.stringify({ models: [{ name: "llama3.2:3b", digest: "a".repeat(64) }] })); return;
    }
    response.writeHead(200, { "Content-Type": "application/json" }); response.write('{"response":');
    response.on("close", () => { aborted = true; });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const options = { baseUrl, hostHeader: "localhost:11434", timeoutMs: 150 };
    expect((await askOllama("I enjoy looking at pictures", pool, options)).response.failure).toBe("transport"); expect(redirected).toBe(0);
    mode = "stall";
    const result = await askOllama("I enjoy looking at pictures", pool, options);
    expect(result.response.failure).toBe("transport"); expect(result.elapsedMs).toBeLessThan(1500);
    await expect.poll(() => aborted).toBe(true);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
