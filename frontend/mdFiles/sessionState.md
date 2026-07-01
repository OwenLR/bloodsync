# BloodSync Frontend — Session State

## Status
Phase 2 in progress — Dashboards complete, Blood Drives complete (admin + staff),
Settings complete (admin/staff), Donors feature complete (admin),
Field workflow: ALL 4 STEPS COMPLETE (donation + collection merged).
Blood Units / Testing / Inventory feature: STAFF ONLY (no admin variant) —
Section 1 (Blood Testing / Blood Collections queue) COMPLETE.
Next: Section 2 — Blood Units (Main Inventory), staff only.

## Current Phase
Phase 2 — Features / Web

## Current Task
- Blood Units / Inventory feature — being built in sections, STAFF ONLY:
  1. ✅ Blood Testing (Blood Collections queue) — COMPLETE
  2. ⬜ Blood Units (Main Inventory) — NEXT
  3. ⬜ Inventory Cleaning (expiration highlighting, bulk removal)
  4. ⬜ Blood Separation (Whole Blood → RBC/Plasma/Platelets)

⚠ IMPORTANT — scope correction made this session:
This entire feature area (Blood Units / Blood Testing / Inventory Cleaning /
Separation) is STAFF ONLY at the frontend level. Although the backend routes
in bloodUnitRoutes.js and bloodCollectionRoutes.js allow both ROLES.ADMIN and
ROLES.PRC_STAFF, no Admin-side pages exist or are planned for any of these
4 sections. This is a deliberate departure from the earlier plan in this file
("build on Admin first, then replicate for Staff") — that plan is SUPERSEDED
for this feature area only. Do not build Admin variants for Blood
Testing / Blood Units / Inventory Cleaning / Separation unless explicitly
requested again.

---

## DEVELOPMENT APPROACH — STAFF FIRST FOR WORKFLOW

Field workflow pages (/pages/field/) are shared by PRC Staff, Volunteer,
and Phlebotomist ONLY. Admin is explicitly excluded from all field workflow
pages. This was a deliberate architectural correction made in a prior session.

Rationale: Admin has no fixed branch_id and is never physically present at
a blood drive. Admin-initiated donation records produce orphaned data
(null drive_id + wrong branch_id auto-assigned from last branch). Admin's
role is system management only — not blood donation workflow.

Blood Drives: built Admin-first, then replicated to Staff (COMPLETE both sides).
This pattern does NOT apply to Blood Units / Testing / Inventory — see scope
correction above. That feature is Staff-only by design, not by replication order.

---

## ROLE RESPONSIBILITIES (FINAL — DO NOT CHANGE)

| Role | Blood Donation Workflow | Management Features |
|---|---|---|
| Admin | ❌ No access | ✅ Full — users, drives, inventory, reports |
| PRC Staff | ✅ Walk-in (no drive required) | ✅ Branch-scoped |
| Volunteer | ✅ Drive only (must be assigned) | ❌ No |
| Phlebotomist | ✅ Drive only (must be assigned) | ❌ No |

Note: "Admin ✅ Full" above refers to general management scope per the
original role table. Blood Testing / Blood Units / Inventory Cleaning /
Separation are a carved-out exception — Staff only, no Admin frontend page,
per this session's scope correction.

---

## PENDING FEATURES (backlog — not blocking current work)
- User guide / help page — needed before UAT. Build once all Phase 2 features stable.
- Requestor self-profile endpoint — backend not scoped yet, backlog.
- Volunteer/Phlebotomist Settings frontend UI — backend ready, frontend not built.
- Requestor Settings frontend UI — backend partial (password change only).

---

## Phase 1 — Core Wiring (COMPLETE ✅)

(unchanged from prior session — see Constants / Core / Layouts / Components /
Pages / Entry Files / CSS lists below, all still accurate)

