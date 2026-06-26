# BloodSync Frontend — Session State

## Status
Phase 2 in progress — Dashboards complete, Blood Drives complete (admin),
Settings complete (admin/staff), Donors feature complete (admin),
Field workflow: ALL 5 STEPS COMPLETE.
Next: Blood Units.

## Current Phase
Phase 2 — Features / Web

## Current Task
- Blood Units page (Admin + PRC Staff)
- After Blood Units: Blood Requests, Notifications

---

## DEVELOPMENT APPROACH — ADMIN FIRST (CONFIRMED THIS SESSION)

All features are built and validated on the Admin role before being
replicated for other roles (PRC Staff, Volunteer, Phlebotomist, Requestor).

Rationale: avoids rebuilding the same thing multiple times for bugs found
late. Validate logic once on Admin, then replicate to other roles cleanly.

The field workflow pages (/pages/field/) are an exception — they are shared
by ALL roles (Admin, PRC Staff, Volunteer, Phlebotomist) from day one because
the backend does not restrict by role label, only by active drive assignment
for field roles.

---

## PENDING FEATURES (backlog — not blocking current work)
- User guide / help page — needed before UAT. Build once all Phase 2 features stable.
- Requestor self-profile endpoint — backend not scoped yet, backlog.
- Volunteer/Phlebotomist Settings frontend UI — backend ready, frontend not built.
- Requestor Settings frontend UI — backend partial (password change only).
- Staff/Admin/Volunteer/Phlebotomist per-role pages for all features (replicate after admin validated).

---

## Phase 1 — Core Wiring (COMPLETE ✅)

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
- [x] `js/core/auth.js` — login(), logout(), getCurrentUser(), redirectByRole(), getDashboardHref()
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
- [x] `js/components/modal.js` — openModal(), closeModal(), confirmModal()
- [x] `js/components/skeleton.js` — showSkeleton(), hideSkeleton()
- [x] `js/components/errorBoundary.js` — showErrorBoundary(), clearErrorBoundary()
- [x] `js/components/infiniteScroll.js` — initInfiniteScroll(), destroyInfiniteScroll()
- [x] `js/components/search.js` — initSearch(), clearSearch()
- [x] `js/components/searchableDropdown.js` — initSearchableDropdown() — NEW THIS SESSION

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

- [x] Login with valid credentials → redirects to correct dashboard per role
- [x] Login with invalid credentials → shows error message, does not redirect
- [x] Already-logged-in user visiting index.html → redirected immediately
- [x] GET /api/auth/me returns first_name and last_name
- [x] Navbar renders correct nav items and full name on every page
- [x] Logout → cookies cleared, redirected to login
- [x] roleGuard — wrong role redirects to own dashboard, not login
- [x] authGuard — no cookies redirects to login
- [x] 404 page logged out → "Back to login" works
- [x] 404 page logged in → "Go to dashboard" works, correct role
- [x] Socket connects — [Socket] Connected visible in console
- [x] Toast, modal, skeleton, error boundary render correctly
- [x] Invalid credentials → inline error message shown
- ⏸ 401 auto-refresh — confirm naturally during Phase 2 (15 min token expiry)
- ⏸ Refresh token expired → clean redirect — confirm naturally during Phase 2

---

## Phase 2 — Features / Web (IN PROGRESS)

### Dashboards (COMPLETE ✅)
- [x] `pages/admin/dashboard.html` + `js/entry/admin/dashboard.js`
- [x] `pages/staff/dashboard.html` + `js/entry/staff/dashboard.js`
- [x] `pages/volunteer/dashboard.html` + `js/entry/volunteer/dashboard.js`
- [x] `pages/phlebotomist/dashboard.html` + `js/entry/phlebotomist/dashboard.js`
- [x] `pages/requestor/dashboard.html` + `js/entry/requestor/dashboard.js`
- [x] `assets/css/pages/[role]/dashboard.css` — all 5 roles

