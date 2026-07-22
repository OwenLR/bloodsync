# BloodSync Frontend — Session State

## Status
Phase 2 in progress. Complete: Dashboards (all 5 roles), Blood Drives
(admin+staff), Settings (admin/staff), Donors (admin), Field Workflow
(4 steps), Blood Units/Inventory feature — all 4 sections (Testing, Units,
Cleaning, Separation), Staff only, Notifications (all 5 roles),
Blood Requests — all 3 sections (Requestor Submit Request, Requestor My
Requests, Staff Management + Detail page), Vol/Phleb Drive
Assignments ('My Assignments' — Incoming/History tabs, self accept/
decline).
Not started: Reports, Vol/Phleb + Requestor Settings frontend,
Requestor self-profile. Blood Drive Endpoints full contract.md
write-up (pre-existing gap, flagged this session, not yet
backfilled).

## Current Phase
Phase 2 — Features / Web

## Next Up
Reports — aggregate data display, read-only, explicitly build-last per
prior direction. Vol/Phleb Drive Assignments (previously next-up) is now
built — see Built section below.

---

## Permanent Rules (do not re-derive, do not revert)
- Admin excluded from all field workflow pages (donorRegistration/Interview/
  Screening/Donation). No branch_id, never physically present at drives.
  Admin-created records produce orphaned data (null drive_id, wrong
  branch_id auto-assigned).
- Admin excluded from Blood Testing / Blood Units / Inventory Cleaning /
  Blood Separation — Staff only at frontend, despite backend routes
  (bloodUnitRoutes.js, bloodCollectionRoutes.js) technically allowing
  Admin. No Admin pages exist or are planned for these 4.
- Admin excluded from Blood Requests entirely (management page + detail
  page) — decided this session. Blood Requests is Requestor ↔ Staff only,
  frontend-only restriction matching the same pattern as the 4 inventory
  sections above; backend routes (bloodRequestRoutes.js) still technically
  allow Admin per contract.md's role tables, but no Admin UI exists or is
  planned. `sidebarItems.js`'s Admin `general` section had its "Blood
  Requests" entry removed this session. `ROUTES.ADMIN.BLOOD_REQUESTS`
  itself was deliberately left defined in `routes.js` (harmless if unused,
  avoids a dangling reference if something is later found to need it) —
  flag this if a cleanup pass ever wants to fully remove it.
- Field pages (/pages/field/) shared by Vol + Phleb + Staff — backend
  enforces access via bloodDriveMiddleware, sidebar does not restrict by
  role label.
- Donation + Collection merged into one page (donorDonation.html).
  donorCollection.html/.js retired, must stay deleted. ROUTES.FIELD.COLLECTION
  points to donorDonation.html as alias. Flow is 4 steps, not 5.
- Phlebotomist "Performed By" field: searchableDropdown with hidden input,
  never `<select>`. Field roles filtered to role_id=6, staff via
  GET /api/volunteers/available?role=6. Auto-selects if user is Phlebotomist.
- Feature-to-feature API reuse: when a new feature needs data/mutations an
  existing feature already fetches, import from that feature's *Api.js
  rather than duplicating fetch calls. UI file of the new feature still
  only imports from its own Api file, never reaches sideways.
  Precedent: inventoryCleaningApi.js → bloodUnitsApi.js;
  bloodSeparationUI.js → bloodUnitsApi.js.
- Before replicating a role-aware feature to a new role, audit the
  existing entry file first — may already handle both roles internally
  (role checks + branch-locking), needing only a new HTML shell.
  Precedent: Blood Drives staff pages reuse admin entry files as-is.
