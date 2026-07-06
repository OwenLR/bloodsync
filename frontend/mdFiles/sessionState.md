# BloodSync Frontend — Session State

## Status
Phase 2 in progress. Complete: Dashboards (all 5 roles), Blood Drives
(admin+staff), Settings (admin/staff), Donors (admin), Field Workflow
(4 steps), Blood Units/Inventory feature — all 4 sections (Testing, Units,
Cleaning, Separation), Staff only, Notifications (all 5 roles).
Not started: Blood Requests, Reports, Vol/Phleb drive pages.

## Current Phase
Phase 2 — Features / Web

## Next Up
Blood Requests. Build order agreed: (1) Requestor Submit Request,
(2) Requestor My Requests, (3) Staff/Admin Blood Requests management.
Backend branch-scoping bug already fixed (see Permanent Rules) —
frontend work can proceed without further backend blockers for the
management page.

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
  entry file going forward must include this too.
- PRC Staff branch-scoping is a recurring bug pattern in this codebase —
  Blood Units and Blood Requests have both needed this fix after initial
  build (see gochas.md #34 and #42). Check any new Staff-facing
  controller for the same gap before considering a feature complete.

## Role Responsibilities (FINAL)
| Role | Donation Workflow | Management |
|---|---|---|
| Admin | ❌ | ✅ Full (users, drives, reports) — NOT inventory (see exclusion above) |
| PRC Staff | ✅ Walk-in, no drive required | ✅ Branch-scoped |
| Volunteer | ✅ Drive only, must be assigned | ❌ |
| Phlebotomist | ✅ Drive only, must be assigned | ❌ |

---

## Built ✅

### Phase 1 — Core Wiring
All constants (`apiConfig.js`, `roles.js`, `statusConstants.js`, `routes.js`,
`bloodTypes.js`, `notificationTypes.js`, `permissions.js`, `socketEvents.js`,
`sidebarItems.js`), core (`api.js`, `auth.js`, `utils.js`, `socket.js`,
`formPersist.js`, guards/`authGuard.js`+`roleGuard.js`), layouts
(`appShell.js`, `navbar.js`, `sidebar.js`), components (`feedback.js`,
`toast.js`, `modal.js`, `skeleton.js`, `errorBoundary.js`,
`infiniteScroll.js`, `search.js`, `searchableDropdown.js`), `index.html`,
`pages/404.html`, `main.css`. Stable, verified against actual files.
`constants/navItems.js` deleted — navbar has no nav links, all nav is
sidebar-only.
Backend: `authController.js` me() does DB lookup for first/last name;
`responseHelper.js` success field fixed string→boolean.

### Dashboards ✅
All 5 roles: `pages/[role]/dashboard.html` + `entry/[role]/dashboard.js` +
`css/pages/[role]/dashboard.css`. All 5 entry files updated this session
to call `refreshBadge()` after `revealAppShell()` (Notifications Step B).

### Blood Drives — Admin + Staff ✅
- `pages/admin/bloodDrives.html` + `entry/admin/bloodDrives.js`
- `pages/admin/bloodDriveCreate.html` + `entry/admin/bloodDriveCreate.js`
- `pages/staff/bloodDrives.html` — reuses admin entry JS as-is
- `pages/staff/bloodDriveCreate.html` — reuses admin entry JS as-is
- `features/bloodDrives/bloodDrivesApi.js` / `bloodDrivesUI.js` /
  `bloodDrivesValidation.js`
- `css/pages/admin/bloodDriveCreate.css`, `css/pages/admin/bloodDrives.css`,
  `css/features/bloodDrives.css`

Admin entry files already role-aware internally (requireRole([ADMIN,
PRC_STAFF]), branch-locking for Staff in populateBranches(), dynamic
ROUTES.ADMIN/STAFF routing) — Staff needed only new HTML shells, no new JS.
Map Picker: all sections (A–D) complete.
`entry/admin/bloodDrives.js` updated this session with `refreshBadge()`.

### Settings — Admin + Staff ✅
### Donors — Admin ✅
### Field Workflow Foundation ✅
### Field Workflow — 4 Steps ✅ (Register → Interview → Screening → Donation & Collection)
All 4 field entry files updated this session with `refreshBadge()`,
placed after `revealAppShell()` and before each page's own async
setup (donor dropdown loads, form wiring, etc.).
### Backend Changes — Field Workflow ✅
(all unchanged from prior sessions, stable)

---

### Blood Testing (Blood Collections queue) — Staff ONLY ✅
Files:
- `js/features/bloodCollections/bloodCollectionsApi.js`
- `js/features/bloodCollections/bloodCollectionsUI.js`
- `pages/staff/bloodCollections.html`
- `js/entry/staff/bloodCollections.js`
- `assets/css/features/bloodCollections.css`
- `assets/css/pages/staff/bloodCollections.css`
- `routes.js`: `STAFF.BLOOD_COLLECTIONS`
- `sidebarItems.js`: "Blood Testing" in PRC_STAFF.general, between
  "Blood Drives" and "Blood Units"

requireRole: [PRC_STAFF] only. Data: GET /blood-collections/branch/:id.
Filter: Pending (default) vs Reviewed (Safe+Rejected). Disposed/Withdrawn
excluded — belongs to Blood Units, not this page.
Actions: Mark Safe, Reject only. QNS → Mark Safe disabled (not hidden),
backend (assertNotQns) is real enforcer. Reject needs reason, own modal
(not confirmModal — no input field). Detail = modal, GET /:id on demand,
carries fields not in list query (approved_by, rejected_at,
rejection_reason, notes).
Badge classes: .status-badge--pending/--safe/--rejected.
Mark Safe confirm: `confirmModal(msg, 'Mark Safe', 'Cancel', false)` —
danger=false, non-destructive action.

Backend fix required: `bloodCollectionModel.js` getCollectionsByBranch()
was missing is_qns, qns_reason, notes, created_at, donor_id,
collected_by_first/last — added.

---

### Blood Units (Main Inventory) — Staff ONLY ✅
Files:
- `js/features/bloodUnits/bloodUnitsApi.js` — also exports `separateUnit()`,
  shared with Blood Separation page (feature-to-feature reuse)
- `js/features/bloodUnits/bloodUnitsUI.js`
- `pages/staff/bloodUnits.html`
- `js/entry/staff/bloodUnits.js`
- `assets/css/features/bloodUnits.css`
- `assets/css/pages/staff/bloodUnits.css`

requireRole: [PRC_STAFF] only. Data: GET /blood-units/branch/:id (all
statuses). No filter dropdown, flat list. Terminal statuses (Released,
Disposed, Withdrawn, Expired, Separated) hide all actions — check status
string only, no date math (backend computes Expired server-side).
Actions: Dispose, Withdraw only — both require reason via modal. Separate
lives on its own page (Blood Separation, below), not here.
Detail modal: GET /:id on demand.
Badge classes: --available/--reserved/--released/--disposed/--withdrawn/
--expired/--separated.

Backend fixes required before build:
- `bloodUnitModel.js`: added getUnitsByBranchAll() (old getUnitsByBranch
  was Available-only, FEFO use case); getAllUnits/getUnitById/
  getUnitsByBranchAll all compute status='Expired' via SQL CASE for
  past-expiry Available units.
- `bloodUnitController.js`: branch ownership check for Staff (403 if
  branch_id in URL mismatches JWT branch_id); GET / auto-scopes Staff to
  own branch via getUnitsByBranchAll.
- `bloodUnitRules.js`: assertNotTerminal now also checks expiration_date
  (previously only checked status column — expired-but-Available units
  could still accept status updates).

---

### Inventory Cleaning — Staff ONLY ✅
Files:
- `js/features/inventoryCleaning/inventoryCleaningApi.js` — imports
  getUnitsByBranch + updateUnitStatus from bloodUnitsApi.js, no duplicate
  fetch calls
- `js/features/inventoryCleaning/inventoryCleaningUI.js`
- `pages/staff/inventoryCleaning.html`
- `js/entry/staff/inventoryCleaning.js`
- `assets/css/features/inventoryCleaning.css`
- `assets/css/pages/staff/inventoryCleaning.css`
- `routes.js`: `STAFF.INVENTORY_CLEANING`
- `sidebarItems.js`: "Inventory Cleaning" in PRC_STAFF.general, between
  "Blood Units" and "Blood Requests"

requireRole: [PRC_STAFF] only. Data: GET /blood-units/branch/:id (reused).
Rows shown: only status='Expired' or 'Available' (terminal rows excluded —
belongs to Blood Units history, not this page). Sort: expired-first,
satisfied server-side (getUnitsByBranchAll orders by expiration_date ASC).
Selection: ONLY Expired rows checkable — near-expiry is visual-only
(orange), never actionable, per bloodsync.md #7. Select-all only touches
expired rows.
Bulk removal: loops PATCH /:id/status per unit (no bulk endpoint exists) —
NOT atomic, toast reports succeeded/failed counts separately.
Confirm modal: lists every selected unit, requires reason (pre-filled,
editable), requires typing "remove" (case-insensitive exact match) —
per bloodsync.md #11.
Row highlight: row-highlight--expired is red (bloodsync.md #6), independent
of .status-badge--expired (purple, reused from bloodUnits.css) — two
different signals, not a mismatch.
New class: .status-badge--near-expiry.

Backend fix required: `bloodUnitModel.js` — added `near_expiry` boolean
via SQL CASE to getAllUnits/getUnitById/getUnitsByBranchAll (NOT
getUnitsByBranch, FEFO-only). Thresholds from
`inventoryRulesConstant.js` NEAR_EXPIRY_DAYS (Whole Blood: 7d, PRBC: 7d,
Platelets: 2d, FFP: 30d), hardcoded in SQL with comment pointing back to
the JS constant (Postgres can't import JS).

Also fixed while reviewing backend for this feature (unrelated bug):
`cacheService.js` cache() middleware checked stale `body.status ===
'success'` instead of `body.success === true` — cache writes were
silently inert everywhere. Fixed; cache-hit shape now matches
responseHelper.success() exactly (incl. count for arrays).

---

### Blood Separation — Staff ONLY ✅
Files:
- `js/features/bloodUnits/bloodSeparationUI.js` — imports getUnitsByBranch +
  separateUnit from bloodUnitsApi.js, no new Api file
- `pages/staff/bloodSeparation.html`
- `js/entry/staff/bloodSeparation.js`
- `assets/css/features/bloodSeparation.css`
- `assets/css/pages/staff/bloodSeparation.css`
- `routes.js`: `STAFF.BLOOD_SEPARATION`
- `sidebarItems.js`: "Blood Separation" in PRC_STAFF.general, between
  "Inventory Cleaning" and "Blood Requests"

requireRole: [PRC_STAFF] only. Data: GET /blood-units/branch/:id (reused),
filtered client-side to component='Whole Blood' && status='Available'
(server-computed status, expired-but-DB-Available already excluded).
No status column on table — every row is implicitly Available Whole Blood.
Confirm: plain `confirmModal()` with "no going back" warning text — NOT
the typed-word pattern (that's scoped to Inventory Cleaning's bulk
removal per bloodsync.md #11; separation is single-unit, not bulk).
On success: result modal lists the 3 derived collections (component +
computed expiration). Display fields (donor, blood type, barcode) for
summary/result sourced from the unit row already held client-side —
POST /:id/separate response (`separated_unit`, `derived_collections`) is
raw DB rows, no donor/branch name joins.

Backend: `bloodUnitService.js` updateUnitStatus() + separateUnit() were
NOT invalidating cache:blood-units:availability / :inventory on mutation
(only markAsSafe/unit-creation did). Fixed — both now call
invalidateCache() for both keys after mutation succeeds (after COMMIT for
separateUnit, so rollback never invalidates).

Contract.md gap fixed (docs only, not code): POST /:id/separate wasn't
documented as its own endpoint; blood_collections.source_unit_id
(nullable FK back to the source whole blood unit, set only by this
endpoint) existed in the model but wasn't documented. Both added.

Shared component change made during this build (affects other features):
- `modal.js` — `confirmModal(message, confirmLabel, cancelLabel, danger)` —
  4th param, default true (btn-danger). false → btn-primary. Default
  preserves every prior caller's appearance.
- `bloodCollectionsUI.js` handleMarkSafe() updated to pass danger=false
  (only call site changed).

DRY fix made during this build:
`.modal-field-label` / `.modal-textarea` / `.detail-list` were duplicated
identically in `features/bloodUnits.css` and `features/bloodCollections.css`.
Moved to `main.css` under "Shared modal field patterns"; removed from both
feature files. `features/bloodSeparation.css` never needed them — only
adds a `.modal-body ul` rule for the result list.

---

### Notifications — All 5 roles ✅
Files:
- `js/features/notifications/notificationsApi.js`
- `js/features/notifications/notificationsUI.js` — exports
  `renderNotificationsList()`, `initMarkAllRead()`, and `updateBadge()`/
  `refreshBadge()` (the badge functions are reused by every other entry
  file in the app, not just this page)
- `js/entry/shared/notifications.js` — one shared entry file for all 5
  roles (new `entry/shared/` folder — first feature to use it, see
  Permanent Rules)
- `pages/[role]/notifications.html` × 5 — byte-identical, all point to
  the shared entry file
- `assets/css/features/notifications.css`
- `main.css`: added `.page-header--with-action` modifier (title + button
  header layout) — additive only, does NOT touch the two existing files
  that override `.page-header` directly (still open, see Not Started)

Data: GET /api/notifications (own notifications, server-scoped), GET
/unread-count, PATCH /:id/read, PATCH /read-all. Display-only — no
click-to-navigate (reference_id/reference_type exist on the record but
their target pages — Blood Requests, My Drive — don't exist yet; revisit
once those are built). Unknown notification types fall back to a generic
label rather than breaking the render (relevant since
DONOR_POST_EXTRACTION will likely never actually appear in this list —
donors have no login/frontend, so that notification type is email-only,
see notificationService.js).

Badge wiring (Step B, same session): every existing entry file across
all roles/pages updated to call `refreshBadge()` immediately after
`revealAppShell()`. Full list: all 5 dashboards, Blood Drives, Blood
Drive Create, Settings (admin/staff), Donors, all 4 Field Workflow pages,
Blood Testing, Blood Units, Inventory Cleaning, Blood Separation.

No sidebar entry for Notifications on any role — reached via the navbar
bell/link only, which already existed from Phase 1. `sidebarItems.js`
and `routes.js` needed no changes — routes already existed for all 5
roles from earlier scaffolding.

---

## Not Started
- [ ] Blood Requests + real-time socket — requestor submit page, requestor
      "my requests" with live status, staff/admin management page, socket
      `blood_request_new`/`blood_request_status` → badge increment + row
      updates. Backend confirmed ready (branch-scoping fixed this
      session) — see gochas.md #42 and Contract.md's Blood Request
      Endpoints section for the full up-to-date shape.
- [ ] Reports — aggregate data display, read-only, build last
- [ ] Drive pages — `pages/volunteer/drive.html` +
      `pages/phlebotomist/drive.html`, "My Assignment" view
- [ ] User guide / help page — before UAT
- [ ] Requestor self-profile endpoint — backend not scoped yet
- [ ] Vol/Phleb Settings frontend — backend ready, frontend not built
- [ ] Requestor Settings frontend — backend partial (password change only)
- [ ] CSS cleanup: `.page-header` overridden directly in
      `staff/bloodUnits.css` and `staff/bloodCollections.css` (same
      anti-pattern as old .btn-primary bug). The proper fix —
      `.page-header--with-action` modifier class — now EXISTS in
      main.css (added this session for Notifications) and should be used
      by any new page needing this layout. The two existing files
      themselves are still unconverted; that conversion is still a
      separate, not-yet-done cleanup pass.

---

## Reference — stable, rarely changes

**SessionStorage chain (4-step field workflow):**