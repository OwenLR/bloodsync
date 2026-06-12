# AI Rules for BloodSync Frontend — New Chat Edition

## FIRST THING TO DO IN EVERY NEW CHAT
1. Read ALL uploaded memory files completely before responding
   - FRONTEND_AI_RULES.MD (this file)
   - FRONTEND_NOTES.MD
   - FRONTEND_CONTRACT.MD
   - FRONTEND_SESSION_STATE.MD
2. Confirm understanding of current frontend state
3. Ask what the developer wants to work on
4. Verify relevant existing files before writing any code
5. Never start implementing immediately without confirming context

## Memory Files — What Each One Is For
- **FRONTEND_AI_RULES.MD** — how to work on the frontend (this file)
- **FRONTEND_NOTES.MD** — developer guide: auth setup, folder structure, build plan, gotchas
- **FRONTEND_CONTRACT.MD** — API surface: endpoints, request/response bodies, validation, socket events
- **FRONTEND_SESSION_STATE.MD** — what's been built, what's next, known issues

## Context Preservation Rules
- Never assume what a file contains — ask for it or read it first
- Never assume a function signature in an existing JS file — ask for the current version
- Never assume an endpoint exists — verify in FRONTEND_CONTRACT.MD first
- If a file was modified in a previous session and not re-uploaded, ask for the current version
- Past assistance does not authorize continuing without re-reading context
- Always check FRONTEND_SESSION_STATE.MD for what phase and step is currently active

---

## Coding Rules

### General
- Always use async/await — no .then().catch()
- Always wrap async calls in try/catch
- Always use the apiFetch wrapper — never raw fetch() for API calls
- Always check response.ok AND body.success before using body.data
- Never send user_id in request bodies — backend reads it from JWT
- Never send branch_id in request bodies unless explicitly required by the endpoint
- Never store tokens in localStorage or sessionStorage — web uses cookies, mobile uses SecureStore
- Never decode the JWT on the frontend — call the profile endpoint instead

### Web (Vanilla JS)
- Always use credentials: 'include' on every fetch call (handled by apiFetch)
- Always use ES modules (import/export) — not CommonJS (require)
- Always target elements by ID for JS — use classes for CSS only
- Never mix styling logic into JS files — JS builds structure, CSS adds style
- Never write inline styles in JS — add/remove classes instead
- Always handle the loading state, success state, and error state for every API call

### Mobile (React Native)
- Always use expo-secure-store for token storage — never AsyncStorage
- Always send x-client-type: mobile header on every request (handled by apiFetch)
- Always send Authorization: Bearer <token> header (handled by apiFetch)
- Use TypeScript — no plain .js files in the mobile project
- Always define types in *Types.ts files — no inline type definitions in components

---

## Architecture Rules — STRICT

### Web Layer Responsibilities
- **core/api.js** — apiFetch wrapper ONLY: credentials, headers, 401 retry, redirect to login
- **core/auth.js** — login(), logout(), getCurrentUser(), redirectByRole() ONLY
- **core/socket.js** — Socket.io init, room join, event export ONLY — no DOM manipulation
- **core/utils.js** — pure helper functions ONLY: formatPHT(), showError(), formatBloodType()
- **constants/config.js** — static values ONLY: API_BASE_URL, ROLES, STATUSES, BLOOD_TYPES
- **features/\*Api.js** — fetch calls ONLY: calls apiFetch, returns parsed data — no DOM
- **features/\*UI.js** — DOM manipulation ONLY: builds elements, handles events — no fetch
- **features/\*Validation.js** — client-side input checks ONLY — no fetch, no DOM
- **components/\*.js** — reusable UI pieces ONLY — no feature-specific business logic
- **pages/\*.html** — structure and script imports ONLY — no inline JS logic

### Layer isolation — NEVER violate
- Api files call apiFetch — never raw fetch, never DOM
- UI files call Api files and manipulate DOM — never call apiFetch directly
- socket.js emits and exports socket instance — UI files import and listen
- Validation files return error arrays — UI files display them
- config.js exports constants — never import from other feature files

### Mobile Layer Responsibilities
- **lib/api.ts** — apiFetch wrapper ONLY: Bearer token, headers, 401 retry
- **lib/auth.ts** — SecureStore token helpers ONLY: get, set, clear
- **features/\*Api.ts** — fetch calls ONLY — no hooks, no components
- **features/\*Hooks.ts** — React hooks ONLY: useQuery/useMutation patterns — no raw fetch
- **features/\*Types.ts** — TypeScript types ONLY
- **features/\*Validation.ts** — input validation ONLY
- **components/\*.tsx** — reusable UI ONLY — no API calls directly

---

## Naming Rules — STRICT

