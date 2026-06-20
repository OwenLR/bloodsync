# BloodSync Frontend — Session State

## Status
Phase 2 in progress — Dashboards complete, Blood Drives complete, Settings
(Admin/PRC Staff) backend complete, frontend not yet built.

## Current Phase
Phase 2 — Features / Web

## Current Task
- Update sidebarItems.js — Donors collapsible group for Admin/Staff (Option B)
- Then: donorScreening, donorDonation, donorCollection pages

### Backend endpoints added this session:

GET /api/volunteers/available (for blood drive participant panel)
PATCH /api/auth/me/password (self-service password change, ALL roles)
PATCH /api/users/me/profile-img (Admin + PRC Staff profile photo, NEW staff_profiles table)

## PENDING FEATURES
- User guide / help page — not optional given real UAT users (PRC staff,
volunteers, phlebotomists unfamiliar with the system). At minimum, a
basic /pages/help.html with role-specific workflow steps should exist
before UAT ends. Build once core Phase 2 features are stable.
- Requestor self-profile endpoint (no photo, no contact update currently
possible for Requestor role) — backend work, not yet scoped but high possibility.
- Volunteer/Phlebotomist/Requestor Settings frontend UI — backend mostly
ready (see Settings Feature section above), frontend not built. Lower
priority than Admin/Staff Settings and Donors.

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
- [x] `js/constants/navItems.js` — NAV_ITEMS (imports from roles + routes)
- [x] `js/constants/sidebarItems.js` — SIDEBAR_DEFINITIONS, getSidebarItems(), getSidebarSections()

### Core
- [x] `js/core/api.js` — apiFetch wrapper
- [x] `js/core/auth.js` — login(), logout(), getCurrentUser(), redirectByRole()
- [x] `js/core/utils.js` — pure utility functions only
- [x] `js/core/socket.js` — Socket.io init, socket instance export
- [x] `js/core/formPersist.js` — saveForm(), restoreForm(), clearForm()
- [x] `js/core/guards/authGuard.js` — requireAuth()
- [x] `js/core/guards/roleGuard.js` — requireRole()

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

### Pages
- [x] `index.html` — login page
- [x] `pages/404.html` — custom not found page

### Entry Files
- [x] `js/entry/loginPage.js`
- [x] `js/entry/notFoundPage.js`

### CSS
- [x] `assets/css/main.css` — global reset, shared buttons, form elements, all component styles, navbar, sidebar
- [x] `assets/css/pages/login.css` — login page layout only
- [x] `assets/css/pages/404.css` — 404 page layout only

### Backend changes made during Phase 1
- [x] `authController.js` — me() now does a DB lookup via userModel.getUserById()
      to include first_name and last_name in GET /api/auth/me response
- [x] `utils/responseHelper.js` — fixed response shape from `status:'success'` to `success:true`
      This was a critical bug — all API responses were returning the wrong shape

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
- [x] `assets/css/pages/admin/dashboard.css` (and all role variants)

### Blood Drives (COMPLETE ✅)
- [x] pages/admin/bloodDrives.html + js/entry/admin/bloodDrives.js
- [x] pages/staff/bloodDrives.html + js/entry/staff/bloodDrives.js
- [x]  pages/admin/bloodDriveCreate.html + js/entry/admin/bloodDriveCreate.js
- [x]  pages/staff/bloodDriveCreate.html + js/entry/staff/bloodDriveCreate.js
- [x]  js/features/bloodDrives/bloodDrivesApi.js
- [x]  js/features/bloodDrives/bloodDrivesUI.js
- [x]  js/features/bloodDrives/bloodDrivesValidation.js
- [x]  assets/css/pages/admin/bloodDrives.css
- [x]  assets/css/pages/admin/bloodDriveCreate.css
- [x]  assets/css/pages/staff/bloodDrives.css
- [x]  assets/css/pages/staff/bloodDriveCreate.css
- [x]  assets/css/features/bloodDrives.css


NOTE: All file names use camelCase, not kebab-case (renamed mid-session —
see "Naming Rules" decision below). If any older session summary or chat
referenced kebab-case names like blood-drives.html, those are stale —
the camelCase versions above are current.

Known implementation detail: bloodDrivesUI.js participant panel includes
auto-assign by count (fills from getAvailableVolunteers() results, filtered
by role + municipality). Cancel modal requires a cancellation_reason
(validated client-side via bloodDrivesValidation.js before submit).


