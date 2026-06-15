# BloodSync Frontend — AI Rules (New Chat Edition)

## FIRST THING TO DO IN EVERY NEW CHAT
1. Read ALL uploaded memory files completely before responding:
   - FRONTEND_AI_RULES.md (this file)
   - FRONTEND_NOTES.md
   - FRONTEND_CONTRACT.md
   - FRONTEND_SESSION_STATE.md
2. Confirm understanding of current phase and task
3. Ask what the developer wants to work on
4. Verify relevant existing files before writing any code
5. Never start implementing immediately without confirming context

## Memory Files — What Each Is For
| File | Purpose |
|---|---|
| FRONTEND_AI_RULES.md | How to work on the frontend (this file) |
| FRONTEND_NOTES.md | Auth setup, folder structure, backend gotchas, build plan |
| FRONTEND_CONTRACT.md | Every API endpoint, request/response shapes, socket events |
| FRONTEND_SESSION_STATE.md | What's built, what's next, known issues |

## Context Rules
- Never assume what a file contains — ask or read it first
- Never assume a function signature in an existing JS file — ask for the current version
- Never assume an endpoint exists — verify in FRONTEND_CONTRACT.md first
- If a file was modified in a previous session and not re-uploaded, ask for the current version
- Past assistance does not authorize continuing without re-reading context
- Always check FRONTEND_SESSION_STATE.md for the active phase and step

---

## Layer Responsibilities — STRICT

### HTML
- Owns: semantic structure, element IDs, classes, accessibility attributes, meta tags, CSS links, script links
- Does NOT own: API calls, business rules, validation logic, role logic, dynamic rendering, inline CSS, inline JS
- Rule: if removing CSS still leaves a meaningful document → HTML is correct
- Rule: if removing JS still leaves a readable document → HTML is correct

### CSS (assets/css/)
- Owns: appearance, layout, colors, responsiveness, animations
- Phase 1 + 2: minimal functional styles only in main.css
- Phase 4: full design pass with individual CSS files per layout/component/page/feature
- Never put layout logic in JS — CSS owns layout

### js/core/api.js
- Allowed: HTTP requests, credential handling, token refresh, retry logic
- Not allowed: DOM, toast, modal, feature logic, validation, business rules
- NEVER use apiFetch() inside tryRefresh() — causes infinite refresh loop
- NEVER use raw fetch() for API calls anywhere except inside tryRefresh()

