import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";

const base = inject("baseUrl"), cookie = inject("fixtureCookies")["Course overview student"];
async function page(path: string) {
  const response = await fetch(new URL(path, base), { headers: { cookie } });
  expect(response.status).toBe(200);
  return new JSDOM(await response.text()).window.document;
}
async function post(path: string, fields: Record<string, string>) {
  const response = await fetch(new URL(path, base), { method: "POST", headers: { cookie, origin: base }, body: new URLSearchParams(fields), redirect: "manual" });
  expect(response.status).toBe(303);
  expect(new URL(response.headers.get("location")!, base).searchParams.has("error")).toBe(false);
}

it("keeps saved candidates separate from confirmed enrolments, scoped to the offering and independent of the saved list", async () => {
  // Two semesters of the same course make offering scope observable.
  const first = (await page("/courses/COMP7710/?year=2027&term=S1"))
    .querySelector<HTMLInputElement>('input[name="offeringId"]')!.value;
  const second = (await page("/courses/COMP7710/?year=2027&term=S2"))
    .querySelector<HTMLInputElement>('input[name="offeringId"]')!.value;
  for (const offeringId of [first, second]) await post("/api/selections", { action: "add", offeringId });
  const saved = await page("/plan/");
  expect(saved.querySelector("h1")?.textContent).toBe("My courses");
  expect(saved.querySelectorAll("[data-saved-courses] .plan-row")).toHaveLength(2);
  expect(saved.querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("COMP7710");
  await post("/api/enrol", { courseCode: "COMP7710", year: "2027", term: "S1" });
  const confirmed = await page("/plan/");
  expect(confirmed.querySelectorAll("[data-saved-courses] .plan-row")).toHaveLength(1);
  expect(confirmed.querySelector("[data-saved-courses] .meta")?.textContent).toContain("Second Semester");
  expect(confirmed.querySelectorAll("[data-confirmed-enrolments] li")).toHaveLength(1);
  await post("/api/selections", { action: "remove", offeringId: first });
  await post("/api/selections", { action: "remove", offeringId: second });
  const reloaded = await page("/plan/");
  expect(reloaded.querySelectorAll("[data-saved-courses] .plan-row")).toHaveLength(0);
  const expected = "/courses/COMP7710/?year=2027&term=S1";
  for (const route of ["/plan/", "/record/"]) {
    const doc = await page(route);
    expect(doc.querySelector("[data-confirmed-enrolments] a")?.getAttribute("href")).toBe(expected);
    expect(doc.querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("Second Semester");
  }
});
