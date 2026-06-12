# BloodSync Frontend — Session State

## Status
Frontend not started. Backend complete and stable.

## Current Phase
Not started — next task is Phase 1, Step 1.

## Current Task
Phase 1 — Core Wiring
Step 1: `js/constants/config.js`

---

## Phase 1 — Core Wiring (not started)
- [ ] `js/constants/config.js` — API_BASE_URL, ROLES, STATUSES, BLOOD_TYPES, COMPONENTS
- [ ] `js/core/api.js` — apiFetch wrapper, credentials, 401 retry, redirect to login
- [ ] `js/core/auth.js` — login(), logout(), getCurrentUser(), redirectByRole()
- [ ] `js/core/utils.js` — formatPHT(), showError(), showSuccess(), formatBloodType()
- [ ] `js/core/socket.js` — Socket.io init, room join, event export
- [ ] `js/core/guards/authGuard.js` — requireAuth()
- [ ] `js/core/guards/roleGuard.js` — requireRole()
- [ ] `js/layouts/navbar.js` — renders nav with notification badge
- [ ] `js/layouts/sidebar.js` — renders sidebar based on role
- [ ] `index.html` — login page, tests Phase 1 end to end

## Phase 2 — Features / Web (not started)
- [ ] Dashboard
- [ ] Blood Drives
- [ ] Donors
- [ ] Donor Workflow (interview → answers → screening → donation → collection)
- [ ] Blood Units (includes Separate action for Whole Blood + Available units)
- [ ] Blood Requests + real-time socket
- [ ] Notifications
- [ ] Reports

## Phase 3 — Mobile / React Native (not started)
- [ ] `lib/api.ts` — apiFetch wrapper (Bearer token, 401 retry) — BUILD FIRST
- [ ] `lib/auth.ts` — SecureStore token helpers
- [ ] `lib/socket.ts` — Socket.io with Bearer token, joins user_${user_id} room
- [ ] `providers/AuthProvider.tsx`
- [ ] `providers/SocketProvider.tsx`
- [ ] `providers/NotificationProvider.tsx`
- [ ] Auth screens (login, register)
- [ ] OCR pre-fill for government ID scanning (registration screen — after core auth)
- [ ] Requestor features (dashboard, submit request, my requests + live status)

## Phase 4 — Design Pass (not started)
- [ ] main.css
- [ ] Feature CSS files
- [ ] Components styling
- [ ] Responsive adjustments

---

## Completed
Nothing yet.

---

## Known Issues
None yet.

---

## Decisions Made
- Vanilla JS for web — no React (real-time handled via Socket.io + DOM, no framework needed)
- React Native for mobile (requestors only)
- Functionality first, design last — no CSS until Phase 2 is complete
- Feature-folder structure: features/donors/donorApi.js + donorUI.js + donorValidation.js
- JS targets IDs, CSS targets classes — never mix
- `assets/` = static resources only (CSS, images) — application code lives in `js/`
- `layouts/` for page structure elements (navbar, sidebar) — separate from `components/`
- `components/` for reusable UI pieces (modal, toast, pagination)
- `js/entry/*.js` entry files — one per HTML page, wires imports and init calls
- `js/core/guards/` for auth and role protection (authGuard.js, roleGuard.js)
- Railway full-stack hosting — Express serves frontend via express.static, no Hostinger needed
- Hostinger domain retained for DNS only — pointed at Railway deployment URL
- API_BASE_URL = empty string in production (same-origin Railway), localhost:3000 in dev
- Requestors get real-time updates via Socket.io user_${user_id} private room (Option B)
- Mobile socket connects with Bearer token — backend assigns room on connect
- OCR pre-fill for government ID scanning added to Phase 3 (after core auth and request flow)

---

## Environment
- Backend: Railway (pending deployment)
- Frontend: served by Express via express.static — same Railway deployment as backend
- Local frontend dev: Live Server (VS Code) pointing at frontend/ folder
- Mobile: Expo (React Native) — separate from Railway
- API base URL (local): http://localhost:3000
- API base URL (production): '' (empty string — same origin on Railway)

---

## Folder Structure

### Web
```
frontend/
├── index.html
├── assets/
│   ├── css/
│   │   └── features/
│   └── img/
├── js/
│   ├── core/
│   │   └── guards/
│   ├── constants/
│   ├── layouts/
│   ├── components/
│   ├── entry/
│   └── features/
│       ├── donors/
│       ├── bloodRequests/
│       ├── inventory/
│       ├── bloodDrives/
│       ├── notifications/
│       └── reports/
└── pages/
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

## Files Created So Far
None.