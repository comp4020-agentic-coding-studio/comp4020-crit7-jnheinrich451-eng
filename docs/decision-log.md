# Decision log

The chronological record of John's authorised increments, moved verbatim from
the "Design direction" section of `CLAUDE.md` on 2026-09-26 (as of commit
`d3795a7`). It keeps the history, implementation status and superseded choices
behind each rule. `CLAUDE.md` holds the rules that are currently active; where
this log and `CLAUDE.md` differ, follow `CLAUDE.md` and don't revive superseded
choices recorded here.


John has authorised a substantial redesign of the interaction and layout.
Use ANU's visual style as the reference; the supplied portal screenshots and
enrolment notes explain the existing experience, not a required screen sequence.
Neither ANUHub's current workflow nor this prototype's catalogue-first layout
is fixed. Design around completing enrolment with permission handling integrated
into that task. Keep the prototype identity clear.

John accepted course search, informative course pages, saved semester selections,
integrated permission requests and explicit enrolment confirmation. Search accepts
full codes, spaced codes, numbers and titles; numeric matches must not silently
choose a subject. Keep the published scope and functional guarantees below.

For the proposed degree-planning increment, John selected Computing (Advanced)
(VCOMP), 2026 commencement-year requirements as the first example. That proposed
example is superseded by the 2027 fictional guidance increment below. Keep program/rule-year snapshots separate from offering
years; the supplied MCOMP 2027 page is not VCOMP 2026 evidence. See
`docs/MCOMP-2027-source-review.md` for the offline source review and next inputs.
The later batch of three degrees and seven specialisations is also 2027; see
`docs/uploaded-sources-2027.md`. Preserve John's reported ML-to-AI change as
versioned evidence, not an automatic conversion of existing students' rules.
John intentionally retains duplicate course downloads under specialisation
folders. Preserve the raw copies; use code/year for course identity and the
versioned specialisation rules for membership and counting. Folder names alone
are not authoritative. See `docs/course-source-audit.md` for the current audit.
Shared course titles do not establish equivalent codes or historical renumbering.
Keep code/year identities separate and preserve published incompatibilities.
Distinguish explicit no-current-offerings statements from missing availability;
neither authorises inventing a semester or assuming permanent discontinuation.

The offline source library is now implemented at `/catalogue/`. Its reproducible
dataset is `src/data/catalogue-sources.json`, imported into separate SQLite
catalogue tables at boot. See `docs/catalogue-data.md` for the model and import
workflow. Imported references mean "mentioned in this source block"; they are
not approved prerequisite, equivalence or credit-counting rules. Preserve source
variants and reviews on reseed. Do not wire unreviewed source paragraphs into
eligibility checks or convert a missing referenced page into another year.
The library overview groups Degrees, Specialisations, then Courses. Following
John's question about the year mismatch and shared Find courses entries, the
active enrolment flow now uses 2027. Both screens read the persistent catalogue;
All 80 course versions are accounted for in `src/data/enrolment-rules-2027.json`:
62 fully encoded prototype interpretations, 16 with explicit unresolved conditions
or alternative readings, and two missing-requisite source gaps (MGMT7020/REGN8014).
Each is pinned to its source hash and has an interpretation note. Coverage does
not guarantee a verdict for every record. Changed or conflicting
sources require a fresh interpretation. See `docs/catalogue-data.md`.
Historical 2026 rules, requests, approvals and enrolments retain their year;
approval never transfers across years. Existing registered profiles are preserved.
New fictional profiles place COMP6670 in 2026 S2 before the 2027 example.
The 2027 CMSY-SPEC course list names COMP8045, while its explanatory advice links
COMP8405. Preserve that unresolved source inconsistency; do not alias the codes
or change allowed-course membership on the assumption that it is a typo.