### Blood Drives — Admin + PRC Staff (COMPLETE ✅)
- [x] `pages/admin/bloodDrives.html` + `js/entry/admin/bloodDrives.js`
- [x] `pages/admin/bloodDriveCreate.html` + `js/entry/admin/bloodDriveCreate.js`
- [x] `pages/staff/bloodDrives.html` + `js/entry/staff/bloodDrives.js` (shares admin JS)
- [x] `pages/staff/bloodDriveCreate.html`
- [x] `js/features/bloodDrives/bloodDrivesApi.js`
- [x] `js/features/bloodDrives/bloodDrivesUI.js`
- [x] `js/features/bloodDrives/bloodDrivesValidation.js`
- [x] `assets/css/pages/admin/bloodDriveCreate.css`
- [x] `assets/css/pages/admin/bloodDrives.css`
- [x] `assets/css/features/bloodDrives.css`

#### Map Picker — ALL SECTIONS COMPLETE ✅
- Section A: Leaflet map, click to drop pin, coordinates saved to hidden inputs
- Section B: Nominatim reverse geocode on pin drop → auto-fills address fields.
  ALWAYS overwrites — map is source of truth, not "only if empty".
- Section C: Address search bar above map. Forward geocode → map flies to result
  → pin drops → address auto-fills. Search input does NOT clear after result.
- Section D: Expand button opens map in fullscreen modal. Two separate Leaflet
  instances (inline + modal) — Leaflet cannot be moved between DOM containers.
  Both stay in sync via shared hidden inputs. Closing modal pans inline map to pin.

#### Map Picker Implementation Details
- Nominatim reverse geocode priority: city_district > municipality > city > town > village > suburb
- Nominatim User-Agent: browser Referer header sent automatically — sufficient for thesis UAT
- CSP: server.js updated — unpkg.com in scriptSrc, styleSrc, imgSrc, connectSrc;
  nominatim.openstreetmap.org in connectSrc; *.tile.openstreetmap.org in imgSrc
- Drag marker on inline map → saves coords + reverse geocodes
- Drag marker on modal map → syncs to inline marker + saves + reverse geocodes
- Edit mode: marker pre-placed, no reverse geocode on open (address already known)

### Settings — Admin + PRC Staff (COMPLETE ✅)
- [x] `js/features/settings/settingsApi.js`
- [x] `js/features/settings/settingsValidation.js`
- [x] `js/features/settings/settingsUI.js`
- [x] `pages/admin/settings.html` + `js/entry/admin/settings.js`
- [x] `pages/staff/settings.html` + `js/entry/staff/settings.js`
- [x] `assets/css/features/settings.css`
- Password change: PATCH /api/auth/me/password (works for ALL roles)
- Profile photo: PATCH /api/users/me/profile-img (Admin + PRC Staff only → staff_profiles table)

### Donors — Admin (COMPLETE ✅)
- [x] `js/features/donors/donorsApi.js`
- [x] `js/features/donors/donorsValidation.js`
- [x] `js/features/donors/donorsUI.js`
- [x] `pages/admin/donors.html`
- [x] `js/entry/admin/donors.js`
- [x] `assets/css/features/donors.css`
- [x] `assets/css/pages/admin/donors.css` (placeholder)

#### Donors Implementation Details
- Search-first flow: search bar before registration form
- Inline duplicate detection: last name + first name + birthdate (all three must match)
  OR government ID match. Debounced 600ms. Yellow warning banner + "View existing donor" button.
- Double-check confirmation modal on Register if duplicate warning is visible (bloodsync item 16)
- Age 18+ minimum enforced in donorsValidation.js
- Birthdate max = today set on modal open (create + edit)
- 409 from backend → "already registered, search for them" message
- donors.css uses raw hex values only — no CSS variables (main.css has none defined)
- PRC Staff page (pages/staff/donors.html + js/entry/staff/donors.js) NOT built yet — admin first

