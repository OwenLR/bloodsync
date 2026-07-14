# BloodSync Frontend — Rules

## ⚠ AI BEHAVIOR — READ THIS FIRST, EVERY CHAT

### Starting a chat
1. Read RULES.md + STATE.md + GOTCHAS.md completely before responding
2. Confirm understanding of current phase and what is built vs not built
3. Ask what the developer wants to work on — never start implementing immediately
4. Read CONTRACT.md before touching any API-related feature
5. Read ARCHITECTURE.md before touching auth, serving, CSP, or core files

### Before writing any code
- Never assume what an existing file contains — always ask for the current version
- Never assume a function signature or endpoint exists — verify first
- Never assume a field name in an API response — check CONTRACT.md or ask for model file
- If a file was modified in a previous session and not re-uploaded → ask for it
- Past assistance in this chat does not authorize skipping these checks
- Always read the relevant existing JS/HTML file before editing it

### During implementation
- Never write code for a feature before confirming the API endpoint exists in CONTRACT.md
- If CONTRACT.md doesn't document the response field names → upload the backend model first
- Never bundle multiple unrelated changes into one response — one thing at a time
- Always show what changed and why, not just the new code
- If a backend change is needed before the frontend can work → say so explicitly first

### Code quality gates — check before every response
- Does this add ROLES.ADMIN to any field workflow page? → NO. Admin is excluded from all field workflow pages permanently.
- Does this add ROLES.ADMIN to Blood Testing / Blood Units / Inventory Cleaning / Blood Separation / Blood Requests management or detail pages? → NO. Admin is excluded from all 5 of these, frontend-only, permanently.
- Does this use a <select> for phlebotomist? → NO. Use searchableDropdown.
- Does this use raw fetch() instead of apiFetch()? → NO. Only exception: tryRefresh().
- Does this hardcode a role ID, status string, route path, or API path? → NO.
- Does this put fetch calls in a UI file? → NO.
- Does this call revealAppShell() after an await? → NO. Must be before any await.
- Does this use innerHTML with API data? → NO. Always textContent or createElement().

---

## File Map
| File | Read when |
|---|---|
| RULES.md | Every chat — always |
| STATE.md | Every chat — always |
| GOTCHAS.md | Every chat — always |
| CONTRACT.md | Building/modifying API-touching features |
| ARCHITECTURE.md | Touching auth, serving, CSP, socket, core files |

---

## Role Responsibilities — PERMANENT

| Role | Blood Donation Workflow | Management |
|---|---|---|
| Admin | ❌ NEVER — management only | ✅ Full* |
| PRC Staff | ✅ Walk-in (no drive required) | ✅ Branch-scoped |
| Volunteer | ✅ Drive only | ❌ |
| Phlebotomist | ✅ Drive only | ❌ |

*Admin's "Management" access excludes: Blood Testing, Blood Units,
Inventory Cleaning, Blood Separation, and Blood Requests (management +
detail pages) — all 5 are Staff-only at the frontend level despite
backend routes technically permitting Admin. See sessionState.md's
Permanent Rules section for the full list and reasoning behind each
exclusion.

Admin is excluded from all field workflow pages (donorRegistration, donorInterview,
donorScreening, donorDonation). This is permanent. Admin has no branch_id and
creates orphaned records when allowed in the workflow. Do not revert this.

---

## Layer Responsibilities — STRICT

### HTML
- Owns: structure, element IDs, classes, meta tags, CSS/script links
- Never: API calls, business rules, validation, inline CSS, inline JS
- All CSS/JS paths must be absolute (start with `/`) — never `../` or `./`

### CSS (assets/css/)
- Owns: appearance, layout, colors, responsiveness
- Never override a shared class in page CSS — use modifier classes instead
- Modifier classes in main.css: `.btn-full-width`, `.notif-badge-hidden`

### js/core/api.js
- HTTP requests, credential handling, token refresh, retry only
- NEVER use apiFetch() inside tryRefresh() — infinite loop
- NEVER use raw fetch() for API calls except inside tryRefresh()

### js/core/auth.js
- login() returns user — does NOT redirect
- logout() clears session — does NOT redirect
- getCurrentUserSilent() — raw fetch, no refresh, no redirect. LOGIN PAGE ONLY.
- _currentUser is in-memory only — resets on page reload

### js/core/guards/
- authGuard.js: auth checks only → redirects to ROUTES.LOGIN
- roleGuard.js: role checks only → redirectByRole() on failure (not login)

### js/layouts/navbar.js
- Identity + global actions only: brand, display name, notif badge, logout
- Never renders feature nav links — all navigation lives in sidebar only
- Always renders #notif-badge — hidden via .notif-badge-hidden when count is 0

### js/layouts/sidebar.js
- Pure renderer — knows nothing about roles or pages
- Navigation definitions live in constants/sidebarItems.js

### js/entry/ (one file per HTML page)
- Pattern: requireAuth() → requireRole() → renderNavbar() → renderSidebar() → revealAppShell() → feature init
- revealAppShell() MUST be called synchronously after last renderSidebar(), before any await
- Two levels deep from js/ in role subfolders — use ../../ for imports

### js/features/*Api.js — apiFetch calls only, returns parsed data, no DOM
### js/features/*UI.js — DOM + event handlers only, never calls apiFetch directly
### js/features/*Validation.js — client-side validation only, no API calls, no DOM
### js/components/ — reusable UI pieces, may import from constants/ only

---

