# Review of the supplied MCOMP download

Reviewed 25 September 2026. This records the source review before import; it is
not an enforced degree rule set. The subsequent evidence library is described
in `docs/catalogue-data.md`. No linked website pages were fetched and no source
scripts were executed.

## Source and extraction

- File: `assets/Degrees/MCOMP/Master of Computing - ANU.html` (moved by the user
  from `assets/MCOMP/`; checksum unchanged)
- Saved source URL: `https://programsandcourses.anu.edu.au/program/7706xmcomp`
- Program: Master of Computing (MCOMP), **2027**. The HTML metadata and visible
  year selector both identify 2027, despite the unversioned saved URL.
- SHA-256: `03dd8cf8a0a8def1837e570fa43706633bf9eb6827b2b3817b981604b078abe1`
- Study content is present inside `#study`, including the requirements,
  capstone links, specialisation links and study-options table. CSS hides the
  inactive tab; its content can still be extracted offline.
- An offline JSDOM parse, with networking disabled, confirmed eight distinct
  course codes in the Study section and six linked specialisations. Three
  course links also occur as unversioned URLs in the sample study table.
- Detailed extraction evidence: `.data/MCOMP-2027-source.json` (local artifact).

The source links are useful provenance. They do not include the contents of
their destinations. Each needed course/specialisation page needs its own saved
file. No link rewriting is needed to extract the data. A future import can map
saved course codes to this app's internal pages while retaining the source URLs.

## Requirements visible in this snapshot

| Requirement | Recorded wording/meaning |
| --- | --- |
| Overall degree | 96 units |
| Advanced COMP study | At least 24 units of 8000-level COMP courses, within the overall total |
| Compulsory courses | 30 units: COMP6120 (6), COMP6442 (6), COMP7710 (12), COMP8280 (6) |
| Foundations | At least 6 units from MATH6005 and COMP6260 |
| Project courses | At most 12 units from COMP8715 and COMP8830; COMP8715 must be completed twice in consecutive semesters, 6 + 6 units; COMP8830 is listed as 12 units |
| Specialisation | 24 units from one listed specialisation |
| Further subject study | 18 units of further 6000/7000/8000-level COMP or ENGN courses |
| University elective | 6 units of ANU electives |

These are constraints rather than independent totals to add blindly. The
8000-level minimum is an additional check over the same completed courses, not
an extra 24 units beyond 96. Preserve "minimum" and "maximum" distinctions;
in particular, do not silently turn the project maximum into an exact requirement.
Cross-counting between requirement groups still needs the applicable source rules.

The additional advice on the saved page says degree and specialisation
requirements follow the student's commencement year. It also distinguishes
credit from exemption, with separate limits on credited courses contributing
to specialisation and 8000-level requirements. These must not be reduced to one
generic "prerequisite satisfied" flag in a future planner.

## Conflicts to retain for review

1. **Version and program:** this is MCOMP 2027, while the current app catalogue
   models 2026 and generated profiles use Computing (Advanced), VCOMP. Do not
   apply these requirements to those profiles or overwrite the existing catalogue.
   Model degree-rule year separately from course/offering year: a continuing
   student can follow earlier degree rules while enrolling in later offerings.
2. **Specialisation list:** the requirements text names Machine Learning and
   Human Centred and Creative Computing, but neither has a link in the separate
   Specialisations list. That list instead contains Professional Computing,
   which is absent from the requirements list. The Machine Learning page must
   be supplied separately; no destination or replacement should be guessed.
3. **Study table:** the sample table omits compulsory COMP6120 and shows two
   6-unit University Elective slots, while the requirements specify one 6-unit
   elective allocation. Treat it as a conflicting example, not an executable
   schedule that resolves the requirements.
4. **Course titles and units:** COMP7710 is called Structured Programming in
   the requirements but Programming Fundamentals in the sample table. The
   project table shows two 6-unit COMP8715/8830 slots, while the requirements
   describe COMP8830 as 12 units. Check saved course pages before resolving titles
   or turning the example into a schedule.
5. **Missing local course:** MATH6005 appears here but is absent from the current
   2026 catalogue. Do not substitute MATH6111 or another maths course by similarity.

## Next source collection

The user can keep saving HTML pages; screenshots are a fallback for content not
present in HTML. Keep the displayed academic year, original URL and all rule
footnotes. For this file, the `.html` contains the needed text; its auxiliary
images/scripts folder is not needed for extraction. Check one saved course page
before collecting a large batch, since other pages may render content differently.

John selected **Computing (Advanced), VCOMP, 2026 commencement-year rules** for
the first planning example. This MCOMP 2027 page remains separate evidence.
Next save the 2026 Computing (Advanced) degree page and its Machine Learning
specialisation page, followed by COMP6670 and the advanced courses actually
named there. Expand to compulsory and elective courses after that example is
coherent. Course offerings should be saved for the years being planned, which
need not equal the degree's commencement year.

For this **2027 MCOMP snapshot only**, the eight directly linked course pages
are COMP6120, COMP6442, COMP7710, COMP8280, MATH6005, COMP6260, COMP8715 and COMP8830.
All eight have an explicit `/2027/course/` link in the requirements. Their
requirements and offerings are not contained in this program-page download.

## Subsequent uploads

John supplied three degree pages and seven specialisation pages, all carrying
2027 metadata, and reports that his earlier Machine Learning courses now appear
in Artificial Intelligence. The new AI snapshot confirms that COMP6670,
COMP8600 and COMP8650 are included. See `docs/uploaded-sources-2027.md` for the
inventory, exact AI course groups and a deduplicated course-download checklist.
The old ML requirements and any cohort-transition policy are not established
by those 2027 pages, so the earlier version boundary remains in place.
