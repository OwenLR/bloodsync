# BloodSync Frontend — Developer Notes

## Purpose
Everything the frontend needs to know about how the backend is built — auth behavior,
backend decisions, gotchas, naming rules, role logic, socket setup — so the frontend
doesn't re-discover these by debugging failures.

---

## 0. Two Clients

| Client | Stack | Users | Auth |
|---|---|---|---|
| Web app | HTML + CSS + Vanilla JS | Admin, PRC Staff, Volunteer, Phlebotomist | httpOnly cookies |
| Mobile app | React Native (Expo) | Requestors | Bearer token in header |

Every mobile request must send: `x-client-type: mobile`
Without this header, the backend treats the request as web.

---

## 1. Auth — Web (httpOnly Cookies)

The web frontend cannot read the access token. It is in an httpOnly cookie.
JavaScript has zero visibility. The browser sends it automatically on every request.

### Every fetch call must include
```javascript
fetch('/api/...', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
```

### Never do this on web
```javascript
headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
```

### Login (web)
```
POST /api/auth/login
Body: { email, password }
```
Response sets two httpOnly cookies. User object in body.data.user.

### Logout (web)
```
POST /api/auth/logout
```

### Refresh (web)
```
POST /api/auth/refresh
// Response body.data is null — correct, new cookie set silently
```

### 15-minute access token — 401 handling
apiFetch intercepts 401, calls refresh, retries once. If refresh fails, redirects to login.
Never use apiFetch() inside tryRefresh() — infinite loop.

---

## 2. Auth — Mobile (Bearer Token)

### Required on every request
```
x-client-type: mobile
Authorization: Bearer <access_token>
```

### Login (mobile)
```
POST /api/auth/login
Headers: { x-client-type: mobile }
Body: { email, password }
```
Response includes access_token and refresh_token in body.data.
Store both in expo-secure-store — never AsyncStorage.

---

## 3. GET /api/auth/me — Current User

Does a DB lookup (not just JWT decode) to include first_name/last_name for navbar.
In-memory cache resets on every page navigation (multi-page app).

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id":    1,
      "email":      "...",
      "role_id":    2,
      "branch_id":  1,
      "first_name": "Juan",
      "last_name":  "dela Cruz"
    }
  }
}
```

---

## 4. Standard API Response Shape

### Success (2xx)
```json
{ "success": true, "message": "...", "data": { ... } }
```

### Error (4xx / 5xx)
```json
{ "success": false, "message": "Human-readable error" }
```

CRITICAL: `success` is a boolean — NEVER check `body.status === 'success'`.
The backend responseHelper.js was fixed to use boolean success field.
Old responses used `status: 'success'` (string) — that shape is wrong and was patched.

Always check both:
```javascript
const res  = await apiFetch('/api/donors');
const body = await res.json();
if (!res.ok || !body.success) {
  // show body.message for 4xx, generic message for 5xx
  return;
}
// use body.data
```

---

## 5. Common Error Codes Reference

| Status | Meaning | Frontend action |
|---|---|---|
| 400 | Validation failed or business rule violated | Show body.message |
| 401 | Token expired or missing | apiFetch auto-refreshes → redirect if fails |
| 403 | Wrong role OR no active drive (field roles) | Show specific message |
| 404 | Resource not found | Show not found state |
| 409 | Conflict (duplicate, already exists) | Show body.message |
| 422 | Semantic error (date in past, end before start) | Show body.message |
| 429 | Rate limit exceeded | Show retry message |
| 500 | Server error | Show generic message only |

### 403 on field operation routes
For Volunteer/Phlebotomist, 403 on POST donors/interviews/screenings/donations/collections
almost always means no active drive assignment — not a permissions error.
Show: "You are not assigned to an active blood drive. Please contact your coordinator."

### 429 specifics
- General API: 100 requests / 15 min / IP
- Login: 5 attempts / 15 min / IP

---

## 6. User Roles and Pages

| role_id | Role | Client | Notes |
|---|---|---|---|
| 1 | Admin | Web | Full access, no branch restriction |
| 2 | PRC Staff | Web | Branch-scoped — cannot manage other branches |
| 3 | Donor | — | Not a login role, no frontend page |
| 4 | Requestor | Mobile (+ web) | Self-register, submit requests |
| 5 | Volunteer | Web | Field ops, requires active drive |
| 6 | Phlebotomist | Web | Field ops, requires active drive |

ROLES.DONOR (3) has no frontend login path — redirectByRole() falls back to login.

---

## 7. Blood Drive Rules

### Status — never recompute on frontend
Drive status computed from PHT time on every backend read. Display what the API returns.
Valid statuses: `Upcoming`, `Ongoing`, `Ended`, `Cancelled`

### Blood drive actual fields (from bloodDriveModel.js)
The contract originally had incomplete field documentation. Actual fields:
`drive_id`, `name`, `description`, `status`, `branch_id`, `branch_name`,
`start_datetime`, `end_datetime`, `slots_available`,
`venue_name`, `venue_type`, `building`, `floor_room`,
`street_address`, `city`, `province`, `postal_code`,
`contact_person`, `contact_number`, `contact_email`,
`created_by`, `created_by_first`, `created_by_last`,
`cancelled_by`, `cancelled_by_first`, `cancelled_by_last`,
`cancellation_reason`, `cancelled_at`

### Field role gate
Volunteers and Phlebotomists need an active drive assignment to perform field operations.
Backend sets req.drive_id via bloodDriveMiddleware. 403 = no active drive.

### drive_id NULL
On interviews, screenings, donations, collections — NULL drive_id means walk-in (Admin/Staff).
This is correct. Do not show an error.

### PRC Staff branch scope
PRC Staff can only create/manage drives for their own branch.
Backend returns 403 if they try to manage another branch's drive.

### Confirm/decline links (email)
`GET /api/blood-drives/confirm?token=xxx&action=confirm` returns HTML, not JSON.
Frontend never calls it programmatically.

---

## 8. Sequential Medical Workflow

```
Donor Registration
    ↓
