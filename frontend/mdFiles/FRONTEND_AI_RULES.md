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
- All CSS and JS paths must be absolute (start with `/`) — never relative (`../`, `./`)
  Reason: Express serves all files from root; relative paths break when browser URL is in a subfolder

### CSS (assets/css/)
- Owns: appearance, layout, colors, responsiveness, animations
- Phase 1 + 2: minimal functional styles only in main.css
- Phase 4: full design pass with individual CSS files per layout/component/page/feature
- Never put layout logic in JS — CSS owns layout
- Never override a shared class (`.btn-primary`, `.btn-secondary`, etc.) in a page-specific CSS file
  Use a modifier class instead (e.g. `.btn-full-width`) and add it to the HTML element
  Precedent: `login.css` uses `.btn-full-width` not an override of `.btn-primary`

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
- Formatting helpers live here: phone number formatting, date formatting, etc.

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
Identity and global actions ONLY — brand/logo, current user's display name,
notification link + badge, logout button.
Does NOT render feature navigation links (Dashboard, Blood Drives, Donors,
etc.) — all page navigation lives in the sidebar only, never duplicated
in the navbar. constants/navItems.js was deleted for this reason — it had
no other consumer once navbar.js stopped rendering a nav-links list.
Allowed: render navbar shell, render notification badge placeholder, handle logout button
Not allowed: fetch notifications, open sockets, call feature APIs, render page nav links
Receives unreadCount as parameter — caller fetches from notificationApi.js
Always renders #notif-badge element — hidden via .notif-badge-hidden when count is 0
So notificationUI.js can always find it via getElementById after socket events fire
Reason for identity-only navbar: avoids duplicate navigation surfaces —
every page was previously reachable from both navbar and sidebar, which
is redundant and adds a decision point for users with no benefit.

### js/layouts/sidebar.js
Pure renderer only — knows nothing about roles or pages
Owns ALL page-level navigation for the app — navbar has none
Navigation definitions live in constants/sidebarItems.js
Entry files call getSidebarItems(user.role_id, section) and pass result to renderSidebar()

### js/entry/ (one file per HTML page)
- Pattern: requireAuth() → requireRole() → renderNavbar() → renderSidebar() → feature init
- Does NOT own business logic, API calls, or rendering details
- Organized in role subfolders matching pages/ structure:
  js/entry/admin/, js/entry/staff/, js/entry/volunteer/, js/entry/phlebotomist/, js/entry/requestor/
  Exception: loginPage.js and notFoundPage.js stay at js/entry/ root (not role-specific)
- Import depth: entry files in role subfolders are two levels deep from js/
  Use ../../ to reach core/, layouts/, constants/
  Example: import { requireAuth } from '../../core/guards/authGuard.js';

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
- ALL files: camelCase — including HTML and CSS files, not just JS.
donorApi.js, bloodRequestUI.js, bloodDrives.html, bloodDriveCreate.css
- This applies to every file type without exception. Previously CSS/HTML
were kebab-case (blood-drives.html) — corrected mid-Phase-2 to camelCase
for full consistency. Do not create new kebab-case files going forward.
- Folder names under pages/ and assets/css/pages/ (admin, staff, volunteer,
phlebotomist, requestor) stay lowercase — these are role names, not
subject to the file-naming rule.
- No duplicate filenames across the project regardless of folder depth
- Constants files: descriptive names — apiConfig.js not api.js, statusConstants.js not statuses.js
- CSS files mirror JS file names — navbar.js → navbar.css, toast.js → toast.css
- IDs (HTML): kebab-case — id="requests-table", id="error-msg"
(IDs and classes are NOT file names — kebab-case still applies to them)
- Classes (CSS): kebab-case — .request-row, .btn-primary
- JS targets IDs — CSS targets classes — never mix
- Entry files in role subfolders: filename is the page name only, role is the folder
js/entry/admin/dashboard.js not js/entry/admin/adminDashboard.js
(already camelCase by virtue of being a single word — multi-word page
names follow the same camelCase rule: js/entry/admin/bloodDriveCreate.js)

---
### UPDATED: Sidebar Section Names

'operations' is gone. Use 'general' instead. Full current mapping:

RolerenderSidebar() callsAdmingetSidebarItems(role, 'general'), getSidebarItems(role, 'management')PRC StaffgetSidebarItems(role, 'general'), getSidebarItems(role, 'management')VolunteergetSidebarItems(role, 'general'), getSidebarItems(role, 'workflow'), getSidebarItems(role, 'drive')PhlebotomistgetSidebarItems(role, 'general'), getSidebarItems(role, 'workflow'), getSidebarItems(role, 'drive')RequestorgetSidebarItems(role, 'general')

---
### Field Entry Files

Entry files for /pages/field/ pages live in js/entry/field/ and use
two levels deep (../../) same as other role subfolders.
requireRole must accept BOTH field roles:

javascriptif (!requireRole(user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST])) return;

Sidebar for field entry files:

javascriptrenderSidebar(getSidebarItems(user.role_id, 'general'),  'General');
renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
renderSidebar(getSidebarItems(user.role_id, 'drive'),    'My Drive');

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
- API response shape: `{ success: true/false, message: "...", data: {...} }`
  `success` is a boolean — never check `body.status === 'success'` (wrong shape)
- 401: handled automatically by apiFetch (refresh → retry → redirect)
- 403 on field operation routes: means no active drive — show specific message, not generic access denied
- 429: show retry message — "Too many requests. Please wait a moment."
- 500: show generic message only — never expose body.message for 500s
- Never leave catch blocks empty — always show error state
- Use showErrorBoundary() for section-level failures, showToast() for action feedback

---

## Error Message Quality Rules — CRITICAL
Error messages shown to users must follow the three-part formula:
1. **What happened** — state the problem clearly
2. **Why it happened** — give the reason in plain language
3. **Clear action** — tell the user exactly what to do next

Examples:
- BAD: "Something went wrong."
- BAD: "Error 400" or any raw backend/database message
- GOOD: "Your request couldn't be submitted. The selected blood type is unavailable at this branch. Please choose a different branch or contact PRC directly."

Rules:
- Never dump raw backend error messages on screen — always translate to user-facing language
- Never use generic "Something went wrong" without context
- 500 errors → show: "An unexpected error occurred. Please try again or contact support if the problem persists."
- 4xx errors → use body.message from backend but only after verifying it is user-safe
- Validation errors → show inline next to the field, not in a toast or modal
- Action failures (save, submit, approve) → show inline near the button that triggered the action

---

## UX Pattern Rules - SHOULD ALWAYS CHECK IF FEATURES WILL BE NEEDED THESE

### Graceful Degradation
- Pages must not wait for all data before rendering — load shell first, then fill content
- Pattern: render navbar + sidebar first → show skeleton in content area → load data → replace skeleton
- Never block page render on non-critical data (e.g. notification count, profile images)
- If a non-critical fetch fails, show a placeholder — do not block the page

### Empty States
- Every list, table, or data view must have an empty state
- A good empty state tells the user three things:
  1. Why it's empty ("No blood requests yet")
  2. What to do next ("Submit a request to get started")
  3. Does not feel broken — never show a blank white area
- Empty state lives in the UI file, triggered when data array length is 0
- Use a simple centered message with an optional action button

### Inline Errors
- Form validation errors appear inline next to the field, not in a toast or modal
- Action errors (save failed, submit failed) appear inline near the button that triggered them
- Use feedback.js showError() for inline errors — not showToast()
- Toast is for transient confirmations (saved, deleted, approved) — not errors that need action

### Button States
- Disable submit/action buttons until all required fields have values
- Re-enable immediately if the user clears a required field
- Show loading state on buttons during async operations (disable + change text to "Saving…")
- Re-enable button and restore label if the operation fails

### Forgiving Input Formatting
- Phone/contact numbers: strip non-digits before sending to backend
  Display with formatting (e.g. 0917-123-4567) but send raw digits to API
  Formatting helpers live in utils.js
- Dates: accept flexible input, normalize to required format before sending
- Never reject input because of formatting — format it for the user

### Pre-fill What You Can
- If data is already known (e.g. branch_id from current user, drive_id from context), pre-fill it
- Don't make users re-enter data the system already has
- Use formPersist.js to restore form drafts after navigation