### js/core/auth.js
- login() returns user — does NOT redirect (caller's job)
- logout() clears session — does NOT redirect (caller's job)
- _currentUser cache is in-memory only — does NOT survive page reload (multi-page app, not SPA)
- redirectByRole() belongs here — it is role-aware logic, not page logic

### js/core/socket.js
- Allowed: Socket.io connection setup, infrastructure listeners (connect, disconnect, connect_error)
- Not allowed: feature-specific listeners, DOM manipulation
- Room assignment is server-side — frontend never emits join_room manually
- Socket.io loaded via CDN script tag — attaches to window.io
- Feature files attach listeners: socket.on(SOCKET_EVENTS.X, handler)

### js/core/utils.js
- Pure functions only — no DOM side effects, no API calls
- DOM feedback helpers live in components/feedback.js — not here

### js/core/formPersist.js
- Client-state persistence utility — same category as auth.js (session state)
  but for form drafts, backed by sessionStorage
- Lives in core/, NOT components/ — it has no DOM rendering responsibility
- Allowed: sessionStorage read/write for form field values
- Not allowed: DOM rendering beyond reading/writing form field values, API calls
- File inputs always excluded — FileList cannot be serialized

### js/core/guards/
- authGuard.js: authentication checks only, redirects to ROUTES.LOGIN, must not check roles or render UI
- roleGuard.js: authorization checks only, receives user as parameter, authorization failure → redirectByRole() not login
- Both guards return early — entry files must check return value before continuing

### js/layouts/navbar.js
- Allowed: render navbar, render notification badge placeholder, handle logout button
- Not allowed: fetch notifications, open sockets, call feature APIs
- Receives unreadCount as parameter — caller fetches from notificationApi.js

### js/layouts/sidebar.js
- Pure renderer only — knows nothing about roles or pages
- Navigation definitions live in constants/sidebarItems.js
- Entry files call getSidebarItems(user.role_id, section) and pass result to renderSidebar()

### js/entry/ 
- Pattern: requireAuth() → requireRole() → renderNavbar() → renderSidebar() → feature init
- Does NOT own business logic, API calls, or rendering details
- entry files are organized in role subfolders matching the pages/ structure.

### js/features/*Api.js
- apiFetch calls only, returns parsed data — no DOM, no business logic

### js/features/*UI.js
- DOM rendering and event handlers only — never calls apiFetch directly
- Calls feature API files for data

### js/features/*Validation.js
- Client-side input validation only — no API calls, no DOM

### js/components/
- Reusable UI pieces with DOM rendering responsibility — modal, toast, skeleton,
  error boundary, search, feedback, infinite scroll
- May import from constants/ only
- Never import from core/ or features/
- formPersist.js is NOT here — it lives in core/ (see above) because it has
  no DOM rendering responsibility, only sessionStorage read/write

---

## Naming Rules — STRICT
- Files: camelCase — `donorApi.js`, `bloodRequestUI.js`
- No duplicate filenames across the project regardless of folder depth
- Constants files: descriptive names — `apiConfig.js` not `api.js`, `statusConstants.js` not `statuses.js`
- CSS files mirror JS file names — `navbar.js` → `navbar.css`, `toast.js` → `toast.css`
- IDs (HTML): kebab-case — `id="requests-table"`, `id="error-msg"`
- Classes (CSS): kebab-case — `.request-row`, `.btn-primary`
- JS targets IDs — CSS targets classes — never mix

---

## Constants Rules
- All constants frozen with Object.freeze()
- Status values as objects with named keys — never arrays (prevents positional bugs)
- No hardcoded role IDs — always ROLES.ADMIN etc.
- No hardcoded status strings — always BLOOD_REQUEST_STATUS.APPROVED etc.
- No hardcoded page paths — always ROUTES.ADMIN.DASHBOARD etc.
- No hardcoded socket event strings — always SOCKET_EVENTS.BLOOD_REQUEST_NEW etc.
- No hardcoded API paths in feature files — auth endpoints in apiConfig.js, feature paths in feature API files

---

## Import Dependency Direction (bottom = no imports from above)
```
constants/          ← no imports
core/api.js         ← constants/
core/auth.js        ← core/api.js, constants/
core/socket.js      ← core/auth.js, constants/
core/formPersist.js ← (no imports — pure sessionStorage utility)
core/guards/        ← core/auth.js, constants/
layouts/            ← core/, constants/
components/         ← constants/ only
features/           ← core/api.js, core/formPersist.js, components/, constants/
entry/              ← everything above
```
Never import auth.js from api.js — api.js is the bottom of the pyramid.
Never import feature files from components/.

---

## Error Handling Rules
- Every apiFetch call must handle three states: loading, success, error
- Always check `res.ok && body.success` before using body.data
- 401: handled automatically by apiFetch (refresh → retry → redirect)
- 403 on field operation routes: means no active drive — show specific message, not generic access denied
- 429: show retry message — "Too many requests. Please wait a moment."
- 500: show generic message only — never expose body.message for 500s
- Never leave catch blocks empty — always show error state
- Use showErrorBoundary() for section-level failures, showToast() for action feedback

---

## Contract Boundary Rules — CRITICAL
The API response is the source of truth — not the database, not service internals.

### Frontend MUST know
- API route paths, request field names, response field names
- Query parameter names, route parameter names
- Socket event names, shared constants

### Frontend must NOT know or depend on
- Database table or column names not exposed in API responses
- Repository or service function names
- Domain function names or internals
- Internal backend variable names

```javascript
// WRONG — guessing field names
const id = body.data.id;
const type = body.data.bloodType;

// RIGHT — exact names from FRONTEND_CONTRACT.md
const id = body.data.request_id;
const type = body.data.blood_type;
```

When response field names are not documented in FRONTEND_CONTRACT.md:
upload the relevant controller file first — verify field names, build second.

---

## Security Rules

### Never do
- Never use innerHTML with user-supplied or API response data — always textContent or createElement()
- Never store tokens in localStorage or sessionStorage — web uses httpOnly cookies
- Never send Authorization header on web — cookies handle it automatically
- Never decode the JWT on the frontend — call GET /api/auth/me instead
- Never send user_id in request bodies — backend reads from JWT
- Never send branch_id in request bodies unless the endpoint explicitly requires it
- Never use apiFetch() inside tryRefresh() — infinite loop

```javascript
// WRONG — XSS risk
element.innerHTML = `<td>${donor.first_name}</td>`;

// RIGHT — always safe
const td = document.createElement('td');
td.textContent = donor.first_name;
```

---

## Backend Contract Reminders — Things That Silently Break the Frontend

1. **Drive status** — computed on backend from PHT time, never recompute on frontend
2. **interview_id in answers** — NOT screening_id (architectural fix — was a bug)
3. **drive_id NULL** — means walk-in (Admin/Staff), not a bug; do not show error
4. **GET /api/blood-drives/confirm returns HTML** — not JSON, browser link only, frontend never calls this
5. **role_id 3 (Donor)** — never logs in, not a system user, no frontend page
6. **Volunteer/Phlebotomist identity fields** — locked server-side (first_name, last_name, birthdate, sex); backend rejects with 400 even with valid token
7. **QNS collections (is_qns: true)** — cannot be marked Safe; backend rejects; hide Safe button for QNS
8. **FEFO assignment** — happens automatically on request Approved; frontend never controls unit assignment
9. **drive_id propagation** — set at interview by middleware, auto-filled downstream; frontend never sends it
10. **Sequential medical flow** — enforced server-side; frontend must guide in order; a 400 on a step usually means prior step incomplete
11. **cancelRequest** — backend scopes to user_id AND status=Pending; returns 404 if either fails; only show Cancel on Pending requests
12. **Separated blood unit** — terminal status; no further actions; hide all action buttons
13. **answer values** — must be exactly "YES" or "NO" (uppercase); backend rejects lowercase
14. **Donor email required** — required at registration; backend also enforces at donation time; both sides must require it
15. **PRC Staff branch scope** — cannot create/manage drives for other branches; backend returns 403
16. **Field role 403** — on field operation routes means no active drive assignment, not a permissions error
17. **Token refresh returns null body on web** — `data: null` is correct; do not error on null data
18. **Blood request transition** — only Pending→Approved/Rejected and Approved→Released/Rejected; backend rejects invalid transitions
19. **Socket room assignment** — handled server-side from handshake.auth payload; frontend never emits join_room
20. **Requestor sees only own requests** — enforced server-side on GET /api/blood-requests; no filter needed on frontend
21. **GET /api/auth/me includes first_name and last_name** — added via DB lookup specifically so navbar display name works on every page after reload (in-memory cache does not survive navigation); do not assume `/me` only returns JWT payload fields
22. **API response shape** — success field is a boolean (true/false), not a string. Check body.success === true not body.status === 'success'. The backend responseHelper.js was fixed to match this — never revert it.

---

## Pattern for New Features (Web)
1. Check FRONTEND_CONTRACT.md — verify endpoint exists and get exact field names
2. featureApi.js — add apiFetch call, return parsed data
3. featureValidation.js — add client-side validation (if form)
4. featureUI.js — build DOM rendering and event handlers
5. HTML page — semantic structure, IDs, CSS link, entry script link
6. entry file — requireAuth → requireRole → renderNavbar → renderSidebar → feature init
7. Test: loading state, success state, error state, role guard, 401 retry
8. Update FRONTEND_SESSION_STATE.md — mark complete, update next task

---

## Things To Never Do

### Structure
- Never put fetch calls in UI files — fetch belongs in Api files
- Never put DOM manipulation in Api files
- Never put business logic in components
- Never write inline styles in JS
- Never skip loading and error states
- Never put CSS in HTML files (no style tags)
- Never put JS behavior in HTML files (no onclick attributes)
- Never duplicate a filename even across different folders
- Never override a shared class (.btn-primary, .btn-secondary, etc.) in a page-specific CSS file — add a modifier class to the HTML element instead (e.g. .btn-full-width)
- Never use relative paths (../, ./) for CSS or JS links in HTML files — always use absolute paths starting with / (e.g. /assets/css/main.css, /js/entry/loginPage.js). Express serves all files from root so relative paths break when the browser URL is in a subfolder.

### Backend Contract
- Never compute drive status on the frontend
- Never skip sequential medical workflow steps in the UI
- Never show action buttons for invalid blood request transitions
- Never allow editing identity fields on volunteer/phlebotomist profile form
- Never send requests to endpoints the current role cannot access
- Never show Safe button for QNS collections
- Never show action buttons for Separated blood units
- Never show Cancel button for non-Pending requests

### Auth
- Never put tokens in localStorage or sessionStorage
- Never send Authorization header on web
- Never decode the JWT
- Never send user_id in a request body

---

## Known Gotchas — Things That Burned Time Before
- Forgot `credentials: 'include'` → cookies not sent → every request 401
- Used `Authorization` header on web → token not found → 401
- Sent `user_id` in POST body → ignored by backend but looks like it should work
- Hardcoded status string with wrong case → backend rejects silently
- Used `screening_id` in interview answers → backend returns 400 (field is `interview_id`)
- Called `socket.emit('join_room', ...)` manually → rooms are assigned server-side, emit has no effect
- Targeted element by class in JS → breaks when CSS class changes during design pass
- Built UI before confirming endpoint exists → had to rewrite when contract differed
- Used `answer: 'yes'` (lowercase) in interview answers → backend rejects, must be "YES"/"NO"
- Showed Cancel button on non-Pending request → backend returns 404 (scoped query returns nothing)
- Tried to mark QNS collection as Safe → backend rejects with 400


main.css — Is One File a Problem?
Yes, it will become a problem if you put everything in it.
The current plan puts global reset, shared buttons, forms, components, navbar, and sidebar all in main.css. That is already six responsibilities in one file. As Phase 2 and 4 add feature styles, the temptation to keep adding to main.css grows. By Phase 4 you will have a 2000-line file that no one wants to touch.
The right model:
main.css should own exactly one thing: global tokens and reset only.
main.css → CSS variables, reset, base typography, nothing else
Everything else gets its own file from the start. Components, layouts, and features already have folders planned. Use them in Phase 1, not Phase 4.