### Field Workflow Foundation (COMPLETE ✅)
- [x] `js/features/fieldWorkflow/fieldWorkflowApi.js`
- [x] `js/features/fieldWorkflow/fieldWorkflowValidation.js` — age 18+ added this session
- [x] `assets/css/features/fieldWorkflow.css` — includes searchableDropdown styles (.sd-*)
- [x] `js/components/searchableDropdown.js` — NEW reusable component

#### searchableDropdown.js — Component Details
Location: js/components/searchableDropdown.js
HTML structure required:
  <div class="sd-wrapper">
    <input id="X-input" type="text" class="form-input sd-input" />
    <ul   id="X-list"               class="sd-list"></ul>
  </div>

API: initSearchableDropdown({ inputId, listId, items, displayFn, subDisplayFn,
  filterFn, onSelect, placeholder, emptyMessage })
Returns: { setItems, selectByPredicate, clear, destroy }

Behaviour:
- Click input → list opens, shows all items
- Type → filters in real time (case-insensitive via filterFn)
- Click item → selected, list closes, onSelect fires
- Click outside → list closes, input cleared if no selection
- Escape → list closes
- Arrow keys → navigate list items
- mousedown on list items preventDefault() → prevents input blur before click

CSS: .sd-wrapper, .sd-list, .sd-item, .sd-item-primary, .sd-item-sub
     all in assets/css/features/fieldWorkflow.css

Used by: donorRegistration (search existing donor), donorInterview (select donor).
ALL remaining workflow pages (screening, donation, collection) must use this
component from day one — no plain <select> on any workflow page.

### Field Workflow Pages — Step 1: donorRegistration (COMPLETE ✅)
- [x] `pages/field/donorRegistration.html`
- [x] `js/entry/field/donorRegistration.js`

#### donorRegistration Implementation Details
- Roles: Volunteer, Phlebotomist, Admin, PRC Staff
- Sidebar: field roles → general/workflow/drive; Admin/Staff → general/management
- Search dropdown: loads ALL donors on page load, filters client-side via searchableDropdown
- Inline duplicate detection on form: blur on last_name, first_name, birthdate fields
  → debounced 400ms → search → exact match check → yellow warning inline
- Government ID field: separate duplicate check on blur → yellow warning inline
- On existing donor select: form read-only, contact update section shown,
  toast if donor has no email, proceed section shown
- On new registration: 409 → "already registered, search above" message
- Birthdate max = today set on page load
- Age 18+ enforced via fieldWorkflowValidation.validateDonorRegistration()
- Cross-page context: sessionStorage keys field_donor_id, field_donor_name

### Field Workflow Pages — Step 2: donorInterview (COMPLETE ✅)
- [x] `pages/field/donorInterview.html`
- [x] `js/entry/field/donorInterview.js`

#### donorInterview Implementation Details
- Roles: Volunteer, Phlebotomist, Admin, PRC Staff
- Sidebar: same conditional as donorRegistration (field vs admin/staff)
- Donor selector: searchableDropdown — loads all donors via apiFetch (NOT raw fetch)
  displayFn: "Last, First"; subDisplayFn: blood type · sex · birthdate
  filterFn: matches first+last name OR id_number
- SessionStorage restore: selectByPredicate by donor_id after dropdown init
- On donor select: fetch full donor via getDonorById, render info panel
- Existing interview check: if interviews found for this donor → prefer pending interview session and load form; if completed interview exists, show "already done", show proceed section, hide form.
- Questions loaded by sex via getQuestionsBySex(donor.sex)
- Answer values must be exactly "YES" or "NO" (uppercase) — backend rejects lowercase
- Submit: createInterview first, then submitAnswers with interview_id (NOT screening_id)
- 403 on submit: "not assigned to active drive" message (field roles only)
- SessionStorage set after success: field_interview_id, field_interview_donor_id

### Field Workflow Pages — Step 3: donorScreening (COMPLETE ✅)
- [x] `pages/field/donorScreening.html`
- [x] `js/entry/field/donorScreening.js`

