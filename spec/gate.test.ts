import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

// The app's promises, driven over HTTP against the built server with a fresh
// seeded database (spec/global-setup.ts). Each test acts as a seeded person
// by sending the same "act as" cookie the picker sets, and reads pages the
// way a person would: as text, after a fresh request.
const baseUrl = inject("baseUrl");

type Page = { status: number; text: string; location: string | null };

async function get(path: string, as: string): Promise<Page> {
  const res = await fetch(new URL(path, baseUrl), { headers: { cookie: as }, redirect: "manual" });
  const html = await res.text();
  // <main> only: the header's "act as" picker names every seeded person on
  // every page, which would make any "not in this queue" check meaningless
  const text = new JSDOM(html).window.document.querySelector("main")?.textContent?.replace(/\s+/g, " ") ?? "";
  return { status: res.status, text, location: res.headers.get("location") };
}

// Astro refuses form POSTs without a same-origin Origin header (CSRF); a
// browser sends it, a bare fetch has to be told.
async function post(path: string, as: string, fields: Record<string, string>): Promise<Page> {
  const res = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, cookie: as },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });
  return { status: res.status, text: await res.text(), location: res.headers.get("location") };
}

/** The message a form handler's 303 carries back (?error= or ?ok=). */
const message = (res: Page): string => {
  const params = new URL(res.location ?? "/", baseUrl).searchParams;
  return params.get("error") ?? params.get("ok") ?? "";
};

// These are genuine server-side sessions created only in the throwaway test DB.
const cookies = inject("fixtureCookies");
const as = (name: string): string => cookies[name];

describe("identity boundaries", () => {
  it("the old act-as endpoint no longer grants identities", async () => {
    const res = await post("/api/act-as", as("Mei Lin"), { as: "c:1" });
    expect(res.status).toBe(404);
  });
  it("a forged old cookie cannot access a profile", async () => {
    const page = await get("/record/", "as=s:1");
    expect(page.status).toBe(303);
    expect(page.location).toBe("/login/");
  });
});
describe("the gate shows three outcomes, each with its own message", () => {
  const HEADINGS = [
    "You can enrol directly",
    "Permission code needed",
    "Permission code required for all students",
  ];
  const onlyHeading = (text: string, expected: string) => {
    for (const h of HEADINGS) expect(text.includes(h), h).toBe(h === expected);
  };

  it("eligible: a Master of Computing student can enrol in COMP6466 directly", async () => {
    const page = await get("/courses/COMP6466/", as("Tom Okoye"));
    onlyHeading(page.text, "You can enrol directly");
  });

  it("rules not met: COMP6242 says a code is needed and names what's missing", async () => {
    const page = await get("/courses/COMP6242/", as("Tom Okoye"));
    onlyHeading(page.text, "Permission code needed");
    expect(page.text).toContain("one of COMP3670, COMP6670 or COMP8410");
  });

  it("required for all: COMP8620 is about the course, not a failed requisite", async () => {
    const page = await get("/courses/COMP8620/", as("Mei Lin"));
    onlyHeading(page.text, "Permission code required for all students");
    expect(page.text).toContain("recorded base prerequisites are met");
  });

  it("courses without transcribed rules say so instead of guessing", async () => {
    const page = await get("/courses/COMP6120/", as("Mei Lin"));
    expect(page.text).toContain("Automatic eligibility check unavailable");
    for (const h of HEADINGS) expect(page.text).not.toContain(h);
  });

  it("the catalogue badges each course for the student", async () => {
    const page = await get("/?term=", as("Tom Okoye"));
    for (const badge of [
      "Ready to enrol",
      "Permission needed",
      "Permission for everyone",
      "Eligibility check unavailable",
    ]) {
      expect(page.text).toContain(badge);
    }
  });
});

