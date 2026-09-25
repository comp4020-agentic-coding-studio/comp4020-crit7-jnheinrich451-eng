# Course upload audit — 25 September 2026

This records the offline audit of user-supplied files before import.
Updated after the user's `Courses/Remained` upload; counts describe this snapshot.
No files were renamed, moved or deleted, and no linked pages were fetched.
The subsequent persistent library is documented in `docs/catalogue-data.md`.

## Received

- 95 saved course HTML files with readable course identity metadata.
- 76 distinct course-code/year pairs, all for 2027.
- 19 copies beyond the first copy of each course/year, across 18 repeated groups.
- All copies in each repeated group agree on the compared name, description,
  requisites, learning outcomes and offering text. Raw HTML hashes may differ
  because saved page chrome and browser state differ.
- Every saved course has an offering heading. ENGN9820 has no learning-outcome
  heading. MGMT7020 and REGN8014 have no recorded Requisite and Incompatibility
  heading; this is not proof that enrolment is unrestricted.
- Of the 66 distinct 2027 links in the supplied degree/specialisation snapshots,
  61 have a matching saved course and five do not yet appear in this audit.

Local extraction evidence: `.data/course-source-audit.json`. The audit script
is `.data/audit-course-sources.cjs`, run in Node 24 with JSDOM and networking
disabled. It records each source file, original URL, code, year, text fields,
content fingerprint and original-file SHA-256 without executing page scripts.
The earlier 64-file audit is preserved in
`.data/course-source-audit-2026-09-25-2244.json`. Some saved-file headers contain
`about:internet` rather than a source URL; the new extraction retains that raw
value and uses the HTML's canonical link as separately labelled provenance.

## Preserve relationships while deduplicating course identity

John intentionally kept copies under different specialisations to express their
relationships. Retain those source paths. A future import should use one course
version per code/year, referenced by multiple versioned specialisation rules.
For example, COMP6670 2027 is supplied under both Artificial Intelligence and
Data Science; COMP8712 2027 appears under three specialisations.

The enclosing folder is collection context, not the final eligibility rule.
Use the saved specialisation page's exact link and surrounding rule group to
establish each relationship. Preserve compulsory, choice-group, minimum/maximum
units, substitutions and exclusions as different meanings. A course listed as
an exclusion must not become an allowed elective. Sharing one course between
specialisations does not itself permit counting its credit twice.

Use course metadata and source URL rather than a filename or folder title as
identity. The file under AI's `8000/Advanced Topics in Machine Learning/` is
actually COMP8620, Advanced Topics in Artificial intelligence. A correct
COMP8650 snapshot is already present under Data Science, and ARTIF-SPEC links
to COMP8650, so no additional download is needed to represent that relationship.

Future data import should retain all source-copy references for traceability.
If the same code/year later has conflicting rule text, flag the conflict rather
than choosing whichever file happens to be scanned last.

## Requirements that need more than a static prerequisite check

The supplied COMP8650 page allows COMP6670 or COMP8600, then says additional
prerequisites depend on the announced topic and points to separate instructions
for requesting permission. COMP8620 also refers to topic-specific prerequisites
and explicitly requires a permission code. A parser must preserve those clauses;
passing the recorded base prerequisite is not proof that every requirement has
been captured or that an exception should be approved.

The offering sections contain both 2027 and 2028 and label future offerings
indicative. Parse each year separately; page metadata alone is not the year of
every offering on the page. Do not turn an indicative future offering into a
guaranteed slot. These snapshots remain separate from the existing 2026 app
catalogue and the previously selected 2026 commencement-rule example.

## Remaining links at this audit

The updated checkboxes in `docs/uploaded-sources-2027.md` indicate receipt by
code/year, not approval of the interpretation. One usable saved copy is enough;
future duplicates are optional because the specialisation links preserve the
relationships.

COMP6442, COMP6490, COMP8405, ENGN6627, MATH6005.

This list is the remaining linked source collection, not an assertion that all
five courses are compulsory or necessary before further implementation work.

## Shared titles and missing semesters

All four downloaded pages below have 2027 metadata. A shared title does not
establish a historical renumbering, replacement or transferable credit rule.

| Course | Recorded requirement distinction | Availability in the saved page |
| --- | --- | --- |
| COMP6434 Data Wrangling | A programming-course requirement AND a database-course requirement; incompatible with COMP3430 and COMP8930 | Second Semester 2027 listed; a separate indicative 2028 S2 listing also appears |
| COMP8430 Data Wrangling | Different programming/database alternatives, incompatible with COMP3430, and a permission code for intensive mode | Explicitly says there are no current offerings |
| COMP8880 Computational Methods for Network Science | Completed COMP6670; incompatible with COMP4880 | Explicitly says there are no current offerings |
| COMP8980 Computational Methods for Network Science | Different prerequisite expression containing COMP6670, programming alternatives, COMP8410, STAT6039 and MADAN; incompatible with COMP4880 **and COMP8880** | Explicitly says there are no current offerings |

The COMP8980 AND/OR expression should be retained verbatim pending interpretation;
do not decide that its MADAN clause applies to every branch without grounding.
The explicit incompatibility with COMP8880 is evidence that the entries are
related, not authority to merge their identities or treat either as a replacement.
Similarly, COMP6434 lists COMP8930 as incompatible, not COMP8430; do not correct
that code by guessing a typo or silently add a reciprocal rule.

Distinguish these source states during import and in the UI:

- **Published offering:** retain its year, session and class identifier, plus
  whether the source calls it indicative.
- **Explicit no-current-offerings statement:** preserve that wording and snapshot
  year. Keep the course discoverable, but do not offer enrolment without an
  actual offering. This does not prove permanent discontinuation.
- **No captured availability information:** label availability unknown. A blank
  search-result cell alone does not establish the explicit no-offerings state.

Fourteen distinct course pages in this batch explicitly say no current offerings:
COMP6250, COMP6470, COMP6540, COMP6720, COMP6780, COMP8260, COMP8430, COMP8460,
COMP8500, COMP8536, COMP8691, COMP8712, COMP8880 and COMP8980. Specialisations may
still reference them. Do not infer a semester, remove their degree relationships
or automatically substitute another same-title code.

The later library import preserves these findings in separate catalogue tables.
The running app's 2026 enrolment catalogue has not been replaced by this collection.
