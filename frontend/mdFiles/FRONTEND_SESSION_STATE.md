# BloodSync Frontend — Session State

## Status
Phase 1 complete. Core wiring verified working.

## Current Phase
Phase 2 — Features / Web

## Current Task


---

## Phase 1 — Core Wiring (COMPLETE)

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
- [x] `js/core/formPersist.js` — saveForm(), restoreForm(), clearForm() — moved from components/, sessionStorage-backed, no DOM rendering responsibility
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

### CSS (minimal — functional only, design in Phase 4)
- [x] `assets/css/main.css` — global reset, shared buttons, form elements, all component styles, navbar, sidebar
- [x] `assets/css/pages/login.css` — login page layout only
- [x] `assets/css/pages/404.css` — 404 page layout only

### Backend changes made during Phase 1
- [x] `authController.js` — `me()` now does a DB lookup via `userModel.getUserById()`
      to include `first_name` and `last_name` in `GET /api/auth/me` response.
      Reason: in-memory `_currentUser` cache does not survive page reload
      (multi-page app) — navbar needs name fields on every page.

---

## Phase 1 — Test Verification (DO BEFORE PHASE 2)

Run with backend running on localhost:3000 and frontend on Live Server.

- [ ] Login with valid credentials → redirects to correct dashboard per role
- [ ] Login with invalid credentials → shows error message, does not redirect
- [ ] Already-logged-in user visiting index.html → redirected immediately, never sees form
- [ ] GET /api/auth/me returns first_name and last_name (verify in Network tab)
- [ ] Navbar renders correct nav items for each of the 5 login roles
- [ ] Navbar displays full name (not email fallback) on every page
- [ ] Logout → cookies cleared, redirected to login, cannot access protected page after
- [ ] 401 retry: wait 15+ min or manually expire access token → apiFetch refreshes
      and retries automatically without user noticing
- [ ] Refresh token expired/invalid → redirected to login cleanly, no infinite loop
- [ ] roleGuard: log in as Volunteer, manually navigate to an Admin page URL →
      redirected to Volunteer's own dashboard, NOT to login
- [ ] authGuard: clear cookies, navigate to any protected page URL directly →
      redirected to login
- [ ] 404 page: navigate to nonexistent URL while logged out → "Back to login"
- [ ] 404 page: navigate to nonexistent URL while logged in → "Go to dashboard"
      pointing to correct role dashboard
- [ ] Socket connects after login (check browser console for "[Socket] Connected")
- [ ] Toast, modal, skeleton, error boundary render correctly with placeholder data
      (can test via browser console calling the exported functions directly)

---

## Phase 2 — Features / Web (not started)
- [ ] Dashboard (per role)
- [ ] Blood Drives
- [ ] Donors
- [ ] Donor Workflow
  - [ ] `pages/volunteer/donor-registration.html` + entry
  - [ ] `pages/volunteer/donor-interview.html` + entry
  - [ ] `pages/phlebotomist/donor-registration.html` + entry
  - [ ] `pages/phlebotomist/donor-screening.html` + entry
  - [ ] `pages/phlebotomist/donor-donation.html` + entry
  - [ ] `pages/phlebotomist/donor-collection.html` + entry
- [ ] Blood Units (includes Separate action for Whole Blood)
- [ ] Blood Requests + real-time socket
- [ ] Notifications
- [ ] Reports
- [ ] Drive pages (volunteer + phlebotomist)

## Phase 3 — Mobile / React Native (not started)
- [ ] `lib/api.ts` — apiFetch wrapper (Bearer token, 401 retry)
- [ ] `lib/auth.ts` — SecureStore token helpers
- [ ] `lib/socket.ts` — Socket.io with Bearer token, joins user_${user_id} room
- [ ] `providers/AuthProvider.tsx`
- [ ] `providers/SocketProvider.tsx`
- [ ] `providers/NotificationProvider.tsx`
- [ ] Auth screens (login, register)
- [ ] OCR pre-fill for government ID scanning
- [ ] Requestor features (dashboard, submit request, my requests + live status)