Interview (POST /api/donor-interviews)
    ↓
Interview Answers (POST /api/interview-answers) — field: interview_id, NOT screening_id
    ↓
Screening (POST /api/screenings) — if Deferred, deferral record created automatically
    ↓
Donation (POST /api/donations) — requires Eligible screening + donor email on record
    ↓
Blood Collection (POST /api/blood-collections)
```

A 400 on any step usually means the prior step is incomplete.
`answer` must be exactly `"YES"` or `"NO"` — uppercase, backend rejects lowercase.

---

## 9. Blood Request Rules

### Status transitions
```
Pending  → Approved  (staff only)
Pending  → Rejected  (staff only)
Approved → Released  (staff only)
Approved → Rejected  (staff only)
```

`Cancelled` — set only by `PATCH /:id/cancel` (requestor self-cancel, Pending only).
Never show Cancelled as a staff action option.
Only show Cancel button on Pending requests owned by the current requestor.

---

## 10. Blood Unit Rules

### Separate action
Show "Separate" button only when: `component === 'Whole Blood'` AND `status === 'Available'`
After separation: source unit → Separated (terminal), 3 new Pending collections created.

### Terminal statuses — hide all action buttons
`Released`, `Disposed`, `Withdrawn`, `Separated`, `Expired`

### QNS collections
If `is_qns: true`, hide Safe button. Backend rejects Safe for QNS with 400.

---

## 11. File Uploads

- Allowed: image/jpeg, image/png, image/jpg, application/pdf — max 5MB
- Use FormData — do NOT set Content-Type manually
- apiFetch detects FormData and skips Content-Type header automatically

---

## 12. Notifications

### REST endpoints
```
GET    /api/notifications
GET    /api/notifications/unread-count  → { data: { count: 3 } }
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### Socket connection (web)
```javascript
socket = io(url, {
  auth: { user_id, role_id, branch_id },
  withCredentials: true,
});
```

Frontend never emits join_room — rooms assigned server-side on connect.

### Notification badge ownership
- navbar.js owns #notif-badge DOM element — ALWAYS rendered, hidden via .notif-badge-hidden when count is 0
- features/notifications/notificationUI.js owns updateBadge()
- Entry files fetch unread count from notificationApi.js, pass to renderNavbar(user, count)

---

## 13. Validation Rules Summary

| Field | Rule |
|---|---|
| email | valid email format |
| password | min 8 characters |
| contact / phone | digits only, 7–15 digits |
| birthdate | YYYY-MM-DD, not in future |
| zip_code | digits only, 4–10 digits |
| blood_pressure | NNN/NN format e.g. 120/80 |
| datetime fields | ISO 8601 e.g. 2025-10-01T08:00:00+08:00 |
| answer values | exactly "YES" or "NO" (uppercase) |

### Forgiving input formatting
- Phone numbers: strip non-digits before sending to backend
  Display with formatting but send raw digits to API
  Formatting helpers in utils.js
- Never reject input because of formatting — format it for the user

---

## 14. Protected Page Pattern