## Import Pyramid (never import upward)
```
constants/ → core/api.js → core/auth.js → core/socket.js
core/guards/ ← core/auth.js + constants/
layouts/ ← core/ + constants/
components/ ← constants/ only
features/ ← core/api.js + core/formPersist.js + components/ + constants/
entry/ ← everything above
```

---

## Naming Rules
- ALL files: camelCase — donorApi.js, bloodDrives.html, bloodDriveCreate.css
- Folder names (admin, staff, volunteer, phlebotomist, requestor): lowercase
- No duplicate filenames across the project
- IDs (HTML): kebab-case — id="requests-table"
- Classes (CSS): kebab-case — .request-row
- JS targets IDs — CSS targets classes — never mix

---

## Sidebar Sections Per Role
| Role | Sections |
|---|---|
| Admin | 'general', 'management' |
| PRC Staff | 'general', 'management' |
| Volunteer | 'general', 'workflow', 'drive' |
| Phlebotomist | 'general', 'workflow', 'drive' |
| Requestor | 'general' |

Field entry files (js/entry/field/) sidebar branches by role:
```javascript
const isFieldRole = user.role_id === ROLES.VOLUNTEER || user.role_id === ROLES.PHLEBOTOMIST;
if (isFieldRole) {
  renderSidebar(getSidebarItems(user.role_id, 'general'),  'General');
  renderSidebar(getSidebarItems(user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(user.role_id, 'drive'),    'My Drive');
} else {
  // PRC Staff only — Admin excluded from field pages
  renderSidebar(getSidebarItems(user.role_id, 'general'),    'General');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');
}
```

Field entry requireRole:
```javascript
if (!requireRole(user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF])) return;
```

---

## Field Workflow — 4 Steps
Register → Interview → Screening → Donation & Collection

All pages: PRC Staff + Volunteer + Phlebotomist. Admin excluded permanently.
donorCollection.html and donorCollection.js are RETIRED — delete from project.
ROUTES.FIELD.COLLECTION points to donorDonation.html as alias.

Phlebotomist "Performed By" field: searchableDropdown with hidden input
  Field roles: drive participants filtered to role_id=6
  Staff: GET /api/volunteers/available?role=6
  Auto-selects logged-in user if Phlebotomist

Step indicator on all 4 pages: Register → Interview → Screening → Donation & Collection

Contact update role branching:
  Vol/Phleb → PATCH /api/donors/:id/contact (email + contact only)
  Staff → PATCH /api/donors/:id (full edit)

Deferred donor handling:
  Register: deferred donors shown with ⚠ badge, blocked on select
  Interview: deferred donors excluded from dropdown (field roles)
  Screening: interview-deferred donors excluded via _interviewMap
  Donation: already correct — only Eligible screenings shown

  Walk-in (Staff/Admin) only — this session added a distinct cooldown
  concept on top of the above: a deferred/QNS walk-in donor is blocked
  from restarting for DEFERRAL_COOLDOWN_HOURS (constants/deferralRules.js,
  mirrored both sides), then automatically becomes eligible again — NOT a
  permanent block like the field-role behavior above, which is correctly
  permanent-per-drive. See donorCycleRules.js / donorCycleStatus.js.

SessionStorage chain:
  field_donor_id / field_donor_name → set by Registration, cleared by Interview
  field_interview_id / field_interview_donor_id → set by Interview, cleared by Screening
  field_screening_id / field_screening_donor_id → set by Screening, cleared by Donation
  field_donation_id / field_donation_donor_id → set by Donation, cleared by Collection
  (Collection is last step — no further writes. Donation->Collection is a
  same-page transition, added this session as a fallback alongside the
  in-memory _createdDonation reference — see gochas.md #65 for why the
  fallback was needed.)

---

## API Response Shape
```javascript
// Always check both:
if (!res.ok || !body.success) { /* handle error */ }
// success is boolean — never check body.status === 'success'
```
- 401: apiFetch auto-refreshes → redirects to login if refresh fails
- 403 on field routes: no active drive (not a permissions error)
- 500: show generic message only — never expose body.message

---

## Error Messages — 3-Part Formula
1. What happened
2. Why it happened
3. What to do next

Validation errors → inline next to field (not toast)
Action failures → inline near button
500 → "An unexpected error occurred. Please try again."
Never dump raw backend messages on screen.

---

## Security
- Never innerHTML with user/API data — always textContent or createElement()
- Never store tokens in localStorage/sessionStorage — httpOnly cookies
- Never send Authorization header on web
- Never send user_id in request bodies — backend reads from JWT
- Never send branch_id unless endpoint explicitly requires it

---

## UX Patterns
- Load shell first → skeleton → data (never block page on data)
- Every list/table needs an empty state (why empty + what to do)
- Button loading state: disable + change text to "Saving…" during async
- Strip non-digits from phone numbers before sending
- Birthdate: normalize to YYYY-MM-DD before sending
- Pre-fill known data (branch_id from JWT, drive_id from context)

---

## Pattern for New Features
1. Verify endpoint in CONTRACT.md — if fields undocumented, upload backend model first
2. featureApi.js — apiFetch call, return parsed data
3. featureValidation.js — client-side validation
4. featureUI.js — DOM + event handlers
5. HTML — semantic structure, absolute paths, entry script
6. entry file — requireAuth → requireRole → navbar → sidebar → revealAppShell → feature
7. Test: skeleton, success, error, empty state, role guard
8. Update STATE.md