- Blood Testing / Blood Units frontends expose a narrower action set than
  their backend routes allow (e.g. PATCH /collections/:id/status accepts
  Safe/Rejected/Disposed/Withdrawn, but Blood Testing page only exposes
  Mark Safe/Reject). Each page exposes only actions relevant to its own
  job — apply same narrowing to any new page in this feature area.
  Same pattern applied to Blood Requests Staff Management: only the
  documented transition buttons (Approve/Reject/Mark Ready/Release) are
  shown, gated per the actual VALID_TRANSITIONS table, never a raw status
  dropdown.
- Shared entry file pattern (introduced by Notifications): when a
  feature's logic and layout are identical across all roles (same
  endpoints, no branch-locking, no role-specific business rules), use one
  file in `js/entry/shared/` rather than 5 near-duplicate role-folder
  entry files. Role differences (e.g. which sidebar sections to render)
  are handled by branching inside that one file, same technique already
  used for the Vol/Phleb vs Admin/Staff sidebar split in Field entry
  files. Precedent: `entry/shared/notifications.js` used by all 5
  `pages/[role]/notifications.html`.
- Navbar badge live-update: every entry file calls `refreshBadge()`
  (from `features/notifications/notificationsUI.js`) immediately after
  `revealAppShell()`, before any other post-reveal setup. Non-blocking,
  not awaited. Applied to all entry files as of this session — any new
  entry file going forward must include this too. Confirmed still applied
  in all Blood Requests entry files this session (submitRequest, requests,
  bloodRequests, bloodRequestDetail).
