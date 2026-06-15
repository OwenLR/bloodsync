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
  credentials: 'include', // REQUIRED — sends the httpOnly cookie
  headers: { 'Content-Type': 'application/json' }
});
```

### Never do this on web
```javascript
// WRONG — there is no token to read
headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
```

### Login (web)
```
POST /api/auth/login
Body: { email, password }
// No x-client-type header
```
Response sets two httpOnly cookies. The user object is in `body.data.user`.
`first_name`, `last_name`, `email`, `role_id`, `branch_id` are all available at login,
and also on every subsequent GET /api/auth/me call (see section 3) — both include
name fields, so the navbar display name works consistently after page reloads.

### Logout (web)
```
POST /api/auth/logout
// No body — refresh token cookie sent automatically
```

### Refresh (web)
```
POST /api/auth/refresh
// No body — refresh token cookie sent automatically
// Response body.data is null — this is correct, do not error on null
```

### 15-minute access token — 401 handling
apiFetch intercepts 401, calls refresh, retries once. If refresh fails, redirects to login
and throws Error('Session expired'). Never use apiFetch() inside tryRefresh() — infinite loop.

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
Response includes `access_token` and `refresh_token` in body.data.
Store both in expo-secure-store — never AsyncStorage (not encrypted).

### Refresh (mobile)
```
POST /api/auth/refresh
Headers: { x-client-type: mobile }
Body: { refresh_token: "<stored>" }
```
Returns new access_token and refresh_token. Old refresh token is invalidated immediately.
Replace both in secure storage.

### Logout (mobile)
```
POST /api/auth/logout
Headers: { x-client-type: mobile, Authorization: Bearer <token> }
Body: { refresh_token: "<stored>" }
```

---

## 3. GET /api/auth/me — Current User

Returns JWT payload fields plus first_name/last_name from a DB lookup
(userModel.getUserById()).

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "email": "...",
      "role_id": 2,
      "branch_id": 1,
      "first_name": "Juan",
      "last_name": "dela Cruz"
    }
  }
}
```

This endpoint is the source of truth for navbar display name on every page.
The in-memory `_currentUser` cache in auth.js does NOT survive page reload
(multi-page app, not SPA) — every new page calls requireAuth() → getCurrentUser()
→ GET /api/auth/me, and the name fields come from this DB lookup, not from a
stored login response.

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

Always check both `res.ok` AND `body.success`:
```javascript
const res  = await apiFetch('/api/donors');
const body = await res.json();
if (!res.ok || !body.success) {
  // show body.message for 4xx, generic message for 5xx
  return;
}
// use body.data
```

`body.message` is safe to show for 4xx errors.
For 500, show generic message only — never expose raw server error.

---

## 5. Common Error Codes Reference

| Status | Meaning | Frontend action |
|---|---|---|
| 400 | Validation failed or business rule violated | Show body.message |
| 401 | Token expired or missing | apiFetch auto-refreshes → redirect if fails |
| 403 | Wrong role OR no active drive (field roles) | Show specific message — see below |
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
- Login: 5 attempts / 15 min / IP → "Too many login attempts. Please wait 15 minutes."

---

## 6. User Roles and Pages

| role_id | Role | Client | Notes |
|---|---|---|---|
| 1 | Admin | Web | Full access, no branch restriction |
| 2 | PRC Staff | Web | Branch-scoped — cannot manage other branches |
| 3 | Donor | — | Not a login role, no frontend page |
| 4 | Requestor | Mobile (+ web fallback) | Self-register, submit requests |
| 5 | Volunteer | Web | Field ops, requires active drive |
| 6 | Phlebotomist | Web | Field ops, requires active drive |

ROLES.DONOR (3) has no frontend login path — redirectByRole() falls back to login for role 3.

---

## 7. Blood Drive Rules

### Status — never recompute on frontend
Drive status is computed from PHT time on every backend read. Display what the API returns.
Valid statuses: `Upcoming`, `Ongoing`, `Ended`, `Cancelled`

### Field role gate
Volunteers and Phlebotomists need an active drive assignment to perform field operations.
Backend sets req.drive_id via bloodDriveMiddleware. 403 = no active drive.

### drive_id NULL
On interviews, screenings, donations, collections — NULL drive_id means walk-in (Admin/Staff).
This is correct. Do not show an error.

### drive_id propagation
Frontend never sends drive_id. It is set automatically by bloodDriveMiddleware from the
server-side assignment lookup. Never include drive_id in POST bodies for field operations.