### Blood Drives — Design Decisions (old) - (made before creation of blood drives)
- List page: table with Name, Branch, Location (city/province), Date range, Slots, Status badge, Actions
- Actions per row: View Participants (side panel), Edit, Cancel
- Create page: separate page with formPersist (not a modal)
  Reason: user can navigate away mid-form and return without losing input
- Participant panel: side panel (not modal, not separate page)
  Shows available volunteers/phlebotomists with name, role, municipality
  Filters by address_municipality matching drive city
  Count-based auto-assign: staff sets number, system picks nearest N and calls POST for each
  Backend endpoint: GET /api/volunteers/available?role=5&municipality=Batangas City
- Create form field groups:
  Basic Info: name, description, branch_id (dropdown), start_datetime, end_datetime, slots_available
  Venue: venue_name, venue_type (dropdown), building, floor_room, street_address, city, province, postal_code
  Contact: contact_person, contact_number, contact_email

### Settings Feature — Admin + PRC Staff (BACKEND COMPLETE ✅ — FRONTEND NOT STARTED)

Backend complete this session:

 Migration: staff_profiles table (user_id FK unique, profile_img, timestamps)
 authValidator.js — NEW file — validateChangePassword()
 authService.js — changePassword() added (shared by ALL roles, not staff-only)
 authController.js — changePassword controller added
 authRoutes.js — PATCH /me/password added
 userModel.js — getUserCredentialsById(), updatePassword(),
getStaffProfileByUserId(), upsertStaffProfileImg() added
 userService.js — updateOwnProfileImg() added (Cloudinary + staff_profiles upsert)
 userController.js — updateMyProfileImg added
 userRoutes.js — PATCH /me/profile-img added (registered BEFORE /:id —
route shadowing risk, same pattern as GET /api/volunteers/available)

### Frontend Settings — Admin + PRC Staff (COMPLETE ✅)


 js/features/settings/settingsApi.js
 js/features/settings/settingsValidation.js
 js/features/settings/settingsUI.js
 pages/admin/settings.html + js/entry/admin/settings.js
 pages/staff/settings.html + js/entry/staff/settings.js
 assets/css/features/settings.css
 assets/css/pages/admin/settings.css (placeholder)
 assets/css/pages/staff/settings.css (placeholder)


### Settings page scope (CONFIRMED):

Password change — calls PATCH /api/auth/me/password (works for ANY role,
not just Admin/Staff, since it lives in auth not users)
Profile photo upload — calls PATCH /api/users/me/profile-img
(Admin + PRC Staff ONLY — writes to staff_profiles, multipart/form-data,
same file constraints as elsewhere: jpeg/png/jpg/pdf, 5MB max via
uploadMiddleware.js)
NOT in scope yet: system configuration settings (would be Admin-only,
lower priority, undefined scope — revisit only if requested)


### Settings for OTHER roles — explicitly backlogged, not blocking:

Volunteer/Phlebotomist: profile photo already possible via existing
PATCH /api/volunteers/me/profile (writes to volunteer_profiles.profile_img).
Password change now ALSO possible via the new shared
PATCH /api/auth/me/password — no additional backend work needed for them.
Frontend Settings UI for these roles is NOT built yet — only Admin/Staff
Settings UI is being built this round.
Requestor: NO self-profile endpoint of any kind exists yet (no photo, no
contact info update). Password change IS available via the shared
PATCH /api/auth/me/password. Full requestor self-service profile is
backend work not yet scoped — backlog item, not urgent.

