# BloodSync Frontend — Session State

## Status
Phase 2 in progress — Dashboards complete, Blood Drives complete (admin),
Settings complete (admin/staff), Donors feature complete (admin),
Field workflow: ALL 4 STEPS COMPLETE (donation + collection merged).
Next: Blood Units (Staff + Admin view only).

## Current Phase
Phase 2 — Features / Web

## Current Task
- Blood Units page (PRC Staff + Admin view/manage only — no workflow)
- After Blood Units: Blood Requests, Notifications

---

## DEVELOPMENT APPROACH — STAFF FIRST FOR WORKFLOW (REVISED THIS SESSION)

Field workflow pages (/pages/field/) are shared by PRC Staff, Volunteer,
and Phlebotomist ONLY. Admin is explicitly excluded from all field workflow
pages. This was a deliberate architectural correction made this session.

Rationale: Admin has no fixed branch_id and is never physically present at
a blood drive. Admin-initiated donation records produce orphaned data
(null drive_id + wrong branch_id auto-assigned from last branch). Admin's
role is system management only — not blood donation workflow.

For non-workflow features (Blood Units, Blood Requests, Reports):
build and validate on Admin first, then replicate for Staff.

---

## ROLE RESPONSIBILITIES (FINAL — DO NOT CHANGE)

| Role | Blood Donation Workflow | Management Features |
|---|---|---|
| Admin | ❌ No access | ✅ Full — users, drives, inventory, reports |
| PRC Staff | ✅ Walk-in (no drive required) | ✅ Branch-scoped |
| Volunteer | ✅ Drive only (must be assigned) | ❌ No |
| Phlebotomist | ✅ Drive only (must be assigned) | ❌ No |

---

## PENDING FEATURES (backlog — not blocking current work)
- User guide / help page — needed before UAT. Build once all Phase 2 features stable.
- Requestor self-profile endpoint — backend not scoped yet, backlog.
- Volunteer/Phlebotomist Settings frontend UI — backend ready, frontend not built.
- Requestor Settings frontend UI — backend partial (password change only).
- Staff per-role pages for Blood Units, Blood Requests (replicate after admin validated).

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
- [x] `js/components/modal.js` — openModal(), closeModal(), confirmModal()
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
- [x] 401 auto-refresh — confirmed working (auth.js syntax error was the break, now fixed)
- [x] Refresh token expired → clean redirect — confirmed

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

### Settings — Admin + PRC Staff (COMPLETE ✅)
- [x] `js/features/settings/settingsApi.js`
- [x] `js/features/settings/settingsValidation.js`
- [x] `js/features/settings/settingsUI.js`
- [x] `pages/admin/settings.html` + `js/entry/admin/settings.js`
- [x] `pages/staff/settings.html` + `js/entry/staff/settings.js`
- [x] `assets/css/features/settings.css`

### Donors — Admin (COMPLETE ✅)
- [x] `js/features/donors/donorsApi.js`
- [x] `js/features/donors/donorsValidation.js`
- [x] `js/features/donors/donorsUI.js`
- [x] `pages/admin/donors.html`
- [x] `js/entry/admin/donors.js`
- [x] `assets/css/features/donors.css`

### Field Workflow Foundation (COMPLETE ✅)
- [x] `js/features/fieldWorkflow/fieldWorkflowApi.js`
- [x] `js/features/fieldWorkflow/fieldWorkflowValidation.js`
- [x] `assets/css/features/fieldWorkflow.css`
- [x] `js/components/searchableDropdown.js`

### Field Workflow Pages — 4-Step Flow (COMPLETE ✅)

Roles: PRC Staff, Volunteer, Phlebotomist ONLY.
Admin is explicitly excluded from all field workflow pages.

Step indicator is now 4 steps across all pages:
  Register → Interview → Screening → Donation & Collection

