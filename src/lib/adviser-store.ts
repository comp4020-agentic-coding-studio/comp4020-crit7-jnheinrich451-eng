import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { adviserRuns, studyPlanEvents, type Student } from "./schema";
import { planningInputOf } from "./planning-store";
import { ADVISER_VERSION, ADVISER_LEASE_MS, UNIT_TARGETS, adviserContext, askOllama, preferredPlan, type AdviserResponse } from "./course-adviser";
import { UserError } from "./errors";
import { throttle } from "./auth";

export const lastAdviserRun = (studentId: number) => db.select().from(adviserRuns).where(eq(adviserRuns.studentId, studentId)).orderBy(desc(adviserRuns.id)).get();
export function adviserView(student: Student, input = planningInputOf(student)) {
  const context = adviserContext(input), run = lastAdviserRun(student.id);
  const stale = !!run && run.contextHash !== context.contextHash;
  const response = run?.response ? JSON.parse(run.response) as AdviserResponse : null;
  const active = !!run && !stale && ["complete", "fallback"].includes(run.status) && !!response;
  return { input, context, run, response, stale, active, configured: !!process.env.OLLAMA_BASE_URL,
    expired: !!run && run.status === "pending" && run.startedAt + ADVISER_LEASE_MS < Date.now(),
    personalised: active ? preferredPlan(input, run!.targetUnits, response!) : null };
}

export function dismissAdvice(student: Student) {
  db.transaction(tx => {
    const run = lastAdviserRun(student.id);
    if (!run || run.status === "dismissed") return;
    if (run.status === "pending" && run.startedAt + ADVISER_LEASE_MS >= Date.now()) throw new UserError("Please wait for the current adviser request to finish.");
    tx.update(adviserRuns).set({ status: "dismissed" }).where(eq(adviserRuns.id, run.id)).run();
    tx.insert(studyPlanEvents).values({ studentId: student.id, detail: `Returned to standard course suggestions. Adviser request ${run.id} retained in history.` }).run();
  });
}

export async function requestAdvice(student: Student, preferences: string, targetUnits: number) {
  preferences = preferences.trim();
  if (preferences.length < 3 || preferences.length > 1000) throw new UserError("Describe your study interests in 3–1,000 characters.");
  if (!UNIT_TARGETS.includes(targetUnits)) throw new UserError("Choose a preferred unit limit from the list.");
  const input = planningInputOf(student), context = adviserContext(input);
  if (!context.baseline.supported) throw new UserError("This adviser needs the supported Computing (Advanced) study plan and reviewed sources.");
  const run = db.transaction(tx => {
    const previous = lastAdviserRun(student.id);
    if (previous?.status === "pending" && previous.startedAt + ADVISER_LEASE_MS >= Date.now()) throw new UserError("Your adviser is still working. Please wait a moment and reload your profile.");
    if (previous?.status === "pending") {
      tx.update(adviserRuns).set({ status: "fallback", response: JSON.stringify({ matches: [], reason: "unavailable" }) }).where(eq(adviserRuns.id, previous.id)).run();
      tx.insert(studyPlanEvents).values({ studentId: student.id, detail: `Course adviser request ${previous.id} was interrupted. Rule-based suggestions remain available.` }).run();
    }
    // Repeated successful submissions reuse their persisted response; failure can retry.
    if (previous?.status === "complete" && previous.contextHash === context.contextHash && previous.preferences === preferences && previous.targetUnits === targetUnits) return previous;
    const busy = tx.select({ id: adviserRuns.id }).from(adviserRuns).where(and(eq(adviserRuns.status, "pending"), gt(adviserRuns.startedAt, Date.now() - ADVISER_LEASE_MS))).all();
    if (busy.length >= 2) throw new UserError("The course adviser is helping other students. Please try again shortly; standard suggestions remain available.");
    throttle(`adviser:${student.id}`, 12);
    const row = tx.insert(adviserRuns).values({ studentId: student.id, preferences, targetUnits, contextHash: context.contextHash,
      snapshot: JSON.stringify({ version: ADVISER_VERSION, year: input.year, term: input.term, limit: input.limit, pool: context.pool, omittedCount: context.omittedCount,
        results: input.results, confirmed: input.confirmed, savedCodes: input.savedCodes }), status: "pending", startedAt: Date.now() }).returning().get();
    tx.insert(studyPlanEvents).values({ studentId: student.id, detail: `Asked the course adviser for ${input.year} ${input.term}, preferring up to ${targetUnits} units. Request ${row.id}.` }).run();
    return row;
  }, { behavior: "immediate" });
  if (run.status !== "pending") return;
  const answer = await askOllama(preferences, context.pool);
  const fallback = ["invalid", "unavailable", "not-configured"].includes(answer.response.reason);
  db.transaction(tx => {
    const updated = tx.update(adviserRuns).set({ status: fallback ? "fallback" : "complete", response: JSON.stringify(answer.response),
      model: answer.model, modelDigest: answer.digest, elapsedMs: answer.elapsedMs }).where(and(eq(adviserRuns.id, run.id), eq(adviserRuns.status, "pending"))).run();
    if (updated.changes) tx.insert(studyPlanEvents).values({ studentId: student.id, detail: `Course adviser request ${run.id} finished: ${!answer.model ? "no model called; rule-based suggestions" : fallback ? "rule-based fallback" : "interest matching checked"}. Suggestions still require current rule and load checks; no enrolment changed.` }).run();
  });
}