### Constants
- [x] `js/constants/apiConfig.js` — API_BASE_URL, API_ENDPOINTS
- [x] `js/constants/roles.js` — ROLES
- [x] `js/constants/statusConstants.js` — all status objects (object form, not arrays)
- [x] `js/constants/routes.js` — ROUTES (all page paths)
- [x] `js/constants/bloodTypes.js` — BLOOD_TYPES, COMPONENTS
- [x] `js/constants/notificationTypes.js` — NOTIFICATION_TYPES
- [x] `js/constants/permissions.js` — PERMISSIONS (role arrays per action)
- [x] `js/constants/socketEvents.js` — SOCKET_EVENTS
- [x] `js/constants/sidebarItems.js` — SIDEBAR_DEFINITIONS, getSidebarItems(), getSidebarSections()

NOTE: constants/navItems.js was DELETED — navbar no longer renders nav links.
All page navigation lives in sidebar only.

### Core
- [x] `js/core/api.js` — apiFetch wrapper
- [x] `js/core/auth.js` — login(), logout(), getCurrentUser(), redirectByRole(), getDashboardHref(), getCurrentUserSilent()
- [x] `js/core/utils.js` — pure utility functions only
- [x] `js/core/socket.js` — Socket.io init, socket instance export
- [x] `js/core/formPersist.js` — saveForm(), restoreForm(), clearForm()
- [x] `js/core/guards/authGuard.js` — requireAuth()
- [x] `js/core/guards/roleGuard.js` — requireRole()
- [x] `js/layouts/appShell.js` — revealAppShell()

### Layouts
- [x] `js/layouts/navbar.js` — renderNavbar(user, unreadCount)
- [x] `js/layouts/sidebar.js` — renderSidebar(items, heading), clearSidebar()

### Components
- [x] `js/components/feedback.js` — showError(), showSuccess(), clearFeedback()
- [x] `js/components/toast.js` — showToast(message, type, duration)
- [x] `js/components/modal.js` — openModal(title, body, actions), closeModal(), confirmModal(message, confirmLabel, cancelLabel)
- [x] `js/components/skeleton.js` — showSkeleton(), hideSkeleton()
- [x] `js/components/errorBoundary.js` — showErrorBoundary(), clearErrorBoundary()
- [x] `js/components/infiniteScroll.js` — initInfiniteScroll(), destroyInfiniteScroll()
- [x] `js/components/search.js` — initSearch(), clearSearch()
- [x] `js/components/searchableDropdown.js` — initSearchableDropdown()

### Pages
- [x] `index.html` — login page
- [x] `pages/404.html` — custom not found page

### Entry Files
- [x] `js/entry/loginPage.js`
- [x] `js/entry/notFoundPage.js`

### CSS
- [x] `assets/css/main.css` — global reset, shared buttons, form elements, all component styles,
      navbar (fixed), sidebar (fixed), page shell (offset for fixed nav/sidebar)

### Backend changes made during Phase 1
- [x] `authController.js` — me() now does a DB lookup to include first_name/last_name
- [x] `utils/responseHelper.js` — fixed success field from string to boolean

---

## Phase 1 — Test Verification (COMPLETE ✅)
(unchanged — see prior session notes)

---

## Phase 2 — Features / Web (IN PROGRESS)

### Dashboards (COMPLETE ✅)
- [x] `pages/admin/dashboard.html` + `js/entry/admin/dashboard.js`
- [x] `pages/staff/dashboard.html` + `js/entry/staff/dashboard.js`
- [x] `pages/volunteer/dashboard.html` + `js/entry/volunteer/dashboard.js`
- [x] `pages/phlebotomist/dashboard.html` + `js/entry/phlebotomist/dashboard.js`
- [x] `pages/requestor/dashboard.html` + `js/entry/requestor/dashboard.js`
- [x] `assets/css/pages/[role]/dashboard.css` — all 5 roles