### HTML structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page Title — BloodSync</title>
  <!-- ALWAYS use absolute paths starting with / -->
  <link rel="stylesheet" href="/assets/css/main.css" />
  <link rel="stylesheet" href="/assets/css/pages/admin/pageName.css" />
</head>
<body>
  <nav id="navbar"></nav>
  <div class="page-shell">
    <aside id="sidebar"></aside>
    <main id="content" class="page-content">
      <!-- page structure here -->
    </main>
  </div>
  <!-- Only on pages needing real-time: -->
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <!-- ALWAYS use absolute path -->
  <script type="module" src="/js/entry/admin/pageName.js"></script>
</body>
</html>
```

### Entry file pattern (role subfolder — uses ../../ for imports)
```javascript
import { requireAuth }       from '../../core/guards/authGuard.js';
import { requireRole }       from '../../core/guards/roleGuard.js';
import { renderNavbar }      from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }      from '../../layouts/sidebar.js';
import { getSidebarItems }   from '../../constants/sidebarItems.js';
import { ROLES }             from '../../constants/roles.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.ADMIN])) return;

  const unreadCount = 0; // replace with notificationApi.getUnreadCount() when built
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'operations'), 'Operations');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  // feature init
}

init();
```

### Why ../../ not ../
Entry files in role subfolders (js/entry/admin/, js/entry/staff/, etc.) are two levels
deep from js/. Use ../../ to reach core/, layouts/, constants/.
loginPage.js and notFoundPage.js at js/entry/ root use ../ (one level deep).

---

## 15. CSS Pattern Rules

### Never override shared classes in page CSS
Wrong:
```css
/* login.css */
.btn-primary { width: 100%; } /* overrides shared class — leaks to other pages */
```

Right:
```css
/* login.css */
.btn-full-width { width: 100%; padding: 10px; } /* modifier class — isolated */
```

```html
<!-- index.html -->
<button class="btn-primary btn-full-width">Sign in</button>
```

### Modifier classes in main.css
- `.btn-full-width` — full-width button variant
- `.notif-badge-hidden` — hides notification badge when count is 0

---

## 16. Serving Architecture

- Local dev: `npm run dev` in backend/ → visit http://localhost:3000
- Express serves frontend via `express.static('../frontend')`
- All non-API unmatched routes serve index.html (fallback middleware)
- Production: Railway — same origin, no CORS needed between frontend and backend
- ALLOWED_ORIGINS in .env must include http://localhost:3000 for local dev

---

## 17. Helmet CSP Configuration

Configured in server.js to allow:
- Socket.io CDN scripts: `https://cdn.socket.io`
- WebSocket connections: `ws://localhost:3000`, `wss://localhost:3000`
- Cloudinary images: `https://res.cloudinary.com`
- `upgradeInsecureRequests` removed — Railway handles HTTPS at infrastructure level
- Configuration is production-safe as-is

---

## 18. Things That Look Wrong But Are Intentional

1. No token in login response body (web) — correct, token is in cookie
2. Token in login response body (mobile) — correct, no cookie on native
3. No Authorization header needed (web) — correct, cookie handles it
4. GET /api/blood-drives/confirm returns HTML — correct, browser link not API
5. role_id 3 (Donor) never logs in — correct, donors are not system users
6. branch_id not in most POST bodies — correct, backend reads from JWT
7. drive_id NULL on interview/screening/donation/collection — correct, walk-in via Admin/Staff
8. Requestors use same login endpoint as staff — correct, unified users table
9. Volunteer/Phlebotomist identity fields read-only — correct, server rejects even with valid token
10. API_BASE_URL is empty string in production — correct, same-origin Railway resolves paths
11. cancelRequest returns 404 if not Pending — correct, backend scopes query to status=Pending
12. Separated status is terminal on blood units — correct, no further transitions allowed
13. interview_id NOT screening_id in interview answers — correct, architectural fix
14. answer values must be uppercase "YES"/"NO" — correct, backend validates exact case
15. Token refresh body.data is null on web — correct, new cookie is set silently
16. drive_id never sent in POST body — correct, bloodDriveMiddleware sets req.drive_id server-side
17. Deferral created automatically on Deferred screening — correct, frontend never creates deferrals
18. Blood unit created automatically when collection marked Safe — correct, frontend never creates units
19. Requestor GET /api/blood-requests shows only own requests — correct, scoped server-side
20. FEFO unit assignment on Approved — correct, backend picks units by nearest expiry
21. GET /api/auth/me does a DB lookup — correct, added for navbar name fields on every page load
22. success is boolean not string — correct, responseHelper.js was fixed; old shape was wrong
23. CANCELLED in BLOOD_REQUEST_STATUS is for display only — correct, never a staff action option
24. GET /api/volunteers/available registered before /volunteers/:id/profile — correct, prevents route shadowing