describe("a request reaches the picked course's convenor and survives a reload", () => {
  let path: string;

  beforeAll(async () => {
    const res = await post("/api/applications", as("Mei Lin"), {
      courseCode: "COMP8620",
      term: "S2",
      statement: "I passed COMP6320 with a HD and want this semester's topic.",
    });
    expect(res.status).toBe(303);
    path = res.location ?? "";
    expect(path).toMatch(/^\/applications\/\d+\/$/);
  });

  it("the student sees where it went, on a fresh load", async () => {
    const page = await get(path, as("Mei Lin"));
    expect(page.text).toContain("With Dr Rowan Ellis");
    expect(page.text).toContain("Sent to Dr Rowan Ellis, convenor of COMP8620");
  });

  it("it is in COMP8620's convenor's queue", async () => {
    const queue = await get("/applications/", as("Dr Rowan Ellis"));
    expect(queue.text).toContain("Mei Lin");
  });

  it("and in no other convenor's queue", async () => {
    for (const name of [
      "Dr Mara Quinn",
      "Dr Tomas Weller",
      "Dr Hana Okafor",
      "Dr Leo Brandt",
      "Dr Sam Achterberg",
    ]) {
      const queue = await get("/applications/", as(name));
      expect(queue.text, name).not.toContain("Mei Lin");
    }
  });

  it("another convenor can't decide it", async () => {
    const res = await post(`/api${path}decision`, as("Dr Mara Quinn"), { decision: "approve", note: "" });
    expect(message(res)).toContain("Only the convenor this request was routed to");
    expect((await get(path, as("Mei Lin"))).text).toContain("With Dr Rowan Ellis");
  });

  it("the convenor approves; the student sees a code and every step", async () => {
    const res = await post(`/api${path}decision`, as("Dr Rowan Ellis"), {
      decision: "approve",
      note: "Welcome aboard.",
    });
    expect(res.status).toBe(303);
    const page = await get(path, as("Mei Lin"));
    expect(page.text).toContain("Approved");
    expect(page.text).toMatch(/COMP8620-[A-Z0-9]{6}/);
    for (const step of [
      "Requested a permission code",
      "Base prerequisites met",
      "Sent to Dr Rowan Ellis",
      "Welcome aboard.",
    ]) {
      expect(page.text).toContain(step);
    }
  });

  it("the code enrols the student", async () => {
    const res = await post("/api/enrol", as("Mei Lin"), { courseCode: "COMP8620", term: "S2" });
    expect(message(res)).toContain("with your permission code");
    expect((await get("/record/", as("Mei Lin"))).text).toContain(
      "COMP8620 Advanced Topics in Artificial intelligence",
    );
  });
});

describe("the automatic first round", () => {
  it("warns the student before they send a request it will turn down", async () => {
    const page = await get("/courses/COMP8600/", as("Kenji Sato"));
    expect(page.text).toContain("The automatic first round will turn this request down");
    expect(page.text).not.toContain("It goes to Dr Mara Quinn");
  });

  it("turns away an incompatible request before any convenor sees it", async () => {
    const res = await post("/api/applications", as("Kenji Sato"), {
      courseCode: "COMP8600",
      term: "S1",
      statement: "I've done machine learning before.",
    });
    const page = await get(res.location ?? "", as("Kenji Sato"));
    expect(page.text).toContain("Rejected automatically");
    expect(page.text).toContain("COMP4670, which is incompatible with COMP8600");
    expect((await get("/applications/", as("Dr Mara Quinn"))).text).not.toContain("Kenji Sato");
  });

  it("refuses a request for a term the course isn't offered in", async () => {
    const res = await post("/api/applications", as("Tom Okoye"), {
      courseCode: "COMP6242",
      term: "S2",
      statement: "Keen.",
    });
    expect(message(res)).toContain("isn't offered in that term");
  });
});

describe("enrolling directly", () => {
  it("an eligible student enrols without a code", async () => {
    const res = await post("/api/enrol", as("Tom Okoye"), { courseCode: "COMP6466", term: "S2" });
    expect(message(res)).toContain("Enrolled in COMP6466");
    expect((await get("/record/", as("Tom Okoye"))).text).toContain("enrolled directly");
  });

  it("a student who needs a code can't enrol without one", async () => {
    const res = await post("/api/enrol", as("Tom Okoye"), { courseCode: "COMP6242", term: "S1" });
    expect(message(res)).toContain("You need a permission code for COMP6242");
  });
});

describe("the live stream", () => {
  it("tells open pages when a request changes", async () => {
    const stream = await fetch(new URL("/api/events", baseUrl), { headers: { cookie: as("Ana Ruiz") } });
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    const res = await post("/api/applications", as("Ana Ruiz"), {
      courseCode: "COMP6466",
      term: "S2",
      statement: "I've since passed COMP6730 and COMP6240.",
    });
    const id = res.location?.match(/\d+/)?.[0];

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes(`"applicationId":${id}`)) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain("data: ");
  }, 10_000);
});