### Blood Drives — Admin + PRC Staff (COMPLETE ✅ — both sides)
- [x] `pages/admin/bloodDrives.html` + `js/entry/admin/bloodDrives.js`
- [x] `pages/admin/bloodDriveCreate.html` + `js/entry/admin/bloodDriveCreate.js`
- [x] `pages/staff/bloodDrives.html` — NEW this session — shares admin entry JS as-is
- [x] `pages/staff/bloodDriveCreate.html` — NEW this session — shares admin entry JS as-is
- [x] `js/features/bloodDrives/bloodDrivesApi.js`
- [x] `js/features/bloodDrives/bloodDrivesUI.js`
- [x] `js/features/bloodDrives/bloodDrivesValidation.js`
- [x] `assets/css/pages/admin/bloodDriveCreate.css`
- [x] `assets/css/pages/admin/bloodDrives.css`
- [x] `assets/css/features/bloodDrives.css`

KEY ARCHITECTURAL NOTE confirmed this session: js/entry/admin/bloodDrives.js
and js/entry/admin/bloodDriveCreate.js are ALREADY fully role-aware internally
(role checks via requireRole([ROLES.ADMIN, ROLES.PRC_STAFF]), branch-locking
for Staff in bloodDriveCreate.js's populateBranches(), dynamic ROUTES.ADMIN
vs ROUTES.STAFF routing for back/cancel/new-drive links). Staff needed ONLY
two new HTML shell files pointing at the SAME admin entry scripts — no new
JS files, no duplicate entry files. Do not copy entry files into
js/entry/staff/ for this feature — the existing js/entry/admin/ files ARE
the shared implementation. This pattern (audit for role-awareness before
creating new files) should be applied to any future "replicate to Staff"
request.

#### Map Picker — ALL SECTIONS COMPLETE ✅
(unchanged — see prior session notes, Sections A–D)

### Settings — Admin + PRC Staff (COMPLETE ✅)
(unchanged — see prior session notes)

### Donors — Admin (COMPLETE ✅)
(unchanged — see prior session notes)

### Field Workflow Foundation (COMPLETE ✅)
(unchanged — see prior session notes)

### Field Workflow Pages — 4-Step Flow (COMPLETE ✅)
(unchanged — see prior session notes, Steps 1–4)

### Backend Changes — Field Workflow (COMPLETE ✅)
(unchanged — see prior session notes)

---

### Blood Testing (Blood Collections queue) — PRC Staff ONLY (COMPLETE ✅)

This is Section 1 of the Blood Units/Testing/Inventory feature area, built
this session. STAFF ONLY — no Admin page, despite bloodCollectionRoutes.js
allowing ROLES.ADMIN at the API level. See scope correction note at top
of this file.

Purpose: the "testing queue" — Staff decides Pending → Safe / Rejected for
blood collections recorded during the donation workflow. Marking Safe
auto-creates a blood unit in inventory (backend side, bloodCollectionService.js
markAsSafe()) — frontend never creates blood units directly.

- [x] `js/features/bloodCollections/bloodCollectionsApi.js`
- [x] `js/features/bloodCollections/bloodCollectionsUI.js`
- [x] `pages/staff/bloodCollections.html`
- [x] `js/entry/staff/bloodCollections.js`
- [x] `assets/css/features/bloodCollections.css`
- [x] `assets/css/pages/staff/bloodCollections.css`
- [x] `js/constants/routes.js` — added `STAFF.BLOOD_COLLECTIONS: '/pages/staff/bloodCollections.html'`
- [x] `js/constants/sidebarItems.js` — added "Blood Testing" entry to PRC_STAFF.general,
      between "Blood Drives" and "Blood Units"