## Phase 4 — Design Pass (not started)
- [ ] .btn-primary and .btn-danger are visually identical in Phase 1/2 (both #c00). Phase 4 must give them distinct visual identities — danger buttons are destructive/irreversible and must not look like primary action buttons.
- [ ] `assets/css/main.css` — full design tokens, typography, colors
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
- [ ] `js/core/socket.js` — remove or gate console.log statements behind a DEBUG flag before deployment
- [ ] .btn-primary and .btn-danger are visually identical in Phase 1/2 (both #c00) — Phase 4 must give them distinct visual identities
- [ ] Responsive adjustments

---

## Known Issues
- Loop on dashboard redirect is expected — dashboard pages don't exist until Phase 2. Will resolve automatically as pages are built.

---

## Decisions Made

### Architecture
- Vanilla JS for web — no React (real-time handled via Socket.io + DOM)
- React Native for mobile (requestors only)
- Functionality first, design last — no design CSS until Phase 4
- `config.js` deleted — replaced by focused constants files (one responsibility per file)
- No duplicate filenames across the project regardless of folder depth

### Folder Structure
- `js/entry/` not `js/pages/` — entry files are page bootstrappers, not pages
- `js/constants/` — one file per concern, all frozen with Object.freeze()
- `js/core/guards/` — auth and role guards separate files
- `js/core/formPersist.js` — client-state persistence (sessionStorage), lives in
  core/ not components/ because it has no DOM rendering responsibility
- `js/components/` — reusable UI components with DOM rendering responsibility
- `js/layouts/` — navbar and sidebar renderers
- `js/features/` — feature-folder pattern: featureApi.js + featureUI.js + featureValidation.js
- `assets/css/` mirrors JS folder structure:
  - `assets/css/main.css` — global
  - `assets/css/layouts/` — navbar.css, sidebar.css
  - `assets/css/components/` — per component
  - `assets/css/pages/` — per page (login, 404, etc.)
  - `assets/css/features/` — per feature
- `assets/` = static resources only — application code lives in `js/`
- `pages/` = HTML files only

All HTML files use absolute paths (/assets/css/, /js/entry/) for CSS and JS links — relative paths break when Express serves files and the browser URL is in a subfolder

### JS Rules
- JS targets IDs — CSS targets classes — never mix
- No inline CSS in HTML files
- No inline JS in HTML files
- No `onclick` attributes — always addEventListener in entry files
- Every protected page: requireAuth() → requireRole() → renderNavbar() → renderSidebar() → feature init
- `type="module"` on all script tags — enables ES module imports

### HTML Rules
- HTML owns: semantic structure, element IDs, classes, accessibility attributes, meta tags, CSS links, script links
- HTML does NOT own: API calls, business rules, validation logic, role logic, dynamic rendering, inline CSS, inline JS
- If removing CSS still leaves a meaningful document → HTML is correct
- If removing JS still leaves a readable document → HTML is correct

### CSS Rules
- Minimal functional styles only during Phase 1 and Phase 2
- All global shared styles in `main.css` (reset, buttons, forms, components, layouts)
- Page-specific layout in `assets/css/pages/`
- Feature-specific styles in `assets/css/features/`
- Full design pass in Phase 4 only

### Constants Rules
- All constants frozen with Object.freeze()
- Status values as objects with named keys — never arrays (prevents positional bugs)
- No hardcoded role IDs, status strings, or page paths anywhere outside constants files
- If backend changes a value, update the matching frontend constant file
- FRONTEND_CONTRACT.md documents valid API values as prose only — never as
  frontend constant shapes (arrays vs frozen objects). Frontend implementation
  shapes are defined in FRONTEND_AI_RULES.md and the constants/ files themselves.

### Layer Responsibilities

#### api.js
- Allowed: HTTP requests, credential handling, token refresh, retry logic
- Not allowed: DOM manipulation, toast notifications, modal display, feature logic, validation, business rules

#### auth.js
- Allowed: login(), logout(), getCurrentUser(), redirectByRole()
- login() returns user — does NOT redirect (caller's job)
- logout() clears session — does NOT redirect (caller's job)
- User cache (_currentUser) is in-memory only — does NOT survive page reload (multi-page app)
- GET /api/auth/me returns first_name/last_name (DB lookup) so navbar always
  has a display name even after the in-memory cache resets on navigation

#### Guards
- authGuard.js: authentication checks only, may redirect to ROUTES.LOGIN, must not render UI or check roles
- roleGuard.js: authorization checks only, receives user as parameter, authorization failure → redirectByRole() (not login)
- Entry files call guards before any page initialization

#### navbar.js
- Allowed: render navbar, render notification badge placeholder, handle logout button
- Not allowed: fetch notifications, open sockets, call feature APIs
- Receives unreadCount as parameter — caller fetches it from notificationApi.js

#### sidebar.js
- Pure renderer only — knows nothing about roles or pages
- Navigation definitions live in constants/sidebarItems.js
- Entry files call getSidebarItems(user.role_id, section) and pass result to renderSidebar()

#### utils.js
- Pure functions only — no DOM side effects
- DOM feedback helpers live in components/feedback.js

#### components/
- toast.js — auto-creates container if missing, stacks, auto-dismisses
- modal.js — confirmModal() returns Promise<boolean>
- skeleton.js — three types: rows, card, table
- errorBoundary.js — retry button re-calls loader, clears itself first
- infiniteScroll.js — call destroyInfiniteScroll() when all pages loaded or on page teardown
- search.js — returns cleanup function from initSearch(), default 400ms debounce
- feedback.js — showError(), showSuccess(), clearFeedback()

#### core/formPersist.js
- saveForm(), restoreForm(), clearForm() — sessionStorage only, file inputs skipped
- Moved out of components/ — no DOM rendering responsibility, client-state utility

### Socket Rules
- Room assignment is server-side only — frontend never emits join_room
- Backend reads user_id, role_id, branch_id from socket.handshake.auth
- SOCKET_EVENTS constants in constants/socketEvents.js — never hardcode event strings
- Feature files attach listeners: socket.on(SOCKET_EVENTS.X, handler)
- Socket.io loaded via CDN script tag — attaches to window.io
- Add CDN script tag to every HTML page that needs real-time
- CORRECTED: FRONTEND_CONTRACT.md previously showed socket.emit('join_room', ...)
  — this was wrong and has been removed from the contract. There is no
  join_room handler on the backend.

### Donor Workflow — Separate Pages Per Step
Each workflow step is a dedicated HTML page — not tabs or modals within one page.
Reason: multiple field staff can work simultaneously in the same blood drive
without UI interference. One volunteer does registration, another does interviews —
each opens their own focused page.

| Page | Role |
|---|---|
| donor-registration.html | Volunteer, Phlebotomist |
| donor-interview.html | Volunteer |
| donor-screening.html | Phlebotomist |
| donor-donation.html | Phlebotomist |
| donor-collection.html | Phlebotomist |

### Notification Badge
- navbar.js owns the badge placeholder (#notif-badge)
- features/notifications/notificationUI.js owns badge state (updateBadge())
- Entry files fetch unread count from notificationApi.js and pass to renderNavbar()

### Testing Plan
- Test at end of each phase, not per file
- Phase 1 test: see "Phase 1 — Test Verification" checklist above — must complete before Phase 2
- Phase 2 test: per feature after each feature is complete
- Phase 3 test: Expo separately
- Backend must be running on localhost:3000 during local testing

---

## Environment
- Backend: Railway (ready to deploy)
- Frontend: served by Express via express.static — same Railway deployment
- Local dev: Live Server (VS Code) pointing at frontend/ folder
- Mobile: Expo (React Native) — separate
- API base URL (local): http://localhost:3000
- API base URL (production): '' (empty string — same origin on Railway)

---

## Folder Structure (final)

### Web
```
frontend/
├── index.html
├── pages/
│   ├── 404.html
│   ├── admin/
│   ├── staff/
│   ├── volunteer/
│   ├── phlebotomist/
│   └── requestor/
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── layouts/
│   │   │   ├── navbar.css
│   │   │   └── sidebar.css
│   │   ├── components/
│   │   │   ├── toast.css
│   │   │   ├── modal.css
│   │   │   ├── skeleton.css
│   │   │   ├── errorBoundary.css
│   │   │   ├── feedback.css
│   │   │   └── search.css
│   │   ├── pages/
│   │   │   ├── login.css
│   │   │   └── 404.css
│   │   └── features/
│   └── img/
└── js/
    ├── constants/
    │   ├── apiConfig.js
    │   ├── roles.js
    │   ├── statusConstants.js
    │   ├── routes.js
    │   ├── bloodTypes.js
    │   ├── notificationTypes.js
    │   ├── permissions.js
    │   ├── socketEvents.js
    │   ├── navItems.js
    │   └── sidebarItems.js
    ├── core/
    │   ├── api.js
    │   ├── auth.js
    │   ├── utils.js
    │   ├── socket.js
    │   ├── formPersist.js
    │   └── guards/
    │       ├── authGuard.js
    │       └── roleGuard.js
    ├── layouts/
    │   ├── navbar.js
    │   └── sidebar.js
    ├── components/
    │   ├── feedback.js
    │   ├── toast.js
    │   ├── modal.js
    │   ├── skeleton.js
    │   ├── errorBoundary.js
    │   ├── infiniteScroll.js
    │   └── search.js
    ├── entry/
    │   ├── admin/
    │   ├── staff/
    │   ├── volunteer/
    │   ├── phlebotomist/
    │   ├── requestor/
    │   ├── loginPage.js
    │   └── notFoundPage.js
    └── features/
        ├── donors/
        ├── bloodRequests/
        ├── inventory/
        ├── bloodDrives/
        ├── notifications/
        └── reports/
```

### Mobile
```
mobile/
├── app/
│   ├── (auth)/
│   └── (app)/
├── features/
│   ├── auth/
│   ├── requests/
│   └── dashboard/
├── components/
│   ├── ui/
│   ├── request/
│   └── notification/
├── providers/
├── types/
├── utils/
├── lib/
└── constants/
```

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
- authController.js — me() now includes first_name/last_name via userModel.getUserById()