#### donorScreening Implementation Details
- Roles: Volunteer, Phlebotomist, Admin, PRC Staff
- Sidebar: field roles → general/workflow/drive; Admin/Staff → general/management
- Donor selector: cross-references getAllInterviews() vs getAllScreenings() to show
  only donors with a completed interview but no screening yet
- hemoglobin_status: AUTO-COMPUTED from hemoglobin value + donor sex — never manually selected
  Male min 13.0 g/dL, Female min 12.5 g/dL, max 20.0 g/dL
- screening_result: AUTO-COMPUTED from hemoglobin_status — Allowed → Eligible, Not Allowed → Deferred
- blood_type_confirmed: REQUIRED (not optional) — pre-filled from donor's registered blood type
- Live preview: hemoglobin input fires _updateResultPreview() showing computed result inline
- Hemoglobin hint: shows correct min threshold for donor's sex
- If Deferred: backend creates deferral record automatically — frontend never does
- Existing screening check: shows already-done message + proceed section, hides form
- validateScreening updated: screening_result checked as auto-computed (not required presence),
  blood_type_confirmed now required
- 403 on submit: "not assigned to active drive" message
- SessionStorage set after success: field_screening_id, field_screening_donor_id
- SessionStorage cleared: field_interview_id, field_interview_donor_id

### Field Workflow Pages — Step 4: donorDonation (COMPLETE ✅)
- [x] `pages/field/donorDonation.html`
- [x] `js/entry/field/donorDonation.js`

#### donorDonation Implementation Details
- Roles: Volunteer, Phlebotomist, Admin, PRC Staff
- Sidebar: field roles → general/workflow/drive; Admin/Staff → general/management
- Donor selector: cross-references getAllScreenings() (Eligible only) vs getAllDonations()
  to show only donors with an Eligible screening but no donation yet
- Email guard: after donor select, checks fullDonor.email — if missing, shows warning
  banner with link back to Registration page, blocks form entirely. Double-checked on submit.
  Missing email shown in red in donor info panel.
- QNS warning: fires live when extraction_time > 15 min. Does NOT block submit —
  backend sets is_qns: true automatically. Warning hides if user edits back below 15.
- Performed By: shows logged-in user's name as read-only display. Not submitted in POST
  body — backend reads conducted_by from JWT.
- POST body: screening_id + extraction_time only
- Existing donation check: shows already-done message + proceed, hides form
- 403 on submit: "not assigned to active drive" message
- SessionStorage set after success: field_donation_id, field_donation_donor_id
- SessionStorage cleared: field_screening_id, field_screening_donor_id

### Field Workflow Pages — Step 5: donorCollection (COMPLETE ✅)
- [x] `pages/field/donorCollection.html`
- [x] `js/entry/field/donorCollection.js`

#### donorCollection Implementation Details
- Roles: Volunteer, Phlebotomist, Admin, PRC Staff
- Sidebar: field roles → general/workflow/drive; Admin/Staff → general/management
- Donor selector: cross-references getAllDonations() vs getAllCollections() to show
  only donors with a completed donation but no collection yet
- getAllCollections() is Admin/PRC Staff only — for field roles it returns 403,
  caught silently with .catch(() => []), giving empty set (no pre-filtering).
  Backend enforces uniqueness and rejects duplicates with a clear error.
- Blood type: pre-filled from screening record's blood_type_confirmed; falls back
  to donor.blood_type. Staff confirm before submitting.
- Component options: Whole Blood, Packed Red Blood Cells, Platelets, Fresh Frozen Plasma
- Volume: 50–600 mL (validated client and server side)
- No proceed link — last step. Shows "Register Another Donor" → Registration page.
- POST body: donation_id, blood_type, component, volume_ml
- SessionStorage cleared: field_donation_id, field_donation_donor_id
- SessionStorage writes: nothing (last step)