### PRC Staff branch scope
PRC Staff can only create/manage drives for their own branch.
Backend returns 403 if they try to manage another branch's drive.

### Confirm/decline links (email)
`GET /api/blood-drives/confirm?token=xxx&action=confirm` returns HTML, not JSON.
This is a browser link from email — the frontend never calls it programmatically.

---

## 8. Sequential Medical Workflow

Strictly enforced server-side. A 400 on any step usually means the prior step is
incomplete or did not pass — do not show generic error, guide the user to check the
previous step.

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

### Critical field name: interview_id
`POST /api/interview-answers` body uses `interview_id` — NOT `screening_id`.
This was a bug that was fixed architecturally. Using screening_id returns 400.

### Interview answers format
```json
{
  "interview_id": 1,
  "donor_id": 1,
  "answers": [
    { "question_id": 1, "answer": "YES" },
    { "question_id": 2, "answer": "NO" }
  ]
}
```
`answer` must be exactly `"YES"` or `"NO"` — uppercase, backend rejects lowercase.

### Deferral
If screening_result is `Deferred`, a deferral record is created automatically.
Frontend does not create deferrals manually — just display what the API returns.

### Donor email required
Required at donor registration (frontend validation + backend validation).
Also enforced at donation time — if donor has no email, POST /api/donations returns 400.
Both frontend and backend enforce this. Do not allow donor registration without email.

### Same-day deferral blocking
A deferred donor cannot donate on the same day — enforced server-side.

### Active deferral blocking
An active deferral blocks donation regardless of other eligibility — checked server-side.

---

## 9. Blood Request Rules

### Status transitions — only show valid buttons
```
Pending  → Approved  (staff only)
Pending  → Rejected  (staff only)
Approved → Released  (staff only)
Approved → Rejected  (staff only)
```
Never show Approve on an already-Approved request.
Never show Cancel unless status is Pending (backend scopes cancelRequest to status=Pending).

### FEFO auto-assignment
On Approved, blood units are auto-assigned by nearest expiry date (First Expired, First Out).
Frontend never controls which units are assigned.

### Race condition protection
SELECT FOR UPDATE prevents two staff members double-approving the same request.
The second approval returns 400 with a clear message.

### cancelRequest scoping
Backend scopes cancel to user_id AND status=Pending. If the request is not Pending
or does not belong to the requestor, backend returns 404. Only show Cancel on
Pending requests that belong to the current requestor.

### Requestors see only own requests
GET /api/blood-requests is scoped server-side — no filter parameter needed.

### Socket: blood_request_new
Fired to branch staff rooms when a requestor submits a request.
On blood-requests page: prepend new row to table.
Always: increment notification badge.

### Socket: blood_request_status
Fired to requestor's private room (user_${user_id}) on status change.
Mobile only — requestors use mobile.

---

## 10. Blood Unit Rules

### Separate action
Show "Separate" button only when: `component === 'Whole Blood'` AND `status === 'Available'`
After separation: source unit status becomes `Separated` — terminal, hide all action buttons.
Three new Pending collections are created automatically (PRBC, Platelets, FFP).

### Terminal statuses — hide all action buttons
`Released`, `Disposed`, `Withdrawn`, `Separated`, `Expired`
No status update is allowed after reaching these. Backend rejects with 400.

### Collection → unit creation
When a collection is marked `Safe`, a blood unit is automatically created in inventory.
Frontend does not create units manually.

### QNS collections
If `is_qns: true` on a collection, hide the Safe button. Backend rejects Safe for QNS with 400.

---

## 11. File Uploads

- Allowed MIME types: image/jpeg, image/png, image/jpg, application/pdf
- Max size: 5MB
- Use FormData — do NOT set Content-Type manually (browser sets multipart boundary)
- apiFetch detects FormData and skips Content-Type header automatically

```javascript
const formData = new FormData();
formData.append('profile_img', fileInput.files[0]);

const res = await apiFetch('/api/volunteers/register', {
  method: 'POST',
  body: formData,
  // do NOT set Content-Type here
});
```

---

## 12. Notifications

### REST endpoints
```
GET    /api/notifications              — all notifications for current user
GET    /api/notifications/unread-count — { data: { count: 3 } }
PATCH  /api/notifications/:id/read    — mark one read (scoped to own)
PATCH  /api/notifications/read-all    — mark all read
```

