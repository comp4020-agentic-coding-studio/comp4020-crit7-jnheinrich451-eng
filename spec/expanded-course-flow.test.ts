import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";
const base=inject("baseUrl"), cookies=inject("fixtureCookies"), student="Course rule coverage student";
async function page(path: string, who=student) {
  const response=await fetch(new URL(path,base),{headers:{cookie:cookies[who]}});
  expect(response.status).toBe(200);
  return new JSDOM(await response.text()).window.document;
}
async function post(path: string, fields: Record<string,string>, who=student) {
  const response=await fetch(new URL(path,base),{method:"POST",headers:{cookie:cookies[who],origin:base},body:new URLSearchParams(fields),redirect:"manual"});
  expect(response.status).toBe(303);
  return response.headers.get("location")!;
}
const fields=(courseCode: string,term="S1")=>({courseCode,year:"2027",term});

it("checks a newly encoded prerequisite and corequisite through requests, enrolment and reload",async()=>{
  const first=await page("/courses/COMP6120/?year=2027&term=S2");
  expect(first.querySelector("#gate-heading")?.textContent).toBe("Permission code needed");
  expect(first.querySelector('[data-rule-coverage="encoded"]')).toBeTruthy();
  const deniedPath=await post("/api/applications",{...fields("COMP6120","S2"),statement:"Use my current record."});
  const denied=await page(deniedPath);
  expect(denied.querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
  const saved=denied.querySelector("[data-assessment-policy]")?.textContent;
  expect(saved).toContain("COMP6442");
  expect(denied.querySelector("[data-assessment-policy]")?.getAttribute("data-assessment-policy")).toBe("demo-permission-v2");
  expect(new URL(await post("/api/enrol",fields("COMP6442")),base).searchParams.has("error")).toBe(false);
  expect((await page("/courses/COMP6120/?year=2027&term=S2")).querySelector("#gate-heading")?.textContent).toBe("Permission code needed");
  expect(new URL(await post("/api/enrol",fields("COMP6442","S2")),base).searchParams.has("error")).toBe(false);
  const eligible=await page("/courses/COMP6120/?year=2027&term=S2");
  expect(eligible.querySelector("#gate-heading")?.textContent).toBe("You can enrol directly");
  expect(eligible.querySelector('[data-check-status="met"]')?.textContent).toContain("currently enrolled");
  expect(new URL(await post("/api/enrol",fields("COMP6120","S2")),base).searchParams.has("error")).toBe(false);
  expect((await page("/record/")).querySelector("[data-confirmed-enrolments]")?.textContent).toContain("COMP6120");
  // Later enrolment must not turn a historical denial into an approval or erase its evidence.
  const old=await page(deniedPath);
  expect(old.querySelector("#status-heading")?.textContent).toBe("Not approved under the demo policy");
  expect(old.querySelector("[data-assessment-policy]")?.textContent).toBe(saved);
});

it("completes an ordinary profile permission path beyond COMP8620, with offering scope and explicit confirmation",async()=>{
  const course=await page("/courses/COMP8820/?year=2027&term=S1");
  expect(course.querySelector("#gate-heading")?.textContent).toBe("Permission code required for all students");
  const values={...fields("COMP8820"),statement:"Please assess the published permission requirement."};
  const path=await post("/api/applications",values);
  const approved=await page(path);
  expect(approved.querySelector("#status-heading")?.textContent).toBe("Demo permission approved");
  expect(approved.querySelector(".code-issued")?.textContent).toContain("DEMO-COMP8820-");
  expect(approved.querySelector("[data-scenario]")).toBeNull();
  expect((await page("/record/")).querySelector("[data-confirmed-enrolments]")?.textContent).not.toContain("COMP8820");
  expect(await post("/api/applications",values)).toBe(path);
  for(const [who,term] of [[student,"S2"],["Other demo student","S1"]]){
    expect(new URL(await post("/api/enrol",fields("COMP8820",term),who),base).searchParams.has("error")).toBe(true);
  }
  // A permission code does not select a credit value for this 6–24-unit course.
  expect(new URL(await post("/api/enrol",fields("COMP8820")),base).searchParams.has("error")).toBe(true);
  expect(new URL(await post("/api/enrol",{...fields("COMP8820"),units:"25"}),base).searchParams.has("error")).toBe(true);
  expect(new URL(await post("/api/enrol",{...fields("COMP8820"),units:"6"}),base).searchParams.has("error")).toBe(false);
  for(const route of ["/plan/","/record/"])expect((await page(route)).querySelector("[data-confirmed-enrolments]")?.textContent).toContain("COMP8820");
  expect((await page(path)).querySelector("#status-heading")?.textContent).toBe("Enrolled");
  expect((await page("/applications/")).querySelector(`a.request-card[href="${path}"] .badge`)?.textContent).toBe("Enrolled");
  // The encoded conditional rules do not invent an offering for COMP8712.
  const unavailable=await page("/courses/COMP8712/?year=2027");
  expect(unavailable.querySelector('form[action="/api/applications"]')).toBeNull();
  expect(new URL(await post("/api/applications",{...fields("COMP8712"),statement:"Please assess this offering."}),base).searchParams.has("error")).toBe(true);
});