### Web (Vanilla JS)
- Files: camelCase — `donorApi.js`, `bloodRequestUI.js`, `notificationApi.js`
- Folders: camelCase — `bloodRequests/`, `bloodDrives/`
- Functions: camelCase — `fetchDonors()`, `renderRequestRow()`, `validateEmail()`
- Constants: UPPER_SNAKE_CASE — `API_BASE_URL`, `ROLES`, `BLOOD_TYPES`
- IDs (HTML): kebab-case — `id="requests-table"`, `id="error-msg"`, `id="donor-form"`
- Classes (CSS): kebab-case — `.request-row`, `.error-message`, `.btn-primary`
- No PascalCase for any web frontend file
- No underscores in file names

### Mobile (React Native)
- Component files: PascalCase — `Button.tsx`, `RequestCard.tsx`
- Non-component files: camelCase — `requestApi.ts`, `authHooks.ts`, `requestTypes.ts`
- Folders: camelCase — `requests/`, `auth/`, `dashboard/`
- Types/Interfaces: PascalCase — `BloodRequest`, `UserProfile`
- Constants: UPPER_SNAKE_CASE

### API URLs — always kebab-case
```
/api/blood-collections  ✓
/api/bloodCollections   ✗
/api/blood_collections  ✗
```

---

## Folder Rules

### Web
```
frontend/assets/core/        ← api.js, auth.js, socket.js, utils.js
frontend/assets/features/    ← one subfolder per domain
frontend/assets/components/  ← navbar.js, sidebar.js, modal.js
frontend/assets/constants/   ← config.js only
frontend/assets/css/         ← main.css + features/ subfolder
frontend/pages/              ← .html files only
```
- No new folders without developer approval
- No feature logic in components/ — components are display only
- No API calls in components/ — components receive data, don't fetch it

### Mobile
```
mobile/app/        ← screens only (Expo Router)
mobile/features/   ← one subfolder per domain
mobile/components/ ← reusable UI only
mobile/lib/        ← api.ts, auth.ts only
mobile/constants/  ← config.ts only
```

---

## Refactoring Rules
- Read the existing file BEFORE writing a replacement
- Never rewrite what you haven't read
- Present proposed changes before implementing
- Never rename variables, functions, or files without explicit developer approval
- Never change an HTML element's ID without checking what JS targets it
- Never change a CSS class without checking if JS adds/removes it

---

## Error Handling Rules

### Web
- Every apiFetch call must handle three states: loading, success, error
- Always check `res.ok && body.success` — never assume success
- 401 is handled by apiFetch automatically (refresh → retry → redirect)
- 403 on field operation routes means no active drive — show specific message
- 429 means rate limited — show retry message, not generic error
- 500 means server error — show generic message, never expose body.message for 500s
- Never leave catch blocks empty — always show an error state to the user

### Mobile
- Same rules as web for API error handling
- Always handle loading state with ActivityIndicator or skeleton
- Token refresh is handled by apiFetch — components never call refresh directly

---

## Communication Rules
- Ask clarifying questions before implementing complex features
- Present options when multiple approaches exist
- Give brutally honest assessments when asked
- Flag potential problems before they happen
- Always explain what changed and why
- When asked to check files — actually check them, don't assume
- One question at a time when asking for clarification

---

## Things To Never Do

### Auth
- Never put tokens in localStorage or sessionStorage
- Never send Authorization header on web — cookies handle it
- Never decode the JWT to get user info — call the profile endpoint
- Never send user_id in a request body
- Never send branch_id in a request body unless the endpoint explicitly requires it

### API Calls
- Never use raw fetch() — always use apiFetch
- Never hardcode API URLs — always use API_BASE_URL from config.js
- Never hardcode role IDs as numbers — always use ROLES.ADMIN, ROLES.PRC_STAFF etc.
- Never hardcode status strings — always use STATUSES.DRIVE, STATUSES.BLOOD_REQUEST etc.
- Never hardcode blood type strings — always use BLOOD_TYPES array from config.js

### Structure
- Never put fetch calls in UI files — fetch belongs in Api files
- Never put DOM manipulation in Api files — DOM belongs in UI files
- Never put business logic in components — components are display only
- Never write inline styles in JS — add/remove CSS classes instead
- Never skip the loading and error states — every API call needs all three

### Backend Contract
- Never compute drive status on the frontend — display what the API returns
- Never skip sequential medical workflow steps — the backend will reject them
- Never show action buttons for invalid blood request transitions
- Never allow editing identity fields (first_name, last_name, birthdate, sex)
  on the volunteer/phlebotomist profile form
- Never send requests to endpoints the current role doesn't have access to

### Security
- Never use innerHTML with user-supplied data — use textContent or createElement() instead
- Never trust data from the API as safe HTML — the backend sanitizes input but the
  frontend is a separate attack surface