John has agreed two increments: structured eligibility with explicit
unknown results and a manually reviewed reference set; and saved assessment
reports with an automated, clearly labelled demo permission path. See
`docs/eligibility-implementation-plan.md` for dependencies and acceptance checks.
The first automated demo path is now implemented; existing pending staff requests
remain pending unless their owner explicitly requests automatic assessment. Preserve
the existing gate distinctions when adding incomplete assessments. Separate ANU
source rules from our demo approval policy, and attribute automated decisions to
a system actor. The first model trial will use Llama through a local runtime;
this supersedes the earlier Qwen candidate, not the deterministic decision engine.
Model benchmarking follows the reference set and need not block the demo flow.
Automatic issuance requires a versioned source interpretation or the explicit
fictional scenario. Historical 2026 transcriptions cannot gain automatic approval
just because their old first-round checklist passed; existing human approvals
retain their offering scope.
The first foundation increment is now implemented: three-valued requirement
results, explicit fictional-record completeness, source/evidence references and
unknown topic conditions for 2027 COMP8620. New request snapshots retain these
results; historical boolean checks remain readable. The initial manual reference
cases are in `src/data/eligibility-reference.json`; wider course examples are in
`spec/catalogue-rule-coverage.test.ts`. Conditional permission, explicit course-list
credits, distinct-course counts, program exclusions and postgraduate career are
implemented. GPA, exact marks, equivalence and discretionary evidence remain
unknown where needed; do not infer them from prose. Versioned authoring remains
future work. Automated assessment reports
now save the offering, rule and record snapshots, selected request reason, student
statement and versioned demo policy. COMP8620's complete fictional topic scenario
is at `/demo/`; its permissions and confirmation are isolated from profile
enrolments. Its topic assumptions must never become published ANU conditions.
Student messages are self-reported context, never numerically weighted authority.
The explicit record-correction, equivalent-study and exception reasons produce
evidence/decision-needed results. Prose is preserved but not semantically assessed
yet; it cannot alter a grade, source rule or permission. Future model extraction
must keep claims separate from verified facts and pass a statement-variation
benchmark before it influences handling. No model is called by the demo policy.
John clarified that permission handling must extend beyond COMP8620's blanket
permission requirement. An offered course with uninterpreted or uncertain rules
now accepts an assessment request, preserving unknown rather than claiming a
failure or granting permission. Known unmet requirements retain their exception
request route; eligible students enrol directly, and unavailable offerings cannot
accept enrolment requests. Show the resubmission reminder only while the matching
student/course/year/term request is pending. Approval or rejection removes it;
retries reuse the existing pending or approved request without adding events.
Automatic incomplete results are not pending staff work. Identical automatic
submissions reuse the saved result; new evidence or a changed reason gets a new
snapshot. Staff review remains an explicit optional route with an unstaffed-queue
notice. Converting a pending request preserves its original checks and events.
COMP7710 now has a source-bound check for both completed and currently enrolled
COMP1110/COMP1140/COMP6710. Keep these two exclusion types distinct; a course with
only a completion exclusion must not acquire a concurrent-enrolment exclusion.
Missing automatic rules are an application coverage gap, not a request for the
student to fix the gap by rewriting their explanation. Every supplied course is
now accounted for, including missing evidence; no general model reviewer is running.
The COMP8620 scenario remains isolated. Ordinary source-bound permission courses
can also complete the profile workflow when every recorded condition is met.
Request pages use the course code as their main, prominent heading.
Keep that heading in the gold Georgia serif style at its larger size.
The former My semester page is now My courses: saved candidates, confirmed
academic enrolments, and completed demo scenarios are separate sections.
Profile enrolments come from enrolment rows even when a saved selection is
removed. Scenario completions come from their persisted confirmation events and
are visible in My courses, My profile and My requests; they never enter the
academic record used by eligibility. Approval still requires explicit confirmation.
An automatic exception result says Exception decision needed, with no staff review
in progress. Its unmet academic check is separate from the unresolved waiver;
display changes must not rewrite saved reports or historical events.
Use demo-permission-v2 for new assessments with conditional permissions; saved v1
reports retain their policy and facts. A permission condition is not a failed
prerequisite or an incompatibility. Unknown intensive mode cannot be inferred from
semester/session names. Ambiguous AND/OR groups retain their plausible readings:
agreeing results can settle the group; disagreement is unknown. Repeated rows
cannot manufacture credit or distinct-course counts. Unknown project approval,
competitive selection, equivalence, GPA and mark-based suitability cannot receive
automatic permission. Offered-course checks never invent an unavailable offering.
The optional staff route accepts explicitly selected exception, equivalent-study
and record-correction requests even when recorded checks fail. Keep those checks
unchanged and save the selected reason in a student event; routing is not approval.
The reason remains selected if the student switches back to automatic assessment.
Public registration stays student-only; local reviewers activate emailed invitations.
Verification links opened during an existing session show the current identity
and require explicit sign-out before activation. Preserve the token through that
POST without accepting arbitrary return URLs. Reviewer sign-in lands on the queue;
the course catalogue itself must stay browseable. John selected real @anu.edu.au
email invitations for markers. Document that deployment needs working SMTP and
unused reviewer addresses; local captured mail does not prove remote delivery.

