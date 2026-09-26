# Drop, swap and enrolment presentation

This increment implements John's request to add drop and swap, make confirmed
enrolments and completed demo scenarios prominent, and use his supplied ANU logo.
It does not reproduce ANU's formal withdrawal policy, deadlines, fees or penalties.
The source of the product direction is John's experience, not a verified claim
that ANU's current system has no drop function.

## Course changes

Confirmed enrolment cards in My courses and My profile offer Swap and Drop. Both
open a review page before a POST changes state. A drop ends that enrolment,
releases its load and removes its saved selection. Completed transcript results,
permission decisions and audit history are retained. The student can deliberately
re-enrol using the ordinary eligibility, offering and load checks.

Swap selects an offering in the same year/session. The preview checks the
replacement against the record after removing the outgoing course, including
required permission and the resulting unit load. The final POST repeats the
checks within an immediate transaction. Ending the old enrolment and confirming
the replacement are one transaction; any failure leaves the old enrolment intact.
A swap into more units may still require overload approval. Missing/invalid
variable credit values are not treated as zero.

Removing a course cannot silently break an already-satisfied concurrent
requirement of a kept course. The replacement also cannot introduce a published
concurrent incompatibility on a kept course. The student is directed to change the dependent
course first. Formal prerequisite waivers and changes to a whole group of
dependent courses are outside this increment.

An enrolment row has an ended timestamp/reason and a revision. Active reads for
eligibility, load and permission status exclude ended rows. Changes write
enrolment events; relevant course-permission and linked overload timelines retain
drop/swap events without rewriting the original assessment or approval.
Revision checks reject old drop/swap forms after another change or re-enrolment.
Seed enrolments are inserted only when absent, so a dropped seed course does not
reappear on restart. Existing rows migrate as active with revision 1; no past
events are fabricated. Generated migration: `0008_lethal_nextwave.sql`.

## Presentation and logo

Confirmed courses appear before saved candidates or transcript tables, with unit
values, counts and visible actions. Overview links lead to the distinct confirmed,
demo and saved/results sections. The demo section remains visible when empty and
explicitly uses zero academic load units. Completed scenarios remain isolated
from the transcript and the course-management actions.

`public/anu-primary-gold-white.svg` is a vector conversion of John's
`assets/ANU_Primary_Vertical_GoldWhite.eps`. The supplied artwork was converted
with TeX Live `epstopdf`, then Poppler `pdftocairo -svg`; it was not regenerated
or redrawn. The SVG is committed so browser rendering does not require raw EPS
support or the untracked asset directory. The header retains the visible
independent student-prototype label alongside the supplied gold/white artwork.

The next-stage generated profile and course-suggestion direction is recorded in
`profile-suggestions-next-stage.md`. Profile generation and the default planning
semester are unchanged by this increment.