### Known architectural decision from this work: 
password change was DELIBERATELY NOT placed under /api/users (which is Admin-only management of
OTHER users' accounts) — it lives under /api/auth/me/password instead,
shared by every authenticated role, since password verification/hashing
logic doesn't depend on role_id. Profile photo upload IS role-specific
(different DB table per role-group: staff_profiles vs volunteer_profiles)
so that legitimately stays split by role under /api/users and
/api/volunteers respectively.

### Donors (NOT STARTED — next task)
See "Current Task" section above.
- [ ] Admin/Staff donor list page
- [ ] Donor registration page (Admin/Staff/Volunteer/Phlebotomist)

### Donor Workflow (not started)
Pages under /pages/field/ — both Volunteer and Phlebotomist can access all steps.
 pages/field/donorRegistration.html + js/entry/field/donorRegistration.js
 pages/field/donorInterview.html + js/entry/field/donorInterview.js
 pages/field/donorScreening.html + js/entry/field/donorScreening.js
 pages/field/donorDonation.html + js/entry/field/donorDonation.js
 pages/field/donorCollection.html + js/entry/field/donorCollection.js

### Blood Units (not started)
- [ ] Blood units list with status badges
- [ ] Separate action for Whole Blood + Available units
- [ ] Status update (Disposed, Withdrawn)

### Blood Requests + real-time socket (not started)
- [ ] Requestor submit request page
- [ ] Requestor my requests page with live status
- [ ] Staff/Admin blood requests management page
- [ ] Socket: blood_request_new → increment badge, prepend row

### Notifications (not started)
- [ ] Notification list page (all roles)
- [ ] updateBadge() in notificationUI.js
- [ ] Mark read / mark all read

### Reports (not started)
- [ ] Aggregate data display (read-only, build last)

### Drive pages — Volunteer + Phlebotomist (not started)
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
- [ ] `.btn-primary` and `.btn-danger` currently identical (both #c00) — MUST give distinct
      visual identities in Phase 4. Danger = destructive/irreversible, must not look like primary action.
- [ ] `assets/css/layouts/navbar.css`
- [ ] `assets/css/layouts/sidebar.css`
- [ ] `assets/css/components/toast.css`
- [ ] `assets/css/components/modal.css`
- [ ] `assets/css/components/skeleton.css`
- [ ] `assets/css/components/errorBoundary.css`
- [ ] `assets/css/components/feedback.css`
- [ ] `assets/css/components/search.css`
- [ ] `assets/css/pages/login.css` — full design
- [ ] `assets/css/pages/404.css` — full design
- [ ] `assets/css/features/` — per feature styles
- [ ] Responsive adjustments
- [ ] `js/core/socket.js` — remove or gate console.log statements behind DEBUG flag before deployment

---
## Design pagg
.btn-primary and .btn-danger currently identical (#c00) — MUST give distinct
visual identities. Danger = destructive, must not look like primary action.
Skeleton flash on navigation: acceptable at Phase 2. Phase 4 CSS transitions
will smooth the skeleton→content swap. Also improves on Railway vs localhost.
Remove or gate console.log in socket.js behind DEBUG flag before deploy.
---

## Known Issues
Loop on dashboard redirect when dashboard page doesn't exist — expected,
resolves as pages are built
401 auto-refresh and refresh token expiry not yet confirmed — test naturally
during Phase 2
Skeleton flash on page navigation: visible on localhost, acceptable, will
improve on Railway and with Phase 4 CSS transitions
Blood Drive entry files still use old section name in renderSidebar calls —
FIXED this session ('operations' → 'general')
- sidebarItems.js not yet updated for Admin/Staff Donors collapsible group
- donorScreening, donorDonation, donorCollection pages not yet built

---

## Decisions Made

### Architecture
- Vanilla JS for web — no React (real-time handled via Socket.io + DOM)
- React Native for mobile (requestors only)
- Functionality first, design last — no design CSS until Phase 4
- No duplicate filenames across the project regardless of folder depth
sessionStorage user cache (auth.js)
- getCurrentUser() now checks: in-memory → sessionStorage 'bs_user' → network.
On login, user is written to sessionStorage. On logout, cleared.
Eliminates GET /api/auth/me network round-trip on every page navigation —
was the primary cause of the navbar/sidebar flash between pages.
Security note: stored object is display data only (name, role_id, branch_id).
Tokens are never in sessionStorage. httpOnly cookie is still the security layer.
Known tradeoff: if an admin changes a user's role mid-session, the cached
object won't reflect it until the tab closes. Acceptable for thesis UAT.

- Brand link fix (navbar.js)
brandLink.href now calls getDashboardHref(user.role_id) instead of '/'.
Clicking BloodSync goes directly to the correct dashboard — eliminates the
index.html → loginPage.js → redirectByRole() two-hop that caused a visible flash.

- App shell reveal pattern (appShell.js + main.css)
Every protected page <body> starts with class="app-loading". Entry files call
revealAppShell() immediately after renderNavbar() + renderSidebar() complete.
CSS keeps #navbar, #sidebar, .page-content as visibility:hidden (not
display:none — avoids layout shift) under app-loading. Swap to app-ready
makes them visible. Applied to all dashboard and settings pages this session.
Blood Drives pages already had this pattern from a previous session.

- Sidebar restructure
Section name 'operations' renamed to 'general' across all roles
Dashboard added as first item in every role's 'general' section
Volunteer and Phlebotomist now have identical sidebar structure —
both see all 5 donor workflow steps (Register, Interview, Screening,
Donation, Collection) under a collapsible 'Blood Drive Workflow' group
REASON: backend bloodDriveMiddleware gates on active drive assignment,
not on role label. Either role can perform any workflow step. Sidebar
restriction would artificially block cooperation between field staff.
sidebar.js extended to support group items: { label, group: true, children: [] }
Rendered as <details>/<summary>, open by default.

- FIELD shared routes
New ROUTES.FIELD section added to routes.js for the 5 donor workflow pages.
Pages live under /pages/field/ (not /pages/volunteer/ or /pages/phlebotomist/)
to reflect that both roles share them equally.
Old per-role workflow routes (VOLUNTEER.REGISTER, VOLUNTEER.INTERVIEW,
PHLEBOTOMIST.SCREENING etc.) removed — no longer needed.

- Admin/Staff Donors sidebar: collapsible group (Option B) — Donor List +
  all 5 field workflow steps under one Donors group. Same routes as field
  roles (ROUTES.FIELD.*) — Admin/Staff can also perform walk-in donor
  workflow outside of a blood drive (drive_id = NULL for them).
- fieldWorkflow CSS uses raw hex values only — no CSS variables, matches
  main.css which has no CSS variable definitions.
- SessionStorage used for cross-page donor context passing in field
  workflow — field_donor_id, field_donor_name, field_interview_id,
  field_interview_donor_id.

### File Naming Convention (decided this session)
ALL file names use camelCase — including HTML and CSS files, not just JS.
This was a correction mid-session: Blood Drives feature files were
originally created kebab-case (blood-drives.html, blood-drive-create.css)
and were renamed to camelCase (bloodDrives.html, bloodDriveCreate.css)
partway through. Every reference (routes.js, <link>/<script> tags inside
HTML files, entry file imports) was updated to match at the same time.
Going forward: every new file (HTML, CSS, JS — no exceptions) must be
camelCase from the start. Folder names under pages/ and assets/css/pages/
(admin, staff, volunteer, phlebotomist, requestor) stay lowercase — those
are role names, not "files" in the naming-rule sense.

### Navigation Architecture
Navbar is identity-only: brand/logo, current user's display name,
notifications link + badge, logout button. NO feature/page navigation
links in the navbar.
Sidebar is the single source of page navigation for the entire app —
every navigable page lives in constants/sidebarItems.js and nowhere else.
Reason: original navbar (NAV_ITEMS) and sidebar both listed the same
pages — redundant, two click-paths to the same destination, would worsen
as more pages were added in Phase 2.
constants/navItems.js DELETED — only consumer was navbar.js, which no
longer renders a nav-links list.
Contextual/in-page actions (e.g. "+ New Drive" button, row-level
Edit/Cancel/Participants buttons) stay inline within the page — never
added to the sidebar. Sidebar only ever lists pages, not actions.

### Folder Structure
- `js/entry/` organized in role subfolders: admin/, staff/, volunteer/, phlebotomist/, requestor/
  loginPage.js and notFoundPage.js stay at js/entry/ root (not role-specific)
- Entry files in role subfolders use ../../ to reach core/, layouts/, constants/
- `js/constants/` — one file per concern, all frozen with Object.freeze()
- `js/core/guards/` — auth and role guards separate files
- `js/core/formPersist.js` — client-state persistence (sessionStorage), lives in core/ not components/
- `js/components/` — reusable UI components with DOM rendering responsibility
- `js/layouts/` — navbar and sidebar renderers
- `js/features/` — feature-folder pattern: featureApi.js + featureUI.js + featureValidation.js
- `assets/css/` mirrors JS folder structure

### Page Loading Pattern

Every protected page entry file follows this fixed order: requireAuth() →
requireRole() → renderNavbar(user, 0) → clearSidebar()/renderSidebar() →
showSkeleton() on content area → fetch feature data → hideSkeleton() + render.
Non-critical data (unread notification count, profile images) never blocks
shell render — navbar renders with unreadCount=0 immediately; once
notificationApi.js exists, getUnreadCount().then(count => updateBadge(count))
updates it afterward without blocking anything.
Full pattern documented in FRONTEND_AI_RULES.md under "Required Page Loading
Order — Every Protected Page". js/entry/admin/bloodDrives.js and
js/entry/staff/bloodDrives.js already follow this pattern correctly — use
them as the reference implementation for the next entry files (Settings,
then Donors).

CONFIRMED non-issues (no action needed, do not revisit without new evidence)
Full page reload on every navigation — expected for this multi-page
architecture (chosen deliberately for multiple field staff working
simultaneously without UI interference). Not a bug. Address visual
jarring (if any) with CSS transitions in Phase 4 only.
15-minute access token expiry — correct as configured. If testers report
unexpected logouts, treat as a refresh-flow bug to debug, not a reason to
extend token lifetime.

### JS Rules
- JS targets IDs — CSS targets classes — never mix
- No inline CSS in HTML files
- No inline JS in HTML files
- No onclick attributes — always addEventListener in entry files
- Every protected page: requireAuth() → requireRole() → renderNavbar() → renderSidebar() → feature init
- type="module" on all script tags — enables ES module imports
- All HTML CSS/JS paths are absolute (start with /) — relative paths break in subfolders

### HTML Rules
- All CSS and JS links use absolute paths starting with / (e.g. /assets/css/main.css)
  Never use relative paths (../) — Express serves from root, relative paths break by URL depth

### CSS Rules
- Minimal functional styles only during Phase 1 and Phase 2
- Never override a shared class in a page-specific CSS file
  Use modifier classes instead (e.g. .btn-full-width in login.css)
- .btn-full-width modifier: full-width button — use instead of overriding .btn-primary
- .notif-badge-hidden: hides badge when count is 0 — must exist in main.css alongside
  the always-render badge pattern in navbar.js

### Constants Rules
- All constants frozen with Object.freeze()
- Status values as objects with named keys — never arrays
- CANCELLED is in BLOOD_REQUEST_STATUS for display only
  It is NOT a valid value for PATCH /:id/status — only set via PATCH /:id/cancel

### API Response Shape
- success field is boolean: { success: true, message: "...", data: {...} }
- Never check body.status === 'success' — that was the old wrong shape (fixed in responseHelper.js)
- Always check res.ok && body.success before using body.data

### Backend Endpoints Added This Session
- GET /api/volunteers/available — Admin + PRC Staff
  Returns active volunteers and phlebotomists for participant assignment
  Query params: ?role=5 (role_id), ?municipality=Batangas City
  Documented in FRONTEND_CONTRACT.md

### Serving Architecture
- Express serves frontend via express.static('../frontend')
- All non-API unmatched routes serve index.html (fallback)
- Local dev: http://localhost:3000 (single command: npm run dev in backend/)
- Production: Railway serves both frontend and backend from same deployment
- railway.toml at repo root: buildCommand = "cd backend && npm install", startCommand = "cd backend && npm start"
- CORS: allowedOrigins includes http://localhost:3000 (added to .env ALLOWED_ORIGINS)

### Helmet CSP Configuration
- scriptSrc: self + https://cdn.socket.io (Socket.io CDN)
- connectSrc: self + ws://localhost:3000 + wss://localhost:3000 + https://cdn.socket.io
- upgradeInsecureRequests removed — Railway handles HTTPS at infrastructure level
- Configuration is production-safe as-is — no changes needed before Railway deployment

---

## Files Created — Phase 1
### Constants
- js/constants/apiConfig.js
- js/constants/roles.js
- js/constants/statusConstants.js
- js/constants/routes.js
- js/constants/bloodTypes.js
- js/constants/notificationTypes.js
- js/constants/permissions.js
- js/constants/socketEvents.js
- js/constants/navItems.js
- js/constants/sidebarItems.js

### Core
- js/core/api.js
- js/core/auth.js
- js/core/utils.js
- js/core/socket.js
- js/core/formPersist.js
- js/core/guards/authGuard.js
- js/core/guards/roleGuard.js

### Layouts
- js/layouts/navbar.js
- js/layouts/sidebar.js

### Components
- js/components/feedback.js
- js/components/toast.js
- js/components/modal.js
- js/components/skeleton.js
- js/components/errorBoundary.js
- js/components/infiniteScroll.js
- js/components/search.js

### Pages
- index.html
- pages/404.html

### Entry
- js/entry/loginPage.js
- js/entry/notFoundPage.js

### CSS
- assets/css/main.css
- assets/css/pages/login.css
- assets/css/pages/404.css

### Backend (modified during Phase 1)
- authController.js — me() includes first_name/last_name via DB lookup
- utils/responseHelper.js — fixed success field from string to boolean

---

## Files Created — Phase 2

### Dashboards
- pages/admin/dashboard.html
- pages/staff/dashboard.html
- pages/volunteer/dashboard.html
- pages/phlebotomist/dashboard.html
- pages/requestor/dashboard.html
- js/entry/admin/dashboard.js
- js/entry/staff/dashboard.js
- js/entry/volunteer/dashboard.js
- js/entry/phlebotomist/dashboard.js
- js/entry/requestor/dashboard.js
- assets/css/pages/admin/dashboard.css
- assets/css/pages/staff/dashboard.css
- assets/css/pages/volunteer/dashboard.css
- assets/css/pages/phlebotomist/dashboard.css
- assets/css/pages/requestor/dashboard.css

### Donors Feature (Admin/Staff)
- js/features/donors/donorsApi.js
- js/features/donors/donorsValidation.js
- js/features/donors/donorsUI.js
- pages/admin/donors.html
- pages/staff/donors.html
- js/entry/admin/donors.js
- js/entry/staff/donors.js
- assets/css/features/donors.css
- assets/css/pages/admin/donors.css (placeholder)
- assets/css/pages/staff/donors.css (placeholder)

### Field Workflow Foundation
- js/features/fieldWorkflow/fieldWorkflowApi.js
- js/features/fieldWorkflow/fieldWorkflowValidation.js
- assets/css/features/fieldWorkflow.css

### Field Workflow Pages (partial)
- pages/field/donorRegistration.html
- js/entry/field/donorRegistration.js
- pages/field/donorInterview.html
- js/entry/field/donorInterview.js

### Backend (modified during Phase 2)
- server.js — express.static + fallback middleware + path require + link log
- server.js — Helmet CSP configured for Socket.io CDN and WebSocket connections
- backend/app/repositories/profileModel.js — getAvailableVolunteers() added
- backend/app/controllers/registrationController.js — getAvailableVolunteers() added
- backend/app/routes/registrationRoutes.js — GET /api/volunteers/available added

### Root
- railway.toml — Railway deployment config

---
### Files Modified This Session
Files Modified This Session

Constants
js/constants/routes.js — added ROUTES.FIELD, removed old per-role workflow
routes, added SETTINGS to ADMIN and STAFF
js/constants/sidebarItems.js — Dashboard added to all roles, unified field
workflow for Volunteer + Phlebotomist, collapsible group support

Core
js/core/auth.js — sessionStorage user cache, getDashboardHref() exported

Layouts
js/layouts/navbar.js — brand link uses getDashboardHref()
js/layouts/sidebar.js — collapsible group rendering added
js/layouts/appShell.js — NEW: revealAppShell()

CSS
assets/css/main.css — field-error-hidden, form-group/label/input,
page-header/title, btn-full-width, sidebar collapsible group styles,
app-loading/app-ready shell reveal

Settings (NEW)
js/features/settings/settingsApi.js
js/features/settings/settingsValidation.js
js/features/settings/settingsUI.js
pages/admin/settings.html
pages/staff/settings.html
js/entry/admin/settings.js
js/entry/staff/settings.js
assets/css/features/settings.css
assets/css/pages/admin/settings.css
assets/css/pages/staff/settings.css

Dashboards (UPDATED — appShell + sidebar section rename)
pages/[role]/dashboard.html — all 5: added class="app-loading" to body
js/entry/[role]/dashboard.js — all 5: revealAppShell() added,
'operations' → 'general', Volunteer/Phlebotomist now render 'workflow'
and 'drive' sections

Sidebar Section Names Per Role (CURRENT)
RoleSections passed to renderSidebar()Admin'general', 'management'PRC Staff'general', 'management'Volunteer'general', 'workflow', 'drive'Phlebotomist'general', 'workflow', 'drive'Requestor'general'

Every entry file must use these exact section names.
'operations' no longer exists — do not use it.

---

## Environment
- Backend: Railway (ready to deploy)
- Frontend: served by Express via express.static — same Railway deployment
- Local dev: http://localhost:3000 (npm run dev in backend/)
- Mobile: Expo (React Native) — separate
- API base URL (local): http://localhost:3000
- API base URL (production): '' (empty string — same origin on Railway)