#### Step 1: donorRegistration (COMPLETE ✅)
- [x] `pages/field/donorRegistration.html`
- [x] `js/entry/field/donorRegistration.js`

Key details:
- requireRole: [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF] — Admin excluded
- Search-first flow with searchableDropdown
- Deferred donor badge in dropdown (⚠ Deferred at interview/screening · date)
- Deferred donor block notice (#donor-deferred-notice) on select
- Inline duplicate detection: name+birthdate OR government ID
- Contact update branches by role: Vol/Phleb → PATCH /api/donors/:id/contact,
  Staff → PATCH /api/donors/:id
- "Register Another Donor" button resets form and sessionStorage
- Birthdate max = today, age 18+ enforced

#### Step 2: donorInterview (COMPLETE ✅)
- [x] `pages/field/donorInterview.html`
- [x] `js/entry/field/donorInterview.js`

Key details:
- requireRole: [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF] — Admin excluded
- Deferred donors excluded from dropdown for field roles; Staff sees all
- Live per-question deferral warnings during answering
- After submit: re-fetches interview to check interview_result
- If deferred: shows #interview-deferred-notice, hides proceed button
- If passed: shows proceed to screening
- #interview-deferred-notice element in HTML required

#### Step 3: donorScreening (COMPLETE ✅)
- [x] `pages/field/donorScreening.html`
- [x] `js/entry/field/donorScreening.js`

Key details:
- requireRole: [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF] — Admin excluded
- Excludes interview-deferred donors from dropdown
- hemoglobin_status and screening_result are AUTO-COMPUTED, never manually selected
- blood_type_confirmed required

#### Step 4: donorDonation (COMPLETE ✅) — combined with collection
- [x] `pages/field/donorDonation.html`
- [x] `js/entry/field/donorDonation.js`

RETIRED (DELETE FROM PROJECT):
- `pages/field/donorCollection.html` — merged into donorDonation.html
- `js/entry/field/donorCollection.js` — merged into donorDonation.js

Key details:
- requireRole: [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF] — Admin excluded
- Single page handles both extraction (POST /api/donations) and
  collection (POST /api/blood-collections) sequentially
- Phlebotomist: searchableDropdown (not a <select>)
  Field roles: phlebotomists assigned to their active drive
  Staff: all active phlebotomists (GET /api/volunteers/available?role=6)
  Logged-in Phlebotomist auto-selected if in list
  Hidden input #input-phlebotomist stores selected user_id
- Component defaults to "Whole Blood", volume defaults to 450 mL (editable)
- Extraction time: whole minutes only (step="1", Math.round on submit)
- QNS warning fires live when extraction > 15 min, still allows submit
- Branch routing is server-side only — no branch selector on this page:
  Staff: req.user.branch_id from JWT
  Vol/Phleb: drive's branch_id via bloodDriveMiddleware
- Backend: phlebotomist_id column added to donations table (migration required)
  donationModel.js and donationService.js updated to accept phlebotomist_id
  Drive-assignment validation for phlebotomist when drive is active

### Backend Changes — Field Workflow (COMPLETE ✅)
- [x] `donations` table: `phlebotomist_id` column added (FK to users, nullable)
      Migration: `ALTER TABLE donations ADD COLUMN phlebotomist_id integer REFERENCES users(user_id);`
- [x] `repositories/donationModel.js` — phlebotomist_id in INSERT + all SELECTs
- [x] `services/donationService.js` — phlebotomist_id validation + QNS detection fixed
- [x] `middleware/authMiddleware.js` — response shape fixed to { success: false }
- [x] `js/core/auth.js` — syntax error fixed (duplicate line in getCurrentUserSilent)

### Blood Units (NOT STARTED)
- [ ] Blood units list with status badges
- [ ] Separate action: Whole Blood + Available only
- [ ] Status update (Disposed, Withdrawn) — confirm modal required
- [ ] Terminal states — hide all action buttons
- [ ] Inventory cleaning view

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