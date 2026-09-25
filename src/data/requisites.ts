// Course rules, transcribed by hand from ANU Programs & Courses' "Requisite and
// Incompatibility" paragraph (John pasted the text; nothing here was crawled).
// `text` is ANU's wording verbatim, so the encoding beside it can be checked
// line against line. A course missing from this file has no recorded rules,
// and the gate says so rather than guessing.
//
// COMP8300's first paste was identical to COMP8600's (COMP6670/COMP3670,
// incompatible COMP4670), a copy slip; it went in only after John re-checked
// it. ANU's "COMP6310/2310" shorthand means COMP6310 or COMP2310.

/** A requirement tree. `course` means passed (or, with `orEnrolled`,
 *  currently enrolled); `program` means studying that program; `units` means
 *  at least that many passed units from courses whose code starts `prefix`. */
export interface RuleSource {
  code: string;
  year: number;
  hash: string;
  section: string;
  /** Zero-based blocks in the saved source section; empty for a missing section. */
  blocks: number[];
}

export type Requirement = (
  | { all: Requirement[] }
  | { any: Requirement[] }
  | { course: string; orEnrolled?: true }
  | { program: ProgramKey }
  | { units: number; prefix: string; label: string }
  | { unknown: string; nextAction: string }
) & { source?: RuleSource };

export type ProgramKey = "GDCOMP" | "MCOMP" | "VCOMP" | "MMLCV";

export const PROGRAMS: Record<ProgramKey, string> = {
  GDCOMP: "Graduate Diploma of Computing",
  MCOMP: "Master of Computing",
  VCOMP: "Master of Computing (Advanced)",
  MMLCV: "Master of Machine Learning and Computer Vision",
};

export interface CourseRules {
  text: string;
  source?: RuleSource;
  requires?: Requirement;
  incompatible?: string[];
  /** Every student needs a permission code, whatever their record says. */
  permissionAlways?: true;
  /** Limits of the automated check; retained in the request's review history. */
  reviewNote?: string;
}

const any = (...codes: string[]): Requirement => ({
  any: codes.map((course) => ({ course })),
});

