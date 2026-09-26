import Database from "better-sqlite3";
import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";
const base = inject("baseUrl"), cookies = inject("fixtureCookies"), cookie = cookies["Adviser student"];
async function page(session = cookie) {
  const r = await fetch(new URL("/record/", base), { headers: { cookie: session } });
  expect(r.status).toBe(200); return new JSDOM(await r.text()).window.document;
}
const post = (values: Record<string, string>, session = cookie, origin = base, path = "/api/adviser") => fetch(new URL(path, base), {
  method: "POST", headers: { cookie: session, origin }, body: new URLSearchParams(values), redirect: "manual",
});
function state() {
  const db = new Database(inject("testDatabase"), { readonly: true });
  try {
    const student = db.prepare("SELECT id FROM students WHERE uid = 'fixture-adviser'").get() as { id: number };
    return { runs: db.prepare("SELECT * FROM adviser_runs WHERE student_id = ? ORDER BY id").all(student.id) as { status: string; preferences: string; model_digest: string; snapshot: string; response: string }[],
      results: db.prepare("SELECT * FROM transcript WHERE student_id = ?").all(student.id),
      enrolments: db.prepare("SELECT * FROM enrolments WHERE student_id = ?").all(student.id),
      events: db.prepare("SELECT * FROM study_plan_events WHERE student_id = ?").all(student.id) };
  } finally { db.close(); }
}

it("persists checked advice through reload, reuses retries, isolates identity and invalidates stale advice", async () => {
  const before = state(); await page(); expect(state()).toEqual(before);
  const form = { preferences: "I enjoy looking at pictures <script>alert(1)</script>", targetUnits: "6", studentId: "1", mark: "100", approvedLimit: "36" };
  const response = await post(form); expect(response.status).toBe(303); expect(response.headers.get("location")).toBe("/record/#adviser-heading");
  let doc = await page();
  expect(doc.querySelector("[data-adviser-reply]")?.textContent).toContain("matched to course evidence");
  expect(doc.querySelectorAll("[data-suggestion-options] > li")).toHaveLength(1);
  expect(doc.querySelector("[data-interest-match]")?.textContent).toContain("Computer Vision");
  expect(doc.querySelector("[data-course-adviser] script")).toBeNull();
  expect(doc.querySelector<HTMLTextAreaElement>("#adviser-preferences")?.value).toBe(form.preferences);
  const after = state(); expect(after.runs).toHaveLength(1); expect(after.runs[0].model_digest).toBe("a".repeat(64));
  expect(after.results).toEqual(before.results); expect(after.enrolments).toEqual(before.enrolments); expect(after.events).toHaveLength(2);
  await post(form); expect(state()).toEqual(after);
  expect((await page(cookies["Planning legacy student"])).querySelector("[data-adviser-reply]")).toBeNull();
  const offeringId = doc.querySelector<HTMLInputElement>('[data-suggestion-options] input[name="offeringId"]')!.value;
  await post({ action: "add", offeringId }, cookie, base, "/api/selections");
  doc = await page(); expect(doc.querySelector("[data-adviser-reply]")?.textContent).toContain("has changed");
  expect(doc.querySelector("[data-interest-match]")).toBeNull(); expect(state().runs).toEqual(after.runs);
  await post({ action: "remove", offeringId }, cookie, base, "/api/selections");
  await post({ action: "dismiss" }); expect((await page()).querySelector("[data-adviser-reply]")).toBeNull();
  expect(state().results).toEqual(before.results); expect(state().enrolments).toEqual(before.enrolments);
});

it("persists failures and retries, serialises duplicate in-flight requests, and applies the unit preference on fallback", async () => {
  const before = state();
  for (const preferences of ["I enjoy looking at pictures malformed", "I enjoy looking at pictures outage"]) {
    expect((await post({ preferences, targetUnits: "6" })).status).toBe(303);
    const doc = await page(), reply = doc.querySelector("[data-adviser-reply]")?.textContent ?? "";
    expect(reply).toContain("Rule-based suggestions remain available");
    expect(doc.querySelector("[data-interest-match]")).toBeNull();
    expect(doc.querySelectorAll("[data-suggestion-options] > li")).toHaveLength(1);
    expect(state().runs.at(-1)?.status).toBe("fallback");
  }
  // A named topic is matched without the model, even while the model is down, and says so.
  expect((await post({ preferences: "computer vision outage", targetUnits: "6" })).status).toBe(303);
  const named = await page();
  expect(named.querySelector("[data-adviser-reply]")?.textContent).toContain("by keyword");
  expect(named.querySelector("[data-interest-match]")?.textContent).toContain("Computer vision");
  expect(state().runs.at(-1)).toMatchObject({ status: "complete", model_digest: null });
  const request = { preferences: "I enjoy looking at pictures delayed", targetUnits: "6" };
  const replies = await Promise.all([post(request), post(request)]);
  expect(replies.filter(r => r.headers.get("location")?.includes("error="))).toHaveLength(1);
  expect(state().runs).toHaveLength(before.runs.length + 4);
  expect((await page()).querySelector("[data-interest-match]")).not.toBeNull();
  expect(state().results).toEqual(before.results); expect(state().enrolments).toEqual(before.enrolments);
});

it("rejects unauthenticated, reviewer, cross-site and invalid requests without model work", async () => {
  const before = state(), values = { preferences: "computer vision", targetUnits: "18" };
  expect((await post(values, "")).status).toBe(401);
  expect((await post(values, cookies["Dr Hana Okafor"])).status).toBe(403);
  expect((await post(values, cookie, "https://unrelated.example")).status).toBe(403);
  expect((await post({ ...values, preferences: "x" })).headers.get("location")).toContain("error=");
  expect((await post({ ...values, preferences: "x".repeat(1001) })).headers.get("location")).toContain("error=");
  expect((await post({ ...values, targetUnits: "999" })).headers.get("location")).toContain("error=");
  expect(state()).toEqual(before);
});