### Blood Units (NOT STARTED)
- [ ] Blood units list with status badges
- [ ] Separate action: Whole Blood + Available only
- [ ] Status update (Disposed, Withdrawn) — confirm modal required
- [ ] Terminal states (Released, Disposed, Withdrawn, Separated, Expired) — hide all actions
- [ ] QNS collections — hide Safe button

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
- [ ] `lib/api.ts` — apiFetch wrapper (Bearer token, 401 retry)
- [ ] `lib/auth.ts` — SecureStore token helpers
- [ ] `lib/socket.ts` — Socket.io with Bearer token
- [ ] `providers/AuthProvider.tsx`
- [ ] `providers/SocketProvider.tsx`
- [ ] `providers/NotificationProvider.tsx`
- [ ] Auth screens (login, register)
- [ ] OCR pre-fill for government ID scanning
- [ ] Requestor features (dashboard, submit request, my requests + live status)

---

## Phase 4 — Design Pass (not started)
- [ ] `assets/css/main.css` — full design tokens, typography, colors
- [ ] `.btn-primary` and `.btn-danger` currently identical (both #c00) — MUST give
      distinct visual identities. Danger = destructive/irreversible.
- [ ] All layout/component/feature CSS files — full design pass
- [ ] Responsive adjustments
- [ ] `js/core/socket.js` — remove or gate console.log behind DEBUG flag before deploy

---

## Decisions Made This Session

### Admin-First Development (CONFIRMED)
Every feature is built for Admin first, then replicated for other roles once
validated. This is the explicit project approach going forward. The field
workflow pages (/pages/field/) are the only exception — they are shared by
all roles from day one by design.

### Navbar + Sidebar Fixed Positioning (DONE — main.css)
#navbar: position fixed, top 0, height 52px, z-index 200
#sidebar: position fixed, top 52px (below navbar), bottom 0, overflow-y auto, z-index 100
.page-shell: padding-top 52px (clears navbar)
.page-content: margin-left 200px (clears sidebar), min-width 0
Scrolling the page content no longer scrolls the navbar or sidebar.

### searchableDropdown.js — Universal Donor Selector Pattern
All 5 field workflow pages use initSearchableDropdown from
js/components/searchableDropdown.js. No plain <select> on any workflow page.
The component loads all items once, filters client-side in real time.
mousedown preventDefault prevents blur-before-click race condition.
CSS classes: .sd-wrapper, .sd-list, .sd-item, .sd-item-primary, .sd-item-sub
all live in assets/css/features/fieldWorkflow.css.

### Map Auto-fill Overwrites (FIXED)
autofillField() previously only wrote if field was empty. Fixed: always
overwrites. Dropping a new pin always updates all four address fields to
match the new location. Map is source of truth.

### Field Workflow Role Access (CONFIRMED)
All 5 donor workflow pages accept: ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST,
ROLES.ADMIN, ROLES.PRC_STAFF.
Sidebar renders differently per role:
- Field roles (Vol/Phleb): general, workflow, drive sections
- Admin/Staff: general, management sections
Backend gate: field roles need active drive assignment (403 = no active drive).
Admin/Staff: no drive required, drive_id = null (walk-in), this is correct.

### fieldWorkflow CSS — No CSS Variables
fieldWorkflow.css (and all feature CSS) uses raw hex values only. main.css
has no CSS variable definitions. Using var(--color-*) silently falls back.
Rule: never use CSS variables in any feature CSS file until Phase 4 defines
them in main.css.

### Duplicate Detection Rules (bloodsync.md items 12-16)
Registration page inline detection:
- last_name + first_name + birthdate ALL must match (partial name alone = no warning)
- OR government ID exact match
- Debounced 400ms on blur
- Shows yellow warning with "View existing donor" button
- Double-check confirmation modal fires on Register button if warning is visible
- Age 18+ minimum in both donorsValidation.js AND fieldWorkflowValidation.js

### getCurrentUserSilent() — Login Page Auth Check Pattern
Login page must use getCurrentUserSilent() (raw fetch, no apiFetch) for the
already-logged-in check. Using getCurrentUser() (which uses apiFetch) causes:
401 → tryRefresh → 401 → apiFetch redirects to ROUTES.LOGIN → page reloads
→ init() runs again → infinite loop → 429 rate limit.
getCurrentUserSilent() is exported from auth.js and must ONLY be used in
loginPage.js. Every other page uses getCurrentUser() via authGuard normally.

### Field Workflow Donor Filtering — Cross-Reference Pattern
All workflow steps filter the donor dropdown client-side by cross-referencing
two API lists. Pattern per step:
- Interview:   getAllDonors() ∩ getAllInterviews() donors NOT yet interviewed
- Screening:   getAllDonors() ∩ getAllInterviews() donors WITH interview, NOT yet screened
- Donation:    getAllDonors() ∩ getAllScreenings(Eligible) donors NOT yet donated
- Collection:  getAllDonors() ∩ getAllDonations() donors NOT yet collected
Field roles: backend scopes GET /api/donor-interviews and GET /api/screenings
to their active drive automatically. Admin/Staff get all records (walk-in scope).
getAllCollections() is Admin/Staff only — field roles get 403, caught with
.catch(() => []) to give empty set. Backend rejects duplicate POSTs anyway.

### Contact Update Role Branching
PATCH /api/donors/:id/contact — Volunteer/Phlebotomist only
PATCH /api/donors/:id          — Admin/PRC Staff only
donorRegistration.js branches on role_id before calling updateDonorContact()
or updateDonorFull(). Sending the wrong endpoint for the role → 403 from backend.
updateDonorFull() lives in fieldWorkflowApi.js (not donorsApi.js) because it is
called from a field workflow entry file.

### Screening Auto-Computation
hemoglobin_status and screening_result are NEVER manually selected on the
screening page. Both are computed in donorScreening.js:
  hemoglobin_status = hgb in range for sex ? 'Allowed' : 'Not Allowed'
  screening_result  = hgbStatus === 'Allowed' ? 'Eligible' : 'Deferred'
Thresholds: Male 13.0–20.0, Female 12.5–20.0 g/dL.
validateScreening() updated to match: treats screening_result as auto-computed
(only validates it is a valid string if present), blood_type_confirmed required.

### SessionStorage Chain — Complete (All 5 Steps)
field_donor_id            set by donorRegistration, read + cleared by donorInterview
field_donor_name          set by donorRegistration, cleared by donorInterview
field_interview_id        set by donorInterview, read + cleared by donorScreening
field_interview_donor_id  set by donorInterview, read + cleared by donorScreening
field_screening_id        set by donorScreening, read + cleared by donorDonation
field_screening_donor_id  set by donorScreening, read + cleared by donorDonation
field_donation_id         set by donorDonation, read + cleared by donorCollection
field_donation_donor_id   set by donorDonation, read + cleared by donorCollection
Rule: each step clears the keys it consumed after successful submit.

---

## Files Created / Modified This Session

### New Files
- js/components/searchableDropdown.js — reusable donor selector component
- pages/field/donorScreening.html
- js/entry/field/donorScreening.js
- pages/field/donorDonation.html
- js/entry/field/donorDonation.js
- pages/field/donorCollection.html
- js/entry/field/donorCollection.js

### Modified Files
- assets/css/main.css — navbar/sidebar fixed positioning, page-shell/content offsets
- assets/css/features/fieldWorkflow.css — added .sd-* searchableDropdown styles
- assets/css/features/donors.css — replaced all CSS variables with raw hex
- js/features/donors/donorsUI.js — inline duplicate detection, double-check confirm,
  birthdate max on modal open (create + edit)
- js/features/donors/donorsValidation.js — age 18+ minimum added
- js/features/fieldWorkflow/fieldWorkflowValidation.js — age 18+ minimum added
- js/entry/field/donorRegistration.js — Admin/Staff roles added, sidebar conditional,
  birthdate max, replaced button-search with searchableDropdown
- pages/field/donorRegistration.html — replaced search bar + button with sd-wrapper structure
- js/entry/field/donorInterview.js — Admin/Staff roles added, sidebar conditional,
  raw fetch replaced with apiFetch, <select> replaced with searchableDropdown
- pages/field/donorInterview.html — replaced <select> with sd-wrapper structure
- js/entry/admin/bloodDriveCreate.js — map Sections B, C, D (reverse geocode,
  address search, expandable modal map)
- pages/admin/bloodDriveCreate.html — expand button + map search bar added
- assets/css/pages/admin/bloodDriveCreate.css — map search + modal styles
- server.js — CSP: unpkg.com added to imgSrc and connectSrc
- js/features/fieldWorkflow/fieldWorkflowApi.js
    — added getAllDonors() (GET /api/donors, used by interview/screening/donation/collection)
    — added updateDonorFull() (PATCH /api/donors/:id, used by Admin/Staff contact update)
- js/features/fieldWorkflow/fieldWorkflowValidation.js
    — validateScreening: screening_result now treated as auto-computed (not required input)
    — validateScreening: blood_type_confirmed now required (was optional)
- js/entry/field/donorRegistration.js
    — contact update now branches by role: field roles → updateDonorContact(),
      Admin/Staff → updateDonorFull(). Fixes 403 "Access denied" on contact update.
- js/entry/field/donorInterview.js
    — replaced raw apiFetch('/api/donors') call with getAllDonors() from fieldWorkflowApi.js.
      Fixes "apiFetch is not defined" error on interview page.
    — donor dropdown now filters: field roles see only uninterviewed donors in this drive
      (cross-references getAllInterviews() against getAllDonors()). Admin/Staff see all.
    — import updated: searchDonors replaced with getAllDonors, getAllInterviews added.
- js/core/auth.js
    — added getCurrentUserSilent(): raw fetch, no refresh, no redirect. Login page only.
- js/entry/loginPage.js
    — replaced getCurrentUser() with getCurrentUserSilent() for already-logged-in check.
      Fixes infinite redirect loop (401 → refresh → 401 → redirect → reload → repeat)
      that occurred after logout and hit 429 rate limit.
- backend/interviewQuestionRoutes.js
    — fixed route path: /gender/:sex → /sex/:sex to match FRONTEND_CONTRACT.md.
      Fixes 404 on GET /api/interview-questions/sex/Male.

---

## Architecture Decisions (Ongoing)

### Two Leaflet Instances Over One
Leaflet does not reliably support moving a map instance between DOM containers.
The expand modal uses a second separate Leaflet instance. Both sync via shared
hidden inputs. Correct architectural choice — do not attempt single-instance.

### apiFetch Over raw fetch — Everywhere
All API calls must use apiFetch() from js/core/api.js. Raw fetch() bypasses
the 401→refresh→retry flow. donorInterview.js had this bug — now fixed.
This rule applies to every file. The only exception is tryRefresh() inside
api.js itself (raw fetch to avoid infinite loop).

### SessionStorage for Cross-Page Context
Field workflow pages pass context between steps via sessionStorage:
- field_donor_id — set by donorRegistration, read by donorInterview
- field_donor_name — set by donorRegistration
- field_interview_id — set by donorInterview, read by donorScreening
- field_interview_donor_id — set by donorInterview
- field_screening_id — to be set by donorScreening, read by donorDonation
- field_donation_id — to be set by donorDonation, read by donorCollection
Clear each key after the next page reads it to avoid stale context.

### Serving Architecture
- Express serves frontend via express.static('../frontend')
- All non-API unmatched routes serve index.html (fallback)
- Local dev: http://localhost:3000 (npm run dev in backend/)
- Production: Railway — same deployment

### Helmet CSP (current complete state)
scriptSrc:  self, cdn.socket.io, unpkg.com
styleSrc:   self, unsafe-inline, unpkg.com
connectSrc: self, ws://localhost:3000, wss://localhost:3000,
            cdn.socket.io, nominatim.openstreetmap.org, unpkg.com
imgSrc:     self, data:, res.cloudinary.com, *.tile.openstreetmap.org, unpkg.com
fontSrc:    self
objectSrc:  none
upgradeInsecureRequests: removed (Railway handles HTTPS)