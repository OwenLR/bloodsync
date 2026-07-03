# BloodSync Frontend — Session State

## Status
Phase 2 in progress. Complete: Dashboards (all 5 roles), Blood Drives
(admin+staff), Settings (admin/staff), Donors (admin), Field Workflow
(4 steps), Blood Units/Inventory feature — all 4 sections (Testing, Units,
Cleaning, Separation), Staff only.
Not started: Blood Requests, Notifications, Reports, Vol/Phleb drive pages.

## Current Phase
Phase 2 — Features / Web

## Next Up
No section queued. Pick from "Not Started" list at bottom.

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
`css/pages/[role]/dashboard.css`.

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

### Settings — Admin + Staff ✅
### Donors — Admin ✅
### Field Workflow Foundation ✅
### Field Workflow — 4 Steps ✅ (Register → Interview → Screening → Donation & Collection)
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

## Not Started
- [ ] Blood Requests + real-time socket — requestor submit page, requestor
      "my requests" with live status, staff/admin management page, socket
      `blood_request_new` → badge increment + prepend row
- [ ] Notifications — list page (all roles), updateBadge() in
      notificationUI.js, mark read / mark all read
- [ ] Reports — aggregate data display, read-only, build last
- [ ] Drive pages — `pages/volunteer/drive.html` +
      `pages/phlebotomist/drive.html`, "My Assignment" view
- [ ] User guide / help page — before UAT
- [ ] Requestor self-profile endpoint — backend not scoped yet
- [ ] Vol/Phleb Settings frontend — backend ready, frontend not built
- [ ] Requestor Settings frontend — backend partial (password change only)
- [ ] CSS cleanup: `.page-header` overridden directly in
      `staff/bloodUnits.css` and `staff/bloodCollections.css` (same
      anti-pattern as old .btn-primary bug) — needs
      `.page-header--with-action` modifier class instead. Not replicated
      in inventoryCleaning.css or bloodSeparation.css.

---

## Reference — stable, rarely changes

**SessionStorage chain (4-step field workflow):**