Key details:
- requireRole: [ROLES.PRC_STAFF] only — not Admin, not Vol/Phleb
- Data source: GET /api/blood-collections/branch/:branch_id (branch-scoped —
  Staff only ever sees their own branch's collections, never cross-branch)
- Two-state filter only: "Pending Review" (default) vs "Reviewed" (Safe +
  Rejected combined). Disposed/Withdrawn statuses deliberately excluded from
  this page's filter — those belong to Blood Unit Inventory (Section 2/3),
  not the testing queue. Decided for UX focus — one page, one job.
- Actions exposed: Mark Safe, Reject — Disposed/Withdrawn are NOT actions on
  this page (those happen later, in inventory lifecycle management)
- QNS collections (is_qns=true): Mark Safe button rendered disabled with an
  inline reason — NOT hidden. This is a UX-only safeguard; the backend
  (assertNotQns() in bloodCollectionService.js) is the actual enforcer
  regardless of frontend state. Security boundary stays backend-side.
- Reject requires a reason — dedicated modal with textarea (not the generic
  confirmModal(), which has no input field). Reason is required client-side
  for UX and required server-side by bloodCollectionModel.js regardless.
- Detail view is a modal (openModal from components/modal.js), fetched via
  GET /api/blood-collections/:id on demand — list payload stays lightweight,
  modal fetch carries the full record (approved_by, rejected_at,
  rejection_reason, notes, etc. — fields NOT in the branch-scoped list query)
- Status badge classes added: .status-badge--pending/--safe/--rejected
  (status-badge base class itself already existed in bloodDrives.css)

### Backend change made this session — required for Section 1
- [x] `repositories/bloodCollectionModel.js` — getCollectionsByBranch() query
      was missing fields needed by the frontend list view. Added: is_qns,
      qns_reason, notes, created_at, donor_id, collected_by_first,
      collected_by_last. Confirmed applied by developer before frontend
      bloodCollectionsApi.js was built against it.

---

### Blood Units (Main Inventory) — PRC Staff ONLY (NOT STARTED — NEXT)
- [ ] Blood units list with status badges (branch-scoped — GET /api/blood-units/branch/:branch_id)
- [ ] Separate action: Whole Blood + Available only (POST /api/blood-units/:id/separate)
      — NOTE: per bloodUnitService.js separateUnit(), this performs the
      separation AND status update — likely belongs with Section 4
      (Blood Separation), not bundled into this section. Confirm scope
      boundary at start of Section 2 before building.
- [ ] Status update (Disposed, Withdrawn) — confirm modal required,
      PATCH /api/blood-units/:id/status, reason required
      (see bloodUnitRules.js assertReasonProvided — need to request this file)
- [ ] Terminal states (Released, Disposed, Withdrawn, Separated, Expired) —
      hide all action buttons per contract.md business rules table
- [ ] Inventory Cleaning view — likely Section 3, not Section 2 — confirm

Backend reference files already provided (prior session, available to re-upload
if needed in new chat): bloodUnitRoutes.js, bloodUnitService.js. NOT yet
provided: bloodUnitModel.js (repository), bloodUnitRules.js (domain rules —
assertNotTerminal, assertReasonProvided, assertSeparable referenced in
bloodUnitService.js but file contents not yet seen), bloodUnitController.js,
bloodUnitValidator.js (if exists). Per rules.md, request these before writing
bloodUnitsApi.js — same pattern followed for Section 1.

### Blood Requests + real-time socket (NOT STARTED)
- [ ] Requestor submit request page
- [ ] Requestor my requests page with live status
- [ ] Staff/Admin blood requests management page
- [ ] Socket: blood_request_new → increment badge, prepend row

### Notifications (NOT STARTED)
- [ ] Notification list page (all roles)
- [ ] updateBadge() in notificationUI.js
- [ ] Mark read / mark all read

### Reports (NOT STARTED)
- [ ] Aggregate data display (read-only, build last)

### Drive pages — Volunteer + Phlebotomist (NOT STARTED)
- [ ] `pages/volunteer/drive.html` — my assignment view
- [ ] `pages/phlebotomist/drive.html` — my assignment view

---

## Phase 3 — Mobile / React Native (not started)

---

## Phase 4 — Design Pass (not started)

---

## Key Decisions Made

### Admin excluded from field workflow (PERMANENT)
Admin has no branch_id and is never at a blood drive. Admin-created donation
records produce orphaned data (null drive_id, wrong branch_id). Admin is
management only. This is non-negotiable going forward.

### Admin excluded from Blood Testing / Blood Units / Inventory / Separation (THIS SESSION)
New scope decision, distinct from the field-workflow exclusion above (different
rationale). This entire feature area is Staff-only at the frontend by product
decision, even though the backend API routes technically allow Admin too.
No Admin pages planned for any of: Blood Testing, Blood Units, Inventory
Cleaning, Blood Separation. If this changes, it will be stated explicitly.

### Donation + Collection merged into one page
donorDonation.html now handles both steps. donorCollection.html and
donorCollection.js are retired and must be deleted from the project.
ROUTES.FIELD.COLLECTION points to donorDonation.html as a redirect alias.
Sidebar shows "Record Donation & Collection" as a single entry.

### Step flow is now 4 steps (not 5)
Register → Interview → Screening → Donation & Collection
All HTML step indicators updated to reflect this.

### Phlebotomist dropdown is searchableDropdown (not <select>)
Same component pattern as donor search. Hidden input stores selected user_id.
Auto-selects logged-in user if they are a Phlebotomist.

### Blood Drives shared entry-file pattern (clarified this session)
When a feature's JS entry file is already written to check role_id internally
and branch by role (see js/entry/admin/bloodDrives.js,
js/entry/admin/bloodDriveCreate.js), replicating that feature to a new role
folder requires ONLY a new HTML shell pointing at the SAME entry script —
never a duplicate JS file. Always audit existing entry files for
role-awareness before creating anything new. This avoids drift between
admin/staff copies of what should be one shared implementation.

### Blood Testing / Blood Units frontend exposes a narrower action set than the
### backend route file allows (clarified this session)
bloodCollectionRoutes.js's PATCH /:id/status technically accepts any of
Safe/Rejected/Disposed/Withdrawn. The Blood Testing page only exposes
Mark Safe and Reject as UI actions — Disposed/Withdrawn are reachable via
the API but intentionally not surfaced on this page; they belong to
inventory-lifecycle pages instead (Blood Units / Inventory Cleaning,
Sections 2–3). Keep this narrowing in mind for Blood Units: that page should
likewise expose only the actions that make sense for ITS job, not every
status the backend route theoretically allows.

### SessionStorage chain (current — 4 steps)
field_donor_id            set by donorRegistration, read + cleared by donorInterview
field_donor_name          set by donorRegistration, cleared by donorInterview
field_interview_id        set by donorInterview, read + cleared by donorScreening
field_interview_donor_id  set by donorInterview, read + cleared by donorScreening
field_screening_id        set by donorScreening, read + cleared by donorDonation
field_screening_donor_id  set by donorScreening, read + cleared by donorDonation
(donorDonation is last step — no further sessionStorage writes)

### Data cleanup required (orphaned Admin walk-in records)
Admin was previously allowed on workflow pages and created records with
null drive_id or incorrect branch_id. Clean these up:
  DELETE FROM donor_interview_answers WHERE interview_id IN (
    SELECT interview_id FROM donor_interviews
    WHERE drive_id IS NULL AND branch_id IS NULL
  );
  DELETE FROM donor_interviews WHERE drive_id IS NULL AND branch_id IS NULL;
  DELETE FROM screening WHERE drive_id IS NULL AND branch_id IS NULL;
Note: if admin-created records have branch_id set (auto-assigned), filter
by checking conducted_by against admin user_ids instead.

### Helmet CSP (current complete state)
scriptSrc:  self, cdn.socket.io, unpkg.com
styleSrc:   self, unsafe-inline, unpkg.com
connectSrc: self, ws://localhost:3000, wss://localhost:3000,
            cdn.socket.io, nominatim.openstreetmap.org, unpkg.com
imgSrc:     self, data:, res.cloudinary.com, *.tile.openstreetmap.org, unpkg.com
fontSrc:    self
objectSrc:  none
upgradeInsecureRequests: removed (Railway handles HTTPS)