### Perceived Effort for Long Operations
- Operations that involve computation or search (nearest branch, distance calculation,
  availability check) should show a status message before displaying results
- Minimum display time for status message: ~500ms even if result is instant
- Examples: "Searching for nearest PRC branch…", "Checking blood availability…"
- This applies to: fulfillment options, distance sorting, availability checks
- Does NOT apply to: routine data fetches, list loads, standard form submissions

### Skeleton Loading
- Always show skeleton before data loads — never show blank content area
- showSkeleton(containerId, count, type, columns) — pass correct column count for tables
- hideSkeleton() called after data loads, before rendering real content
- Navbar and sidebar render before skeleton — they don't depend on page data

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
upload the relevant controller or model file first — verify field names, build second.

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
21. **GET /api/auth/me includes first_name and last_name** — added via DB lookup specifically so navbar display name works on every page after reload
22. **API response shape** — `success` field is a boolean (`true`/`false`), not a string. Always check `body.success === true` not `body.status === 'success'`. The backend responseHelper.js was fixed to match this.
23. **CANCELLED on blood requests** — written by the cancel route only (`PATCH /:id/cancel`), never via the status update route (`PATCH /:id/status`). Staff cannot set Cancelled via the status route. Frontend shows CANCELLED as a display status only — never as a staff action button option.
24. **Blood drive fields** — the actual DB has many more fields than the contract originally documented: venue_name, venue_type, building, floor_room, street_address, city, province, postal_code, contact_person, slots_available, description, cancellation_reason. Always verify field names from the model file before building forms.
25. Donor duplicate check — backend uses government ID to detect duplicate
donors and returns 409. Frontend must show search-first flow on registration
page and handle 409 with a clear "already registered, search for them" message.
26. Donor email required for donation — missing email causes donation step
to fail. Frontend must check and prompt for email before allowing donation.
27. PATCH /api/donors/:id/contact — Volunteer/Phlebotomist contact-only
update. Accepts only email and contact fields. Sending any other field → 400. Not gated by requireBloodDrive — callable without active drive.
28. PATCH /api/donors/:id — Admin + PRC Staff ONLY for full donor edit. Do not expose to Volunteer/Phlebotomist — they get the contact-only endpoint.
29. drive_id on field operations — set by bloodDriveMiddleware from the
user's active assignment. Frontend never sends drive_id in POST bodies.
Field roles without active drive assignment get 403 on POST donor/interview/
screening/donation/collection endpoints.

---

## Pattern for New Features (Web)
1. Check FRONTEND_CONTRACT.md — verify endpoint exists and get exact field names
   If fields not documented, upload the relevant backend model file first
2. featureApi.js — add apiFetch call, return parsed data
3. featureValidation.js — add client-side validation (if form)
4. featureUI.js — build DOM rendering and event handlers
5. HTML page — semantic structure, IDs, absolute CSS/JS paths, entry script link
6. entry file — requireAuth → requireRole → renderNavbar → renderSidebar → feature init
7. Test: loading state (skeleton), success state, error state, empty state, role guard, 401 retry
8. Update FRONTEND_SESSION_STATE.md — mark complete, update next task


## Required Page Loading Order

The pattern now includes revealAppShell() as a mandatory step:

