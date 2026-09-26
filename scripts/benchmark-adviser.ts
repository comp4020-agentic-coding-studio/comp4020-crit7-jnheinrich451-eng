// Opt-in live model smoke benchmark. Never part of pnpm check; no accounts or mail.
import catalogue from "../src/data/catalogue-sources.json";
import reference from "../src/data/adviser-reference.json";
import type { CatalogueSnapshot } from "../src/lib/catalogue-types";
import { generateAuthoredProfile } from "../src/lib/profile-template";
import { rulesForSource } from "../src/lib/course-rules";
import { fixedUnits } from "../src/lib/course-evidence";
import { ADVISER_VERSION, adviserContext, askOllama, matchCourses, preferredPlan } from "../src/lib/course-adviser";
import { fetchOllama } from "../src/lib/ollama-transport";
if (!process.env.OLLAMA_BASE_URL) throw new Error("Set OLLAMA_BASE_URL for this opt-in local model benchmark.");
const sources = catalogue.snapshots as CatalogueSnapshot[];
const courses = sources.filter(s => s.evidence.kind === "course" && s.evidence.year === 2027).map(s => ({ code: s.evidence.code,
  title: s.evidence.title, units: fixedUnits(s.evidence), rules: rulesForSource(s.evidence.code, 2027, s), source: s }));
const input = { program: "VCOMP", year: 2027, term: "S2", sources, courses, confirmed: [],
  results: generateAuthoredProfile("adviser-benchmark-v1").records.map(r => ({ ...r, code: r.courseCode })) };
const context = adviserContext(input);
let passedCount = 0;
for (const test of reference.cases) {
  let inference: Record<string, number> | undefined;
  const result = await askOllama(test.preferences, context.pool, { fetcher: async (url, options) => {
    const response = await fetchOllama(String(url), options);
    if (response.ok && String(url).endsWith("/api/generate")) {
      const raw = await response.clone().json();
      inference = Object.fromEntries(["total_duration", "load_duration", "prompt_eval_count", "prompt_eval_duration", "eval_count", "eval_duration"]
        .filter(key => typeof raw[key] === "number").map(key => [key, raw[key]]));
      if (process.env.ADVISER_BENCHMARK_DEBUG === "1") console.log(JSON.stringify({ raw: raw.response, done: raw.done_reason }));
    }
    return response;
  } });
  const plan = preferredPlan(input, 18, result.response);
  const topics = result.response.topics ?? [];
  // A subject case passes when an acceptable topic was chosen, and a course was
  // grounded whenever this student's ready pool has one for those topics (a
  // no-match is correct when the relevant courses are already passed or not
  // ready). A non-subject case must match nothing.
  const available = matchCourses(topics.filter(t => test.topics.includes(t)), context.pool).length > 0;
  const passed = test.topics.length
    ? topics.some(t => test.topics.includes(t)) && (result.response.matches.length > 0 || !available)
    : result.response.matches.length === 0;
  if (passed) passedCount++;
  console.log(JSON.stringify({ at: new Date().toISOString(), version: ADVISER_VERSION, poolSize: context.pool.length, id: test.id, keyword: test.keyword,
    expected: test.topics, available, topics, method: result.response.method ?? null, reason: result.response.reason, failure: result.response.failure ?? null,
    matches: result.response.matches.map(m => m.code), model: result.model, digest: result.digest, elapsedMs: result.elapsedMs, inference,
    checkedOptions: plan.options.map(c => c.course.code), units: plan.proposedUnits, passed }));
}
console.log(JSON.stringify({ summary: `${passedCount}/${reference.cases.length} reference cases passed`, version: ADVISER_VERSION }));
if (passedCount < reference.cases.length) process.exitCode = 1;