John requested a 24-unit enrolment limit and overload applications, with immediate
assessment plus optional human review. This is implemented at `/overload/` using
the supplied information page, versioned in `src/data/overload-policy.json`; see
`docs/overload-design.md` for the precise source interpretation and limitations.
Count confirmed units, not course count or saved candidates. The transactional
guard applies to direct and permission-code enrolment. Half-years include the
named non-standard sessions; only proven non-overlap permits the saved-page
exemption. Missing dates or units remain explicit. Variable-unit courses need a
validated credit choice, saved with enrolment; never silently assume six units.
Overload approval raises the student's year/half-year limit to 30 or 36, never
waives course conditions or confirms enrolment. Dr Avery Hart is the separate
fictional program-load reviewer; ordinary course convenors cannot decide these
requests. Requests preserve policy, load and academic snapshots with events.
Exact marks and program/institution attribution are nullable evidence fields;
never backfill existing grade-only profiles with invented numbers. Student prose
is context only. Completion exceptions and late enrolment remain discretionary;
the supplied page does not support more than 36 units or trimester rules.

John's next increment adds drop/swap and makes confirmed enrolments and completed
demo scenarios prominent in My courses and My profile. Drop/swap are implemented
as explicit, revision-checked actions with preserved history. Swap checks the
resulting load and replacement eligibility atomically; it never drops the old
course while waiting for replacement permission. Kept courses must retain any
already-satisfied concurrent requirements. Ended enrolments do not count as active
load or eligibility evidence; seed must not resurrect them. This prototype does
not implement formal withdrawal deadlines, fees or transcript penalties. See
`docs/course-changes-and-logo.md`. The supplied EPS is converted to a browser SVG;
retain the visible independent-prototype identity beside the ANU artwork.

John authorised implementation of the recorded profile/suggestion increment.
It is now implemented for VCOMP with ARTIF-SPEC: versioned fictional templates,
completed 2026 S1/S2 and 2027 S1 records, exact fictional marks and an initial
2027 S2 planning preference. The complete scenario deliberately has loads of
24/18/18 units (60 total) so its lower-level study does not consume space needed
for the degree's 48-unit advanced minimum. Historical 2026 availability remains
an explicit assumption, especially COMP6250 whose 2027 page has no offerings.
No silent COMP8280-to-COMP8260 substitution is allowed. Generated snapshots and
planning preferences persist separately from transcript facts; old accounts are
not reseeded. Existing VCOMP accounts can save an AI focus and semester using
their current record. See `docs/profile-suggestions-next-stage.md`.

Suggestions call the deterministic gate, respect confirmed and saved-candidate
load, exclude undated/future completions from dated progress, and separate ready
options, permission/evidence cases and later offering gaps. A saved candidate is
never passed credit or an enrolment. Degree buckets allocate each course once;
the 8000-level threshold is an overlay. Source hash mismatch disables planning
interpretations. 2028 options use indicative rows in 2027 sources, not invented
2028 rules or enrolment endpoints. GPA, supervisor/project approval, credit
substitutions, full degree audits and graduation remain unverified. Suggestions
do not promise on-time graduation or authorise repeated project enrolment.

John authorised the preference-aware course adviser. It accepts study interests
and an explicit unit preference in My profile, persisting exchanges separately
from academic facts. A bounded server-side Ollama call selects source passage IDs
from ready options; the app renders original excerpts and rechecks the combination
through the deterministic planner. Personal unit ceilings are separate from
institutional limits. Context changes invalidate old advice. The model cannot
approve, enrol or edit records. Missing or failed inference retains labelled
rule-based planning. Local compose uses Windows Ollama; Fly needs a separately
reachable service before live AI is available there. See `docs/course-adviser.md`
for validation, runtime limits and smoke-test scope. This does not implement
model-based prerequisite extraction or permission review.

John's Windows mini PC now supplies the local preview's adviser through private
Tailscale Serve. An optional server-only OLLAMA_HOST_HEADER supplies the upstream
hostname; native HTTPS keeps TLS verification tied to OLLAMA_BASE_URL because
Node fetch discarded the Host override. The ignored `.env.adviser-minipc` selects
this connection; compose defaults still support Windows-host Ollama. Four actual
adviser smoke cases completed inside the existing 45-second limit on CPU.
Fly still needs tailnet access before it can use this endpoint. No public Funnel
or model exposure was configured. See `docs/course-adviser.md` for timings and
the distinction between first-prompt and warm performance.

## 27 September 2026: private Fly connection; guest inbox deferred

John authorised connecting Fly to the mini PC. The implementation adds an
optional userspace Tailscale daemon to the existing app container and a proxy
used only by Ollama calls. The device identity persists on the existing volume;
the owner approves its first login. TLS verification, model deadlines and the
rule-based fallback remain intact. See `docs/fly-mini-pc.md` for operation;
deployment and live verification are recorded separately when completed.