- PRC Staff branch-scoping is a recurring bug pattern in this codebase —
  Blood Units and Blood Requests have both needed this fix after initial
  build (see gochas.md #34 and #42). Check any new Staff-facing
  controller for the same gap before considering a feature complete.
- Geolocation (navigator.geolocation) is auto-prompted on page load for
  location-dependent features (currently: Submit Request's fulfillment
  step). Browsers only show the permission popup once per origin — no
  popup on repeat visits after the first grant/deny is expected browser
  behavior, not a bug. Silently falls back to no-location (alphabetical
  branch order) on denial/error/non-HTTPS — never blocks the flow.
- blood_requests.preferred_branch_id — intentionally never collected or
  sent by the frontend. Predates the two-step fulfillment-options flow,
  fully superseded by branch_id. Column stays nullable; no form field
  exists for it. Do not resurrect without a clear new purpose (see
  gotchas.md #46).
- fulfillment_type is never sent by the frontend — Delivery is out of
  scope for this system. Every request submits as Pickup (the model's
  existing default when the field is omitted). No delivery_address field
  exists anywhere in the Submit Request form.
- Optimistic patching limitation: when an endpoint returns a raw DB row
  with no joined display fields (e.g. cancelRequest, markReceived —
  RETURNING * only, no hospital_name/branch_name), do not replace a list
  item with the mutation response. Either patch only the known field
  (e.g. status) into the existing cached item, or — for single-record
  detail pages — just refetch the full record instead. Precedent:
  bloodRequestsListUI.js patches status in place; bloodRequestDetailUI.js
  refetches via getRequestById() after every action instead, because
  bloodRequestService.js's updateStatus() response shape itself varies
  by status (nested {request, reservations} for Approved, flat row for
  Released/Rejected) — refetching sidesteps that inconsistency entirely
  rather than branching on it.
- Client-side sort deviating from backend's default ORDER BY is
  acceptable and preferred over changing shared SQL when the ordering
  need is page-specific. Precedent: Blood Requests Staff Management's
  Pending tab sorts ascending (FCFS, oldest first) client-side;
  bloodRequestModel.js's getRequestsByBranch() keeps its DESC default
  untouched since other callers may depend on it.
- Detail-page-via-query-string is now an established pattern (first used
  by Blood Requests Staff Management → Detail, this session): when a
  list needs a genuine multi-section, document-review-style detail view
  rather than a quick-glance modal, use a separate static HTML page with
  the record ID passed via `?id=` and read with
  `new URLSearchParams(window.location.search)` in the entry file, Gmail-
  style. Every other "detail" view in the app so far (Blood Units, Blood
  Collections) uses a modal fetched by ID instead — reserve the separate-
  page pattern for cases with real document/file review or enough
  content that a modal would be cramped, not as a default replacement
  for the modal pattern.
- Remote/already-uploaded documents (e.g. request_form_path, a Cloudinary
  URL) are surfaced via a plain `<a target="_blank" rel="noopener
  noreferrer">Open Document</a>` link, not an inline iframe/embed. The
  app's CSP (server.js Helmet config) has no `frame-src` directive, which
  falls back to `default-src 'self'` — an iframe to a Cloudinary URL
  would be silently blocked. A plain link navigation isn't subject to
  page CSP, so this works with zero backend changes. This is a deliberate
  choice, not a limitation discovered too late — inline PDF/image preview
  would require adding `frameSrc: ["'self'", "https://res.cloudinary.com"]`
  to server.js, which was intentionally deferred (see Not Started).
  Note: this only affects PDFs — image files (jpeg/png) already preview
  fine inline via `<img>`, since `res.cloudinary.com` is already in
  `imgSrc`; only PDFs currently require the new-tab link.
- Donor walk-in (Staff/Admin, non-drive) cycle eligibility is chain-aware,
  not "any record exists." A shared state machine
  (backend: domain/donorCycleRules.js + services/donorCycleService.js,
  exposed via GET /api/donors/:donor_id/cycle-status; frontend mirror:
  features/fieldWorkflow/donorCycleStatus.js) walks
  interview -> screening -> donation -> collection and returns one of:
  available, resume_interview, proceed_screening, proceed_donation,
  proceed_collection, cooldown. Used by donorInterview.js, donorScreening.js,
  and donorDonation.js for both dropdown eligibility filtering and
  per-donor "already done" checks. Volunteer/Phlebotomist drive-scoped
  behavior is a SEPARATE, already-correct mechanism (drive_id scoping) and
  is deliberately untouched by this system — do not merge the two.
- DEFERRAL_COOLDOWN_HOURS (currently 24, temporary policy value) —
  constants/deferralRules.js, mirrored frontend/backend like
  medicalRules.js. Gates how long a walk-in donor stays blocked after a
  deferral/QNS before the cycle-status system marks them 'available'
  again. Change in exactly one place per layer.
- Rate limiting (upstashRateLimiter.js): general API traffic is keyed by
  authenticated user_id (falls back to IP only for unauthenticated
  requests), 300 requests/1 minute. Login stays IP-keyed, 5/15min,
  unchanged — a login request has no token to key on, and IP-based
  brute-force protection is correct there specifically. Do not revert the
  general limiter to IP-keying or a 15-minute window — see gochas.md #66
  for why that combination breaks normal multi-page-navigation usage.
- Blood Drive assignment accept/decline has TWO valid paths, not one:
the original email token link (GET /confirm) and the authenticated
"My Assignments" self-service route (PATCH /:id/participants/me).
Both remain supported per product decision (this session) — do not
remove or deprecate either one without an explicit new decision. Using
either path clears the assignment's confirmation_token, so they're
mutually exclusive single-use actions on the same assignment, not two
independent channels that could both fire.

Backend — additive only to the existing Blood Drive feature, nothing
pre-existing changed:


bloodDriveModel.js gained getAssignmentsByUser(user_id)
bloodDriveService.js gained getMyAssignments(user_id) and
updateMyParticipationStatus(drive_id, reqUser, assignment_status)
bloodDriveValidator.js gained validateSelfUpdateParticipant —
narrower than the Admin/Staff validator, only accepts
Confirmed/Declined
bloodDriveController.js + bloodDriveRoutes.js gained
GET /my-assignments and PATCH /:id/participants/me, both
Volunteer/Phlebotomist only, both registered before their
parameterized sibling routes to avoid Express route shadowing (same
precedent as /branch/:branch_id and /participants/suggestions)


Frontend files:


js/features/bloodDrives/bloodDrivesApi.js — gained
getMyAssignments() and updateMyParticipationStatus() (added to the
existing Blood Drives API file, per the "feature-to-feature API reuse"
Permanent Rule — no new Api file created)
js/features/bloodDrives/bloodDriveAssignmentUI.js (new) — tabs,
card rendering, Accept (no confirmation)/Decline (confirmModal,
danger=true) actions
js/entry/shared/driveAssignment.js (new) — one shared entry file for
both roles, same "Shared entry file pattern" as
entry/shared/notifications.js
pages/volunteer/drive.html + pages/phlebotomist/drive.html (new)
assets/css/features/bloodDriveAssignment.css (new) — card layout +
4 new .status-badge--* modifiers (Assigned/Confirmed/Declined/No
Show). Does not redefine .status-badge/.empty-state
(bloodDrives.css) or .request-tabs/.tab-button* (bloodRequests.css)
— both linked in as extra stylesheets, same existing "borrow shared
base classes" pattern already flagged as CSS debt for
bloodUnits.html/requests.html.
assets/css/main.css gained one new modifier, .btn-sm (applied
alongside .btn-primary/.btn-secondary, same convention as
.btn-full-width) — no generic small-button modifier existed before
this (notifications.css's .btn-xs is page-specific).

## Role Responsibilities (FINAL)
| Role | Donation Workflow | Management |
|---|---|---|
| Admin | ❌ | ✅ Full (users, drives, reports) — NOT inventory, NOT blood requests (see exclusions above) |
| PRC Staff | ✅ Walk-in, no drive required | ✅ Branch-scoped |
| Volunteer | ✅ Drive only, must be assigned | ❌ |
| Phlebotomist | ✅ Drive only, must be assigned | ❌ |

---

## Built ✅

### Phase 1 — Core Wiring
(unchanged from prior sessions, stable)

### Dashboards ✅
(unchanged from prior sessions, stable)

### Blood Drives — Admin + Staff ✅
(unchanged from prior sessions, stable)

### Settings — Admin + Staff ✅
### Donors — Admin ✅
### Field Workflow Foundation ✅
### Field Workflow — 4 Steps ✅
### Backend Changes — Field Workflow ✅
(all unchanged from prior sessions, stable)

### Blood Testing (Blood Collections queue) — Staff ONLY ✅
### Blood Units (Main Inventory) — Staff ONLY ✅
### Inventory Cleaning — Staff ONLY ✅
### Blood Separation — Staff ONLY ✅
### Notifications — All 5 roles ✅
(all unchanged from prior sessions, stable — see prior STATE.md content
for full file lists and details)

---

### Blood Requests — Requestor Submit Request (Section 1) ✅
(unchanged from prior session — full 3-stage wizard, see prior STATE.md
for file list and build notes)

---

### Blood Requests — Requestor "My Requests" (Section 2) ✅
Flat list, newest-first, built this session. Files:
- `js/features/bloodRequests/bloodRequestsListUI.js`
- `pages/requestor/requests.html`
- `js/entry/requestor/requests.js`
- CSS additions to `assets/css/features/bloodRequests.css`
  (`.request-card`, `.request-card-header`, `.request-card-patient`,
  `.request-card-meta`, `.request-card-denial`, `.request-card-actions`,
  status-badge variants `--pending/--approved/--waiting/--released/
  --rejected/--cancelled`)

`bloodRequestApi.js` gained `getMyRequests()`, `cancelRequest()`,
`markReceived()`. `statusConstants.js`'s `BLOOD_REQUEST_STATUS` had a
missing `WAITING: 'Waiting'` value added — file's own header says it
mirrors backend `statuses.js` exactly, and backend's REQUEST_STATUSES
already had it; this was a frontend correction required for the feature
(the "Received" button only applies to Waiting status), not an unrelated
change.

Actions: Cancel (Pending only), Already Received (Waiting only). Both
endpoints return raw DB rows with no joins (no hospital_name/branch_name)
— UI patches only the `status` field into the cached list item rather
than replacing it with the response. Neither action fires a socket event
or notification (gochas.md #44) — confirmed via bloodRequestService.js:
cancelRequest() and markReceived() only call notificationService for
other transitions, not these two.

Socket: `blood_request_status` listener wired in for the staff-driven
transitions (Approved/Waiting/Released/Rejected) that DO fire — patches
the matching cached item's status/denial_reason and re-renders, plus a
toast and refreshBadge() call (a DB notification is created for these
too). Requires `initSocket(user)` to be awaited before attaching the
listener, since `socket` is a live module binding in socket.js that may
still be null immediately after import.

`pages/requestor/requests.html` links `bloodDrives.css` as a second
stylesheet purely to get `.status-badge` (base class) and `.empty-state`
— same precedent as `bloodUnits.html`. See Not Started for the flagged
cleanup around this.

---

### Blood Requests — Staff Management + Detail (Section 3) ✅
Admin excluded entirely (see Permanent Rules) — Requestor ↔ Staff only.

**List page** — Pending/All tabs, Pending tab default. Files:
- `js/features/bloodRequests/bloodRequestsManageUI.js`
- `pages/staff/bloodRequests.html`
- `js/entry/staff/bloodRequests.js`

`bloodRequestApi.js` gained `getAllRequestsStaff()` (GET
/api/blood-requests — backend auto-scopes PRC Staff to own branch,
confirmed via contract.md/gochas.md #42, no frontend branch filter
needed), `getRequestById()`, `updateRequestStatus()`,
`markReadyForPickup()`.

Pending tab: client-side ascending sort by `created_at` (FCFS — oldest
first, new incoming requests land at the bottom). Deliberately NOT a
backend/SQL change — `bloodRequestModel.js`'s `getRequestsByBranch()`
keeps its existing `ORDER BY created_at DESC`, since other callers may
rely on it; the ascending order is this page's own display concern only.
All tab: every status, backend's default DESC order kept as-is, no
client sort applied.

Socket: `blood_request_new` listener refetches the full list on event
(payload is partial — request_id/patient_name/urgency_level only, no
hospital_name/branch_name/status/created_at — so a full refetch was
chosen over trying to fabricate a row from a partial payload), plus
toast + refreshBadge(). This was flagged as intended-but-unbuilt scope in
a prior session's Not Started section — built as part of this pass.

Actions column only has a "View Details" button — no inline
Approve/Reject here, per the Gmail-style detail-page decision below.

**Detail page** — first page in the app using `?id=` + `URLSearchParams`
instead of a modal (see Permanent Rules for the pattern note). Files:
- `js/features/bloodRequests/bloodRequestDetailUI.js`
- `pages/staff/bloodRequestDetail.html`
- `js/entry/staff/bloodRequestDetail.js`

Sections rendered: header (patient name + status badge), patient/request
info, requested items table, request-form document link (see Permanent
Rules — new-tab link, not inline embed, due to the CSP frame-src gap),
reserved units table (only rendered if reservations exist), status
history log, and the action buttons.

Actions gated strictly by contract.md's VALID_TRANSITIONS: Pending shows
Approve/Reject; Approved shows Mark Ready/Reject; Waiting shows
Release/Reject; Released/Rejected/Cancelled show no buttons. Reject
always opens a reason-required modal (same pattern as
bloodCollectionsUI.js's openRejectModal) since `denial_reason` is
required server-side when rejecting. Approve/Mark Ready/Release use
confirmModal() + a shared `runAction()` helper. Every successful action
refetches the full record via getRequestById() and re-renders, rather
than trying to use the mutation response directly — see Permanent Rules
for why (response shape inconsistency across statuses).

Status log display: `changed_by_type` ('staff'/'requestor') is shown,
not a specific person's name — `getStatusLogsByRequest()` /
`getReservationsByRequest()` in bloodRequestModel.js don't join user
names onto `changed_by_id`, so only the actor type is displayable, not
who specifically. Flagged, not fixed (would need a model/join change).

CSS additions to `assets/css/features/bloodRequests.css`: `.request-tabs`,
`.tab-button`, `.tab-button--active` (first tab-control pattern in the
app — no prior precedent existed), `.urgency-badge` + `--routine`/`--stat`
variants, `.detail-page-header`, `.detail-section`, `.detail-empty-note`,
`.detail-actions`, `.status-log-list`, `.status-log-item`,
`.status-log-notes`.

`routes.js`: added `STAFF.BLOOD_REQUEST_DETAIL`.
`sidebarItems.js`: removed Admin's "Blood Requests" entry (see Permanent
Rules).

---

## Not Started
- [ ] Reports — aggregate data display, read-only, build last 
- [ ] User guide / help page — before UAT
- [ ] Requestor self-profile endpoint — backend not scoped yet
- [ ] Vol/Phleb Settings frontend — backend ready, frontend not built
- [ ] Requestor Settings frontend — backend partial (password change only)
- [ ] CSS cleanup: `.page-header` overridden directly in
      `staff/bloodUnits.css` and `staff/bloodCollections.css` (same
      anti-pattern as old .btn-primary bug). The proper fix —
      `.page-header--with-action` modifier class — EXISTS in main.css.
      The two files themselves are still unconverted; still a separate,
      not-yet-done cleanup pass.
- [ ] CSS cleanup: `.status-badge` and `.empty-state` base classes live
      in `features/bloodDrives.css` but are now reused by
      `bloodUnits.html`, `inventoryCleaning.html`, and both
      `requests.html` and `bloodRequests.html`/`bloodRequestDetail.html`
      (Blood Requests, this session) via a second `<link>` tag pulling
      in bloodDrives.css purely for these shared base classes. Works,
      but naming/location is misleading — candidate for extracting into
      main.css as genuinely shared classes once a cleanup pass happens.
- [ ] Skeleton containers across the app (units-skeleton,
      notifications-skeleton, requests-skeleton, collections-skeleton,
      etc.) never actually call `showSkeleton(containerId, count, type)`
      from skeleton.js — every feature UI file's local
      showSkeleton()/hideSkeleton() helpers only toggle `display` on an
      empty container. Skeleton placeholders never visually render
      during load. Confirmed present in bloodUnitsUI.js,
      notificationsUI.js, bloodCollectionsUI.js, and now
      bloodRequestsListUI.js / bloodRequestsManageUI.js /
      bloodRequestDetailUI.js (Blood Requests, this session) — same gap
      replicated for consistency with the existing pattern each time,
      not introduced new. Needs a proper pass wiring the real
      skeleton.js calls into each feature file once prioritized.
- [ ] contract.md has no full "Blood Drive Endpoints" section — only
the two new participant self-service endpoints (added this
session) are documented there. The pre-existing CRUD/participant
surface (GET /, GET /:id, POST /, PATCH /:id, PATCH /:id/cancel,
GET/POST/DELETE/PATCH .../participants, .../suggestions, .../bulk,
GET /:id/stats, GET /confirm) still needs its own write-up.
Flagged, not backfilled, to keep this session's contract.md patch
scoped to what actually changed.
- [ ] CSP enhancement (optional, deferred): add
      `frameSrc: ["'self'", "https://res.cloudinary.com"]` to
      server.js's Helmet config to allow inline PDF preview on the Blood
      Request detail page, instead of the current "Open Document"
      new-tab link. Deliberately not done this session — see Permanent
      Rules for the reasoning. Revisit only if staff find the new-tab
      link workflow too clunky in practice.

---

## Reference — stable, rarely changes

**SessionStorage chain (4-step field workflow):**