export const REQUISITES: Record<string, CourseRules> = {
  COMP6240: {
    text: "You are not able to enrol in this course if you have successfully completed COMP2400. Incompatible with COMP7240.",
    incompatible: ["COMP2400", "COMP7240"],
  },
  COMP6242: {
    text: "To enrol in this course you must have successfully completed: (COMP3670 or COMP6670 or COMP8410) AND (COMP1110 or COMP6710 or COMP7710 or COMP1730 or COMP6730).",
    requires: {
      all: [
        any("COMP3670", "COMP6670", "COMP8410"),
        any("COMP1110", "COMP6710", "COMP7710", "COMP1730", "COMP6730"),
      ],
    },
  },
  COMP6262: {
    text: "You are not able to enrol in this course if you have previously completed PHIL2080 or COMP2620.",
    incompatible: ["PHIL2080", "COMP2620"],
  },
  COMP6320: {
    text: "To enrol in this course you must have completed (COMP6710 OR COMP7710 OR COMP1110 OR be enrolled in Master of Computing (Advanced)) AND have completed or be currently enrolled in COMP6262 OR COMP2620 Incompatible with COMP3620.",
    requires: {
      all: [
        {
          any: [
            { course: "COMP6710" },
            { course: "COMP7710" },
            { course: "COMP1110" },
            { program: "VCOMP" },
          ],
        },
        {
          any: [
            { course: "COMP6262", orEnrolled: true },
            { course: "COMP2620", orEnrolled: true },
          ],
        },
      ],
    },
    incompatible: ["COMP3620"],
  },
  COMP6361: {
    text: "To enrol in this course you must have successfully completed COMP6442 and COMP6260; or be enrolled in Master of Computing (Advanced)",
    requires: {
      any: [{ all: [{ course: "COMP6442" }, { course: "COMP6260" }] }, { program: "VCOMP" }],
    },
  },
  COMP6445: {
    text: "To enrol in this course you must be enrolled in Master of Computing (Advanced) (VCOMP) or Master of Machine Learning and Computer Vision (MMLCV). Incompatible with COMP2550 and COMP4450",
    requires: { any: [{ program: "VCOMP" }, { program: "MMLCV" }] },
    incompatible: ["COMP2550", "COMP4450"],
  },
  COMP6464: {
    text: "To enrol in this course you must: be studying Master of Computing or Master of Computing (Advanced) OR have successfully completed (COMP6710 or COMP7710 or COMP1110 or COMP1140). Incompatible with COMP3320.",
    requires: {
      any: [
        { program: "MCOMP" },
        { program: "VCOMP" },
        any("COMP6710", "COMP7710", "COMP1110", "COMP1140"),
      ],
    },
    incompatible: ["COMP3320"],
  },
  COMP6466: {
    text: "To enrol in this course you must: be studying Master of Computing or Master of Computing Advanced or have successfully completed (COMP6710 or COMP7710 or COMP1110 or COMP1140). Incompatible with COMP3600.",
    requires: {
      any: [
        { program: "MCOMP" },
        { program: "VCOMP" },
        any("COMP6710", "COMP7710", "COMP1110", "COMP1140"),
      ],
    },
    incompatible: ["COMP3600"],
  },
  COMP6528: {
    text: "To enrol in this course you must be studying one of: Graduate Diploma of Computing, Master of Computing, Master of Computing (Advanced). Master of Machine Learning and Computer Vision",
    requires: {
      any: [
        { program: "GDCOMP" },
        { program: "MCOMP" },
        { program: "VCOMP" },
        { program: "MMLCV" },
      ],
    },
  },
  COMP6540: {
    text: "To enrol in this course you must: be enrolled in Master of Computing Advanced OR have completed (COMP6710 or COMP7710 or COMP1110 or COMP1140).",
    requires: {
      any: [{ program: "VCOMP" }, any("COMP6710", "COMP7710", "COMP1110", "COMP1140")],
    },
  },
  COMP8280: {
    text: "To enrol in this course you must be enrolled in the Graduate Diploma of Computing or Master of Computing or Master of Computing (Advanced) or Master of Machine Learning and Computer Vision. Incompatible with COMP8260, ENGN8260 and ENGN8280.",
    requires: {
      any: [
        { program: "GDCOMP" },
        { program: "MCOMP" },
        { program: "VCOMP" },
        { program: "MMLCV" },
      ],
    },
    incompatible: ["COMP8260", "ENGN8260", "ENGN8280"],
  },
  COMP8300: {
    text: "To enrol in this course you must have completed: COMP6310/2310 OR COMP6330/3300 OR COMP6331/3310 OR COMP6464 OR ENGN6539 Incompatible with COMP4300.",
    requires: any("COMP6310", "COMP2310", "COMP6330", "COMP3300", "COMP6331", "COMP3310", "COMP6464", "ENGN6539"),
    incompatible: ["COMP4300"],
  },
  COMP8410: {
    text: "To enrol in this course you must have completed COMP7240 or COMP6240 or COMP2400; and COMP6730 or COMP7230 or COMP6710. Incompatible with COMP3420 and COMP3425 and COMP8400 and COMP8910.",
    requires: {
      all: [any("COMP7240", "COMP6240", "COMP2400"), any("COMP6730", "COMP7230", "COMP6710")],
    },
    incompatible: ["COMP3420", "COMP3425", "COMP8400", "COMP8910"],
  },
  COMP8535: {
    text: "To enrol in this course you must be studying: Master of Computing (Advanced) OR Master of Machine Learning and Computer Vision AND have completed 12 units of 6000-level COMP coded courses.",
    requires: {
      all: [
        { any: [{ program: "VCOMP" }, { program: "MMLCV" }] },
        { units: 12, prefix: "COMP6", label: "12 units of 6000-level COMP courses" },
      ],
    },
  },
  COMP8600: {
    text: "To enrol in this course you must have completed COMP6670 or COMP3670. Incompatible with COMP4670.",
    requires: any("COMP6670", "COMP3670"),
    incompatible: ["COMP4670"],
  },
  COMP8620: {
    text: "To enrol in this course you must have completed COMP6320 or COMP3620. Additional Prerequisite courses for the Advanced Topic will be listed on the SoCo website (Special Topics in Computing page) when the course topic is announced. Students who meet the pre-requisites can request a permission code following the instructions for Enrolling in CSS courses. Incompatible with COMP4620. You will need to contact the School of Computing to request a permission code to enrol in this course.",
    requires: any("COMP6320", "COMP3620"),
    incompatible: ["COMP4620"],
    permissionAlways: true,
  },
  COMP8691: {
    text: "To enrol in this course you must have completed COMP6320 or COMP3620. Incompatible with COMP4690.",
    requires: any("COMP6320", "COMP3620"),
    incompatible: ["COMP4690"],
  },
};