John asked to consider dummy email access in the following stage, not implement
it now. Proposed direction: isolated guest identities and a captured demo inbox,
clearly separated from real ANU ownership verification. An arbitrary fictional
address cannot receive real SMTP mail. Keep the current verified registration
unchanged until that guest workflow and its data boundaries are agreed.

## 27 September 2026: Fly inference and repeatable email checks

The owner approved Fly's current Tailscale device while the machine was kept
awake. The saved identity then survived the configuration restart. Fly now has
the private Ollama endpoint configured; four existing fictional-input adviser
smoke cases passed from inside Fly, including unsupported-claim rejection.
See `fly-mini-pc.md` for timings and the initial login/restart problem.

John asked to repeat SMTP verification using his existing address and selected
the non-destructive verification-test action instead of deleting his account.
My account sends a fresh receipt link to the signed-in account's stored email,
at most three times in 15 minutes. Separate hashed test tokens and durable status
timestamps cannot activate accounts, change credentials, revoke sessions or
alter enrolment records. SMTP acceptance is distinct from confirmed receipt.

The demo-inbox discussion remains a proposal. Recommend explicit real/demo
choices rather than automatic routing by address shape, because ANU supports
name-based aliases too. Proposed guests receive generated `.test` identities
and a private captured inbox with clear simulation labels. This is recorded in
`demo-inbox-design.md`, not implemented or advertised as available.

## 27 September 2026: chosen demo addresses and useful email confirmation

John replaced the standalone verification-test interface with a useful password
change, and approved explicit Normal / Demo tabs. The visitor chooses a `.test`
address and password, receives a private simulated confirmation and enters a
persistent fictional profile. Real ANU addresses and aliases still require SMTP.
The inbox uses a hashed browser capability and HMAC-derived links; it never
captures real account, password or reviewer mail. Links need explicit POSTs.

Signed-in password changes require the current password and a fresh inbox link.
The final POST revokes sessions and other change links while retaining academic
history. Old receipt links remain compatible and cannot change credentials.
No account deletion or forgotten-password recovery is included.

The earlier proposed separate guest queue is refined to permit labelled demo
requests in the assigned invited reviewer's queue. This supports marking both
sides with one real mailbox: a normal invited reviewer and a chosen demo student.
Account isolation and course assignment still determine access. Public signup
never creates reviewers. The build now includes an owner-only invitation CLI;
its `--list` path is read-only and sends no mail. Actual invitations need an
explicit intended recipient and an available fictional reviewer slot.

Brevo's Delivered status establishes recipient-server acceptance, not Inbox
placement. Quarantine and recipient mail rules remain possible causes; no ANU
mail trace has established why John's specific message was missing. Keep that
uncertainty separate from local capture tests and successful SMTP submission.

## 27 September 2026: separate password recovery from a known-password change

John pointed out that asking for the current password cannot help someone who
has forgotten it. Sign-in now links to Forgot password, and My account explains
the two routes. Recovery sends a reset link to an already-verified normal account
without requiring a session or old password. The link is the verification key;
the existing confirmation form collects the new password twice.

Unknown, unverified and throttled addresses receive the same public response.
SMTP delivery runs outside that response and persists pending/sent/failed status,
preventing provider latency from exposing account existence. There is no retry
worker; an interrupted send needs a fresh request. Reset and signed-in change
links share the same narrowly scoped password operation, expiry, single-use
check, credential fingerprint and session revocation. Academic data and reviewer
assignments stay intact. Demo recovery requires an existing private inbox or
demo session; an arbitrary fictional address cannot recover another account.

## 2026-09-28 — One email, two invited views and scoped demo reviewing

John has one real inbox and asked for a deployed invitation page plus a demo
reviewer. He explicitly selected reviewing only the visitor's own demo requests.
The prior one-role-per-email limitation is superseded: invitation acceptance
adds a reviewer assignment to an existing normal account without replacing its
verified password or student record. Session view switches retain both profiles;
reviewer-first accounts can opt into one persistent fictional student record.

Real invitations remain owner-controlled through a verified account named by
server-only REVIEWER_ADMIN_EMAIL, or the existing owner CLI. Pending grants reserve
an assignment and activate only through an emailed single-use confirmation.
The web page supports resend and cancellation. Demo decisions use a dedicated
ownership-checked route for course and overload requests, label the saved actor
as Demo reviewer, and retain explicit enrolment confirmation and load limits.
Public signup cannot grant real reviewer authority. No real invitation is sent
as a side effect of deployment or testing.