### Socket rooms (assigned server-side from handshake.auth)
- Admin → `branch_${branch_id}` + `admin_global`
- PRC Staff → `branch_${branch_id}`
- Volunteer/Phlebotomist → `branch_${branch_id}`
- Requestor → `user_${user_id}` (private)

Frontend never emits join_room — rooms are assigned server-side on connect.

### Socket connection (web)
```javascript
socket = io(url, {
  auth: { user_id, role_id, branch_id },
  withCredentials: true,
});
```

### Socket events
| Event | Received by | Trigger | Frontend action |
|---|---|---|---|
| `blood_request_new` | Admin, PRC Staff | Requestor submits request | Increment badge, prepend row if on page |
| `blood_request_status` | Requestor (mobile) | Staff approves/rejects/releases | Update request card status |
| `inventory_low` | Admin, PRC Staff | Daily cron 8AM PHT | Increment badge |
| `inventory_expiring` | Admin, PRC Staff | Daily cron 8AM PHT | Increment badge |

`blood_drive_assigned` and `donor_post_extraction` are email-only — no socket event for frontend.

### Notification badge ownership
- navbar.js owns the `#notif-badge` DOM element placeholder
- features/notifications/notificationUI.js owns the updateBadge() function
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

### Business rules the frontend must enforce (backend also rejects)
| Rule | Where |
|---|---|
| Donor workflow is sequential | All field operation pages |
| Only show valid blood request transition buttons | Blood requests page |
| Volunteer/Phlebotomist identity fields are read-only | Profile edit form |
| Drive status Ended/Cancelled — no edit allowed | Drive edit form |
| Blood unit terminal states — no status update button | Blood units page |
| QNS collections cannot be marked Safe | Collection status form |
| Requestors cannot see blood collections or blood units | Role-based page access |
| Only show Separate button for Whole Blood + Available | Blood units page |
| Cancel only on Pending requests | Blood requests page |
| Donor email required | Donor registration form |
| answer values must be uppercase YES/NO | Interview answers form |

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
  <link rel="stylesheet" href="../../assets/css/main.css" />
  <link rel="stylesheet" href="../../assets/css/pages/pageName.css" />
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
  <!-- <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script> -->
  <script type="module" src="../../js/entry/pageName.js"></script>
</body>
</html>
```

### Entry file pattern
```javascript
import { requireAuth }        from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { getSidebarItems }    from '../../constants/sidebarItems.js';
import { ROLES }              from '../../constants/roles.js';
import { getUnreadCount }     from '../notifications/notificationApi.js';
// import { initSocket }      from '../../core/socket.js'; // only if real-time needed

async function init() {
  const user = await requireAuth();
  if (!user) return;

  if (!requireRole(user, [ROLES.ADMIN, ROLES.PRC_STAFF])) return;

  const unreadCount = await getUnreadCount();
  renderNavbar(user, unreadCount);

  clearSidebar();
  renderSidebar(getSidebarItems(user.role_id, 'operations'), 'Operations');
  renderSidebar(getSidebarItems(user.role_id, 'management'), 'Management');

  // feature init
}

init();

### Component Pattern
.btn-full-width modifier class exists in login.css — use this pattern for any page that needs a full-width button variant instead of overriding .btn-primary directly.

```

### Feature folder pattern
```
features/donors/
├── donorApi.js         — apiFetch calls only, no DOM
├── donorUI.js          — DOM rendering only, no apiFetch
└── donorValidation.js  — input validation only
```

---

## 15. Environment and Hosting

- Backend local: `http://localhost:3000`
- Frontend local: Live Server (VS Code) on `frontend/` folder
- Production: Railway — Express serves frontend via `express.static`
- Mobile: Expo — separate from Railway

```javascript
// constants/apiConfig.js
export const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : ''; // empty string = same origin on Railway
```

Empty string in production means all `apiFetch('/api/...')` calls resolve to the
Railway domain automatically — no hardcoded production URL needed.

Hostinger retained for DNS only — do not use it for file hosting.

---

## 16. Things That Look Wrong But Are Intentional

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
19. Requestor GET /api/blood-requests shows only own requests — correct, scoped server-side, no filter needed
20. FEFO unit assignment on Approved — correct, backend picks units by nearest expiry, frontend never controls this
21. GET /api/auth/me does a DB lookup (not pure JWT decode) — correct, added
    deliberately so first_name/last_name are available on every page load for
    navbar display, since the in-memory cache resets on navigation