javascriptasync function init() {
  // 1. Auth + role check
  const user = await requireAuth();
  if (!user) return;
  if (!requireRole(user, [ROLES.X])) return;

  // 2. Render shell — zero network calls
  renderNavbar(user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');

  // 3. Reveal shell — MUST be here, before any await
  revealAppShell();

  // 4. Feature content (skeleton inside, then real content)
  await renderFeatureContent(user);
}

revealAppShell() must be called synchronously after the last renderSidebar()
call and before any async operation. Calling it after an await means the shell
stays invisible during the async wait — that is the flash bug.

### Rules:
Step 1 is the only step allowed to block the entire page — it requires
user.role_id before anything else can render correctly
Steps 2 must complete with zero network calls — pure DOM rendering using
data already available from step 1
Never await getUnreadCount() (or any non-critical fetch) before
renderNavbar() — render with unreadCount=0, update the badge afterward
Feature render functions (e.g. renderDrivesTable() in bloodDrivesUI.js)
are expected to internally call showSkeleton() before fetching and
hideSkeleton() after — this is already correctly implemented for Blood
Drives; follow the same internal structure for every new feature
Perceived result: page shell appears within ~50-100ms after auth
resolves; skeleton appears immediately after; real content replaces
skeleton once the feature's API call returns. The user never sees a
blank page.

### NOTE — known minor inconsistency, not a defect, no action required
authService.js's login() does inline technical validation
(if (!email || !password) throw ...) rather than calling a separate
validator function, even though authValidator.js now exists (created for
changePassword()). This is a pre-existing pattern in login() — not
something introduced by the changePassword() work, not a bug, and not
currently worth fixing. Flagged here only so a future session doesn't
"fix" half of authService.js and create a real inconsistency by following
the wrong half as precedent. If touching login() for unrelated reasons in
the future, consider migrating its inline check into authValidator.js to
match the rest of the file — but this is optional cleanup, not a defect.

---

## Things To Never Do

### Structure
- Never put fetch calls in UI files — fetch belongs in Api files
- Never put DOM manipulation in Api files
- Never put business logic in components
- Never write inline styles in JS
- Never skip loading and error states
- Never skip empty states on list/table views
- Never put CSS in HTML files (no style tags)
- Never put JS behavior in HTML files (no onclick attributes)
- Never duplicate a filename even across different folders
- Never use relative paths (../) for CSS or JS links in HTML files — always absolute paths starting with /
- Never override a shared CSS class in a page-specific CSS file — use modifier classes
Never add role-based step restrictions to the field workflow sidebar — both
Volunteer and Phlebotomist can perform all 5 steps by design
Never show a full donor edit form to Volunteer/Phlebotomist — contact update
only via PATCH /api/donors/:id/contact
Never send drive_id in a POST body for field operations
Never allow proceeding to donation step if the selected donor has no email
Never show a blank donor registration form without a search-first step
Never use 'operations' as a sidebar section name — it was renamed to 'general'

### Error Messages
- Never show raw backend/database error messages to users
- Never use generic "Something went wrong" without context
- Never show technical details (stack traces, SQL errors, model names) to users
- Always follow the three-part formula: what happened, why, clear action

### Backend Contract
- Never compute drive status on the frontend
- Never skip sequential medical workflow steps in the UI
- Never show action buttons for invalid blood request transitions
- Never allow editing identity fields on volunteer/phlebotomist profile form
- Never send requests to endpoints the current role cannot access
- Never show Safe button for QNS collections
- Never show action buttons for Separated blood units
- Never show Cancel button for non-Pending requests
- Never show Cancelled as a staff action option on blood requests

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
- Used relative paths in HTML (../assets/css/) → CSS/JS not found when browser URL is in subfolder
- Entry file in role subfolder used ../ for imports → resolved to wrong path, Express served index.html → all modules failed to load
- Checked body.status === 'success' instead of body.success === true → all API responses silently failed
- Overrode .btn-primary in page CSS → shared class affected, caused style leaks across pages
- Notif badge not rendered when unreadCount === 0 → updateBadge() silently failed after socket event
Used 'operations' as sidebar section name after rename → empty sidebar
Called revealAppShell() after an async await → shell stays invisible during wait
Pointed navbar brand to '/' → two-hop redirect flash on every home click
Let field role proceed to donation without checking donor email → 400 at last step
Showed full donor edit form to Volunteer/Phlebotomist → 403 from backend

---

## main.css — Scope
main.css owns exactly: global reset, base typography, shared buttons, shared form elements,
feedback, toast, modal, skeleton, error boundary, navbar, sidebar, page shell.
Everything else gets its own file.

Phase 1+2: all shared styles in main.css is acceptable.
Phase 4: split into individual files per component/layout.

### Modifier Classes (add to main.css as needed)
- `.btn-full-width` — full-width button variant, used on login page
- `.notif-badge-hidden` — hides notification badge when unread count is 0
  Required alongside always-rendering the badge in navbar.js