- Never build HTML strings by concatenating user data — always create elements
  programmatically or use textContent for display values

```javascript
// WRONG — XSS risk even if backend sanitized
element.innerHTML = `<td>${donor.first_name}</td>`;

// RIGHT — textContent is always safe for display
const td = document.createElement('td');
td.textContent = donor.first_name;
```
## XSS / DOM Safety Rules

- Never use innerHTML with user-supplied data.
- Never use innerHTML with API response data unless the content is explicitly documented as trusted HTML.
- Prefer textContent for plain text.
- Prefer createElement() + appendChild() for dynamic UI generation.
- Treat all API response fields as untrusted input by default.
- The backend sanitizes input, but frontend code must not rely on backend sanitization for XSS protection.

### Mobile Specific
- Never use AsyncStorage for tokens — use expo-secure-store only
- Never call the refresh endpoint manually in components — apiFetch handles it
- Never forget x-client-type: mobile header — apiFetch handles it

---

## Pattern to Follow for New Features (Web)

1. **Contract check** — verify the endpoint exists in FRONTEND_CONTRACT.MD
2. **Api file** — add the fetch function to the feature's *Api.js
3. **Validation file** — add client-side validation to *Validation.js (if form)
4. **UI file** — build the DOM rendering and event handlers in *UI.js
5. **HTML page** — wire up the imports and initial load call in the .html file
6. **Test** — verify loading state, success state, and error state all work
7. **Update FRONTEND_SESSION_STATE.MD** — mark as complete, update next task

## Pattern to Follow for New Features (Mobile)

1. **Contract check** — verify the endpoint in FRONTEND_CONTRACT.MD
2. **Types file** — define TypeScript types in *Types.ts
3. **Api file** — add the fetch function to *Api.ts
4. **Hooks file** — add the custom hook to *Hooks.ts
5. **Validation file** — add validation to *Validation.ts (if form)
6. **Screen** — build the screen component in app/(app)/*.tsx
7. **Test** — verify loading, success, and error states
8. **Update FRONTEND_SESSION_STATE.MD** — mark complete, update next task

---

## Contract Boundary Rule

The API response is the source of truth — not the database, not the service internals.

### Frontend MUST know
- API route paths (`/api/blood-requests`)
- Request field names (`blood_type`, `request_id`)
- Response field names (`data.request_id`, `data.status`)
- Query parameter names (`?status=Pending`)
- Route parameter names (`/:id`, `/:donor_id`)
- Socket event names (`blood_request_new`)
- Shared constants (`ROLES.ADMIN`, `STATUSES.BLOOD_REQUEST`)

### Frontend must NOT know or depend on
- Database table names
- Database column names not exposed in API responses
- Repository names or functions (`bloodRequestModel.getAll()`)
- Service names or variables (`fefoCandidates`, `assignedInventoryUnits`)
- Domain function names or internals
- Internal backend variable names of any kind

### Why this matters
If the API returns `request_id` but the frontend assumes `id` or `bloodRequestId`,
everything breaks silently. Always use the exact field names from FRONTEND_CONTRACT.MD.

```javascript
// WRONG — guessing field names
const id = body.data.id;
const type = body.data.bloodType;

// RIGHT — exact names from the API contract
const id = body.data.request_id;
const type = body.data.blood_type;
```

### When response field names are not yet documented
Before building any feature, upload the relevant controller and model files so the
exact response field names can be documented in FRONTEND_CONTRACT.MD first.
Never build against undocumented response shapes — verify first, build second.

---

## Backend Contract Reminders (Critical)

These are backend decisions that silently break the frontend if ignored:

1. **Drive status** — computed on backend, never recompute on frontend
2. **interview_id in answers** — NOT screening_id (architectural fix)
3. **drive_id NULL** — means walk-in, not a bug
4. **GET /confirm returns HTML** — not JSON, browser link only
5. **role_id 3 (Donor)** — never logs in, not a system user
6. **Volunteer/Phlebotomist identity fields** — locked server-side, not just UI
7. **QNS collections** — cannot be marked Safe, backend rejects it
8. **FEFO assignment** — happens automatically on request approval, frontend doesn't control it
9. **drive_id propagation** — set at interview, auto-filled downstream, frontend never sends it
10. **Sequential medical flow** — enforced server-side, frontend must guide the user in order

## Known Gotchas — Things That Burned Time Before
- Forgot `credentials: 'include'` → cookies not sent → every request 401
- Used `Authorization` header on web → token not found → 401
- Sent `user_id` in POST body → ignored by backend but looks like it should work
- Hardcoded status string with wrong case → backend rejects silently
- Called socket event before joining room → event never received
- Targeted element by class in JS → breaks when CSS class changes during design pass
- Built UI before confirming endpoint exists → had to rewrite when contract differed