### 19. App Shell Reveal Pattern (flash prevention)

Every protected page <body> must start with class="app-loading" in the HTML.
Entry files must call revealAppShell() immediately after renderSidebar() completes,
before any async feature work.

javascriptimport { revealAppShell } from '../../layouts/appShell.js';

renderNavbar(user, 0);
clearSidebar();
renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
revealAppShell();  // ← immediately here, before any await

await renderFeatureContent(user);  // skeleton handles loading inside here

CSS in main.css keeps #navbar, #sidebar, .page-content as visibility:hidden
under app-loading. revealAppShell() swaps body class to app-ready → visible.
Uses visibility (not display:none) to avoid layout shift.

### 20. sessionStorage User Cache

auth.js caches the current user in sessionStorage key 'bs_user' after the
first successful fetch. Subsequent page navigations read from cache — no
GET /api/auth/me network round-trip on every navigation.

Cache is cleared on logout(). Tab close clears it automatically (sessionStorage).
Stored object: display data only (user_id, name, role_id, branch_id). No tokens.

Known tradeoff: role/branch changes by an Admin won't reflect until tab closes.
Acceptable for thesis UAT. Fix: logout() + re-login.

### 21. Sidebar Section Names (CURRENT — as of this session)

'operations' was renamed to 'general'. All entry files must use current names:

RoleSectionsAdmin'general', 'management'PRC Staff'general', 'management'Volunteer'general', 'workflow', 'drive'Phlebotomist'general', 'workflow', 'drive'Requestor'general'

Do not use 'operations' — it no longer exists in sidebarItems.js.

### 22. Collapsible Sidebar Groups

sidebar.js supports group items with children:

javascript{
  label:    'Blood Drive Workflow',
  group:    true,
  children: [
    { label: 'Register Donor',  href: ROUTES.FIELD.REGISTER },
    ...
  ]
}

Rendered as <details>/<summary>, open by default. CSS in main.css under
"Sidebar collapsible groups" section.

### 23. FIELD Shared Routes

Donor workflow pages live under /pages/field/ and are shared between
Volunteer and Phlebotomist. Both roles have identical access.

javascriptROUTES.FIELD.REGISTER    // /pages/field/donorRegistration.html
ROUTES.FIELD.INTERVIEW   // /pages/field/donorInterview.html
ROUTES.FIELD.SCREENING   // /pages/field/donorScreening.html
ROUTES.FIELD.DONATION    // /pages/field/donorDonation.html
ROUTES.FIELD.COLLECTION  // /pages/field/donorCollection.html

Entry files for field pages go in js/entry/field/ and use requireRole
with both [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST].

### 24. Donor Workflow Cooperation Model

WHY: Volunteer and Phlebotomist assigned to the same blood drive can
cooperate freely. One can register all donors while another runs interviews.
One person can also do everything sequentially. The system does not restrict
which assigned user performs which step — the backend only checks that the
user is assigned to an active drive (bloodDriveMiddleware), not their role label.

This is why the sidebar shows all 5 workflow steps to both roles identically.
Do not add role-based step restrictions in the frontend — they don't exist
in the backend either.

### 25. Donor Registration — Search-First Flow

WHY: Donors who donated in past blood drives are already in the system.
Re-registering them creates duplicate records and breaks donation history.
The backend prevents duplicates via government ID check and returns 409.

The registration page must show a search box FIRST. Only if no matching donor
is found should the new registration form appear. If a donor is found, offer
to select them (pre-fills their donor_id for the interview step).

On 409 from POST /api/donors: "This donor is already registered. Please search
for them and select their existing record."

### 26. Donor Email — Required, Blocks Donation if Missing

A donor without an email on record will cause the donation step to fail with
a BusinessError from the backend ("Donor has no email on record.").

On the existing donor selection flow: if the selected donor has no email,
prompt field staff to add one via PATCH /api/donors/:id/contact BEFORE
allowing them to proceed to the donation step. Do not let them get all the
way to donation only to fail there.

### 27. Navbar Brand Link

navbar.js brand link now uses getDashboardHref(user.role_id) — goes directly
to the user's correct dashboard. Previously pointed to '/' which caused a
two-hop redirect (index.html → loginPage.js → redirectByRole). Never point
the brand link to '/' or '/index.html'.