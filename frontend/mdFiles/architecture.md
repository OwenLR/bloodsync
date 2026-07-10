# BloodSync Frontend — Architecture
# Upload this file only when touching: auth, serving, CSP, socket, core files

## Two Clients
| Client | Stack | Users | Auth |
|---|---|---|---|
| Web app | HTML + CSS + Vanilla JS | Admin, Staff, Vol, Phleb | httpOnly cookies |
| Mobile | React Native (Expo) | Requestors | Bearer token in header |

Every mobile request must send: x-client-type: mobile

---

## Auth — Web (httpOnly Cookies)
Every fetch must include: credentials: 'include'
Never: Authorization header on web — cookies handle it automatically

Login: POST /api/auth/login → sets two httpOnly cookies (access 15min, refresh 7days)
Refresh: POST /api/auth/refresh → new cookies set silently, body.data is null (correct)
Logout: POST /api/auth/logout → cookies cleared

apiFetch() intercepts 401 → calls tryRefresh() (raw fetch) → retries once.
If refresh fails → redirects to login. Never use apiFetch() inside tryRefresh().

getCurrentUser() cache layers:
  1. _currentUser in-memory (same page load)
  2. sessionStorage 'bs_user' (same tab, across navigations — cleared on tab close)
  3. GET /api/auth/me (network — first load or after cache cleared)

getCurrentUserSilent() — raw fetch, no refresh, no redirect. LOGIN PAGE ONLY.

GET /api/auth/me response:
```json
{ "success": true, "data": { "user": {
  "user_id": 1, "email": "...", "role_id": 2, "branch_id": 1,
  "first_name": "Juan", "last_name": "dela Cruz"
}}}
```

---

## Serving Architecture
- Local dev: npm run dev in backend/ → http://localhost:3000
- Express serves frontend via express.static('../frontend')
- Non-API unmatched routes → serve index.html (fallback)
- Production: Railway — same origin, no CORS needed
- ALLOWED_ORIGINS in .env must include http://localhost:3000 for local dev

---

## Helmet CSP (current)
```
scriptSrc:  self, cdn.socket.io, unpkg.com
styleSrc:   self, unsafe-inline, unpkg.com
connectSrc: self, ws://localhost:3000, wss://localhost:3000,
            cdn.socket.io, nominatim.openstreetmap.org, unpkg.com
imgSrc:     self, data:, res.cloudinary.com, *.tile.openstreetmap.org, unpkg.com
fontSrc:    self
objectSrc:  none
```
⚠ No frame-src directive is set. Per CSP spec this falls back to default-src
  ('self'), which silently blocks any <iframe>/<embed> pointed at an external
  origin (e.g. a Cloudinary-hosted PDF), even though imgSrc already allowlists
  res.cloudinary.com for <img> tags. Discovered building the Blood Requests
  detail page — worked around with a plain new-tab link instead of an inline
  embed. Add frameSrc: ["'self'", "https://res.cloudinary.com"] here if inline
  preview is ever wanted.
---

## Socket.io
Connection (web):
```javascript
socket = io(url, { auth: { user_id, role_id, branch_id }, withCredentials: true });
```
Rooms assigned server-side. Never emit join_room.
- Requestor (role_id 4) → user_{user_id}
- Any role with branch_id → branch_{branch_id}
- Admin (role_id 1) → also admin_global

Socket.io loaded via CDN script tag → attaches to window.io.
Feature files attach listeners: socket.on(SOCKET_EVENTS.X, handler)

---

## Page Shell Reveal Pattern
Every protected page body: class="app-loading"
```javascript
renderNavbar(user, 0);
clearSidebar();
renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
revealAppShell(); // ← MUST be here, before any await
await renderFeatureContent(user);
```
CSS keeps #navbar, #sidebar, .page-content as visibility:hidden under app-loading.
revealAppShell() swaps to app-ready → visible. Uses visibility not display:none.

---

## User Roles
| role_id | Role | Client |
|---|---|---|
| 1 | Admin | Web — management only (excludes 5 Staff-only feature areas — see rules.md), no workflow |
| 2 | PRC Staff | Web — walk-in workflow + management |
| 3 | Donor | Not a login role |
| 4 | Requestor | Mobile (+ web) |
| 5 | Volunteer | Web — drive workflow only |
| 6 | Phlebotomist | Web — drive workflow only |

---

## Backend Changes Made (reference)
- donations table: phlebotomist_id column (nullable FK to users)
  Migration: ALTER TABLE donations ADD COLUMN phlebotomist_id integer REFERENCES users(user_id);
- donationModel.js + donationService.js: phlebotomist_id support + QNS detection fixed
- authMiddleware.js: response shape fixed to { success: false } (was { status: 'error' })
- auth.js: getCurrentUserSilent() added, syntax error fixed
- utils/responseHelper.js: success field is boolean (was string)
- authController.js: me() does DB lookup for first_name/last_name
- interviewQuestionRoutes.js: route fixed /gender/:sex → /sex/:sex

---

## CORS Config
allowedOrigins from ALLOWED_ORIGINS env var.
credentials: true required for httpOnly cookies.
No origin (mobile, Postman) → allowed.