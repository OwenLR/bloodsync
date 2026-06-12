# BloodSync — Frontend Developer Notes

## Purpose of This File
Everything the frontend needs to know about how the backend is built — contracts,
gotchas, naming rules, auth behavior, and role logic — so the frontend doesn't
re-discover these by debugging failures.

This file focuses on what the frontend specifically needs to know and act on.

---

## 0. Client Types — Web vs Mobile

BloodSync has two frontend clients:

| Client | Technology | Users | Auth method |
|---|---|---|---|
| Web app | HTML + CSS + Vanilla JS | Admin, PRC Staff, Volunteer, Phlebotomist | httpOnly cookies |
| Mobile app | React Native | Requestors (primary), web as fallback | Bearer token in header |

The backend supports both via client-type detection. Every mobile request must
send the header:
```
x-client-type: mobile
```
Without this header, the backend treats the request as a web client.

---

## 0.1 Development Approach — Functionality First

Build in this order, no exceptions:
1. **Bare HTML + working JS** — correct pages, API calls wired, role routing, socket connected
2. **Functional but unstyled** — forms submit, tables populate, errors show, real-time works
3. **Design pass last** — CSS, colors, spacing, polish

Do not write CSS during phase 1 or 2. Design is additive — it can always be applied
later without touching JS logic. Getting the wiring right is the hard part.

### Rule to follow now that pays off during the design pass
Use **semantic, stable IDs** on every element that JS targets (`id="requests-table"`,
`id="error-msg"`). When the design pass comes, add classes for styling. JS targets IDs,
CSS targets classes — the two never conflict.

```html
<!-- Correct — functional first pass, no styling -->
<h1>Blood Requests</h1>
<p id="error-msg"></p>
<table id="requests-table">
  <thead>
    <tr><th>Reference No</th><th>Blood Type</th><th>Status</th><th>Actions</th></tr>
  </thead>
  <tbody></tbody>
</table>
```

---

## 1. Auth — Web (httpOnly Cookies)

**The web frontend cannot read the access token.** It is stored in an httpOnly
cookie. JavaScript has zero visibility into it. The browser sends it automatically
on every request.

### What this means for every fetch call
```javascript
fetch('/api/...', {
  credentials: 'include', // REQUIRED — sends the httpOnly cookie
  headers: { 'Content-Type': 'application/json' }
})
```

**Never do:**
```javascript
// WRONG — there is no token to put here
headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
```

### Login (web)
```
POST /api/auth/login
Body: { email, password }
// No x-client-type header — omit it for web
```
On success, the backend sets two httpOnly cookies. No token in response body.
Redirect after 200.

### Logout (web)
```
POST /api/auth/logout
// No body needed — refresh token read from cookie automatically
```

### Token refresh (web)
```
POST /api/auth/refresh
// No body needed — refresh token cookie sent automatically
```

### The 401 problem — 15-minute expiry
The access token expires in **15 minutes**. Build a fetch wrapper that handles
this automatically:

```javascript
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });

  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (refreshRes.ok) {
      // Retry original request with new cookie
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers }
      });
    } else {
      window.location.href = '/index.html';
      return;
    }
  }

  return res;
}
```

Use `apiFetch` everywhere. Never use raw `fetch` for API calls.

---

## 2. Auth — Mobile (Bearer Token)

Mobile uses standard Bearer token auth stored in `expo-secure-store`
(never AsyncStorage — it is not encrypted).

### Required header on every request
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
Response body contains both tokens:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "abc123..."
  }
}
```
Store both in `expo-secure-store`.

### Token refresh (mobile)
```
POST /api/auth/refresh
Headers: { x-client-type: mobile }
Body: { refresh_token: "<stored_refresh_token>" }
```
Response returns new access_token and refresh_token. Replace both in
secure storage. Old refresh token is invalidated immediately on use.

### Logout (mobile)
```
POST /api/auth/logout
Headers: { x-client-type: mobile, Authorization: Bearer <access_token> }
Body: { refresh_token: "<stored_refresh_token>" }
```

### The 401 problem on mobile
Same pattern as web — intercept 401, call refresh, retry:

```javascript
async function apiFetch(url, options = {}) {
  const accessToken = await SecureStore.getItemAsync('access_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-client-type': 'mobile',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers
    }
  });

  if (res.status === 401) {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-type': 'mobile'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (refreshRes.ok) {
      const { data } = await refreshRes.json();
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);

      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-client-type': 'mobile',
          'Authorization': `Bearer ${data.access_token}`,
          ...options.headers
        }
      });
    } else {
      // Session dead — redirect to login screen
      router.replace('/login');
      return;
    }
  }

  return res;
}
```

---

## 3. Standard API Response Shape

All backend responses use `responseHelper`. Always expect this shape:

### Success (2xx)
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

### Error (4xx / 5xx)
```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

The `message` field is safe to display to users for 4xx errors. For 500,
show a generic message — do not expose raw server errors.

```javascript
const res = await apiFetch('/api/donors');
const body = await res.json();

if (!res.ok || !body.success) {
  showError(body.message);
  return;
}
// Use body.data
```

---

## 4. User Identity — Never Send user_id in Request Body

The backend reads user identity from the verified JWT, not from the request body.

```javascript
// WRONG
body: JSON.stringify({ user_id: currentUser.id, blood_type: 'A+' })

// RIGHT — backend reads user_id from token automatically
body: JSON.stringify({ blood_type: 'A+' })
```

### Getting current user info for display
The frontend cannot decode the JWT (web: it's in httpOnly cookie; mobile: don't
decode JWTs in the app). Call a profile endpoint after login to get display info:
```
GET /api/users/me
```
Store name, role_id, branch_id in memory or state for UI use.

---

## 5. Role-Based Pages

| role_id | Role | Client | Notes |
|---|---|---|---|
| 1 | Admin | Web | Full access |
| 2 | PRC Staff | Web | Branch-scoped |
| 3 | Donor | — | Not a login role |
| 4 | Requestor | Mobile (+ web fallback) | Submit requests, view availability |
| 5 | Volunteer | Web | Field operations, requires active drive |
| 6 | Phlebotomist | Web | Field operations, requires active drive |

### Field role gate (Volunteer and Phlebotomist)
If they are not assigned to an active blood drive, the backend returns **403**
on all field operation routes. Show:
"You are not assigned to an active blood drive. Please contact your coordinator."

Do not treat this 403 as a generic access denied — on field routes it almost
always means no active drive assignment.

---

## 6. API URL Conventions

All routes are kebab-case:
```
/api/blood-collections     ✓
/api/bloodCollections      ✗
```

### Complete route base paths
```
/api/auth
/api/users
/api/donors
/api/donor-interviews
/api/interview-answers
/api/screenings
/api/donations
/api/blood-collections
/api/blood-units
/api/blood-requests
/api/blood-drives
/api/deferrals
/api/interview-questions
/api/branches
/api/hospitals
/api/roles
/api/notifications
/api/volunteers/me
/api/register
```

---

## 7. Blood Drive Workflow

### Drive status is computed on the backend
Never compute drive status on the frontend. The backend corrects it on every
read. Just display what the API returns.

Valid statuses: `Scheduled`, `Active`, `Ended`, `Cancelled`

### Participant confirmation email
Clicking confirm/decline in the assignment email hits:
```
GET /api/blood-drives/confirm?token=xxx&action=confirm
GET /api/blood-drives/confirm?token=xxx&action=decline
```
This is a public endpoint — no auth needed. Returns HTML, not JSON.
The frontend does not handle this — it's a standalone browser link.

### PHT timezone
All datetimes are TIMESTAMPTZ. Apply UTC+8 when displaying to users.

---

## 8. Sequential Medical Workflow

Strictly enforced server-side:
```
Donor Registration → Interview → Screening → Donation → Blood Collection
```
Do not let users skip steps — the backend rejects them. A 400 on a step
usually means a prior step was not completed or did not pass.

---

## 9. Blood Request Status Transitions

```
Pending → Approved
Pending → Rejected
Approved → Released
Approved → Rejected
```
Only show action buttons for valid transitions. Don't show "Approve" on an
already-Approved request. Don't show "Cancel" unless status is Pending
(backend scopes cancelRequest to user_id AND status=Pending — it returns
null and 404 if either condition fails).

---

## 10. File Uploads

- **Allowed types**: image/jpeg, image/png, image/jpg, application/pdf
- **Max size**: 5MB
- Use `FormData` — do NOT set Content-Type manually (browser sets multipart boundary)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch('/api/...', {
  method: 'POST',
  credentials: 'include', // web
  body: formData
});
```

For mobile, same pattern — React Native's FormData works the same way.
Add `x-client-type: mobile` and `Authorization` headers but omit Content-Type.

---

## 11. Notifications

### REST endpoints
```
GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### Socket.io rooms
- Staff/Admin → joined to `branch_${branch_id}` on connect
- Admin → also joined to `admin_global`
- Requestors → joined to `user_${user_id}` (private — request status updates)

### Socket.io (web — staff/admin)
```javascript
const socket = io('/', { withCredentials: true });
socket.emit('join_room', `branch_${user.branch_id}`);
socket.on('blood_request_new', (data) => { showNotificationBadge(); });
```

### Socket.io (mobile — requestors)
Requestors receive real-time status updates via their private `user_${user_id}` room.
Connect with Bearer token — the backend reads it to identify the user and assign the room:
```javascript
const socket = io(API_BASE_URL, {
  extraHeaders: {
    'x-client-type': 'mobile',
    'Authorization': `Bearer ${accessToken}`
  }
});
socket.on('blood_request_status', (data) => {
  // data.request_id, data.status, data.message
  // Update the matching request card in my-requests screen
});
```

### Notification types
| Event | Who receives | Channel |
|---|---|---|
| `blood_request_new` | Branch staff + Admin | Socket + DB |
| `blood_request_status` | The requestor | Socket + DB |
| `inventory_low` | Branch staff + Admin | Email + DB |
| `inventory_expiring` | Branch staff + Admin | Email + DB |
| `blood_drive_assigned` | Assigned volunteer/phlebotomist | Email + DB |

---

## 12. Rate Limiting

- General API: 100 requests / 15 min / IP → **429**
- Login: 5 attempts / 15 min / IP → **429**

Show on 429: "Too many requests. Please wait a moment and try again."
For login 429 specifically: "Too many login attempts. Please wait 15 minutes."

---

## 13. Common Errors Reference

| Status | Meaning | Frontend action |
|---|---|---|
| 400 | Validation failed or business rule violated | Show body.message |
| 401 | Token expired or missing | Auto-refresh → redirect to login if fails |
| 403 | Wrong role OR no active drive (field roles) | Show access denied or drive message |
| 404 | Resource not found | Show not found state |
| 409 | Conflict (duplicate, already exists) | Show body.message |
| 429 | Rate limit exceeded | Show retry message |
| 500 | Server error | Show generic error only |

---

## 14. Blood Unit Separation

### Endpoint
```
POST /api/blood-units/:id/separate
Roles: Admin, PRC Staff only
```
Separates a Whole Blood unit into 3 derived component collections
(Packed Red Blood Cells, Platelets, Fresh Frozen Plasma).

### UI rules
- Show "Separate" button only for units where: `component = 'Whole Blood'`
  AND `status = 'Available'`
- After separation, the source unit status becomes `Separated` — it is terminal,
  no further actions apply
- The 3 derived collections appear as new Pending entries in blood collections

### Reservations now include branch_name
`getReservationsByRequest` response includes `branch_name` from a join on branches.
Use this to show the requestor which branch each reserved unit is coming from on
the request detail view.

---

## 15. Folder Structure

### Web app (Vanilla JS)

`assets/` = static resources only (CSS, images). Application code lives in `js/`.

```
frontend/
├── index.html                        ← Login page
│
├── assets/
│   ├── css/
│   │   ├── main.css                  ← Global styles, variables, resets
│   │   └── features/
│   │       ├── donors.css
│   │       ├── blood-requests.css
│   │       ├── inventory.css
│   │       ├── notifications.css
│   │       └── reports.css
│   └── img/
│
├── js/
│   ├── core/                         ← Shared infrastructure — loaded on every page
│   │   ├── api.js                    ← apiFetch wrapper (credentials, 401 retry) — BUILD FIRST
│   │   ├── auth.js                   ← login(), logout(), redirectByRole(), getCurrentUser()
│   │   ├── socket.js                 ← Socket.io init, room join, event export
│   │   ├── utils.js                  ← formatPHT(), showError(), showSuccess(), formatBloodType()
│   │   └── guards/
│   │       ├── authGuard.js          ← requireAuth() — redirect to login if no session
│   │       └── roleGuard.js          ← requireRole(role) — redirect if wrong role
│   │
│   ├── constants/
│   │   └── config.js                 ← API_BASE_URL, ROLES, STATUSES, BLOOD_TYPES, COMPONENTS
│   │
│   ├── layouts/                      ← Page structure elements (not reusable components)
│   │   ├── navbar.js                 ← Renders nav, calls notificationUI for badge
│   │   └── sidebar.js                ← Renders sidebar based on role
│   │
│   ├── components/                   ← Reusable UI pieces, no feature-specific logic
│   │   ├── modal.js                  ← Generic confirm/alert modal
│   │   ├── toast.js                  ← Success/error toast notifications
│   │   └── pagination.js             ← Reusable pagination controls
│   │
│   ├── entry/                        ← Entry point per page — wires up imports and init calls
│   │   ├── dashboardPage.js
│   │   ├── donorsPage.js
│   │   ├── bloodDrivesPage.js
│   │   ├── bloodUnitsPage.js
│   │   ├── bloodRequestsPage.js
│   │   ├── notificationsPage.js
│   │   └── reportsPage.js
│   │
│   └── features/                     ← Domain logic per feature (mirrors backend domains)
│       ├── donors/
│       │   ├── donorApi.js           ← All fetch calls for /api/donors (data only, no DOM)
│       │   ├── donorUI.js            ← DOM rendering, table building, form handling (no fetch)
│       │   └── donorValidation.js    ← Client-side checks before sending to backend
│       ├── bloodRequests/
│       │   ├── bloodRequestApi.js
│       │   ├── bloodRequestUI.js     ← Also handles real-time row injection via socket events
│       │   └── bloodRequestValidation.js
│       ├── inventory/
│       │   ├── inventoryApi.js
│       │   └── inventoryUI.js
│       ├── bloodDrives/
│       │   ├── bloodDriveApi.js
│       │   └── bloodDriveUI.js
│       ├── notifications/
│       │   ├── notificationApi.js
│       │   └── notificationUI.js     ← Badge count, dropdown, mark as read
│       └── reports/
│           ├── reportApi.js
│           └── reportUI.js
│
└── pages/
    ├── dashboard.html
    ├── blood-drives.html
    ├── donors.html
    ├── blood-units.html
    ├── blood-requests.html           ← Connects bloodRequestUI.js socket listener
    ├── notifications.html
    └── reports.html
```

### Layer responsibilities — STRICT

| Folder | Responsibility | Never |
|---|---|---|
| `core/api.js` | apiFetch wrapper only | DOM, business logic |
| `core/auth.js` | login, logout, getCurrentUser, redirectByRole | DOM |
| `core/socket.js` | Socket.io init, room join, event export | DOM manipulation |
| `core/utils.js` | Pure helper functions | fetch, DOM |
| `core/guards/` | Auth and role redirect checks | DOM, fetch |
| `layouts/` | Page structure rendering | Feature-specific logic, fetch |
| `components/` | Reusable UI pieces | Feature logic, fetch |
| `entry/*.js` | Entry point: imports + init calls | Business logic, fetch |
| `features/*Api.js` | fetch calls only, returns parsed data | DOM |
| `features/*UI.js` | DOM manipulation, event handlers | fetch, apiFetch directly |
| `features/*Validation.js` | Client-side input checks | fetch, DOM |
| `constants/config.js` | Static values only | imports from other feature files |

### Layouts vs Components — the distinction

- **layouts/**: page structure elements rendered once per page load — `navbar.js`,
  `sidebar.js`. These define the chrome around the content area.
- **components/**: reusable UI pieces used many times across pages — `modal.js`,
  `toast.js`, `pagination.js`. Called by UI files with data passed in.

### Page entry files — pattern to follow

Each `entry/*.js` is the single entry point for its HTML page.
Wires imports and init calls — no logic of its own:

```javascript
// js/entry/donorsPage.js
import { requireAuth } from '../core/guards/authGuard.js';
import { requireRole } from '../core/guards/roleGuard.js';
import { renderNavbar } from '../layouts/navbar.js';
import { renderSidebar } from '../layouts/sidebar.js';
import { initDonorsTable } from '../features/donors/donorUI.js';
import { ROLES } from '../constants/config.js';

await requireAuth();
await requireRole(ROLES.ADMIN, ROLES.PRC_STAFF);
renderNavbar();
renderSidebar();
initDonorsTable();
```

The HTML page imports only the page entry file:
```html
<script type="module" src="../js/entry/donorsPage.js"></script>
```

### Real-time without React — how it works

```javascript
// js/core/socket.js — initialize once, export instance
const socket = io('/', { withCredentials: true });
export { socket };

// js/features/bloodRequests/bloodRequestUI.js — import and listen
import { socket } from '../../core/socket.js';

socket.on('blood_request_new', (data) => {
    const tbody = document.querySelector('#requests-table tbody');
    if (!tbody) return; // User is on a different page — badge only
    const row = buildRequestRow(data);
    tbody.prepend(row);
});
```

The notification badge in `layouts/navbar.js` listens to the same socket event and
increments independently — both updates happen from one emitted event.

---

### Mobile app (React Native — requestors)

```
mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx                     ← Login screen
│   │   └── register.tsx                  ← Requestor self-registration (with OCR pre-fill)
│   └── (app)/
│       ├── dashboard.tsx                 ← Requestor dashboard (availability overview)
│       ├── my-requests.tsx               ← List of submitted requests + live status
│       └── new-request.tsx               ← Submit new blood request form
│
├── features/
│   ├── auth/
│   │   ├── authApi.ts                    ← login(), logout(), refresh() calls
│   │   ├── authHooks.ts                  ← useAuth() hook
│   │   └── authTypes.ts                  ← Auth-specific types (LoginPayload, etc.)
│   ├── requests/
│   │   ├── requestApi.ts                 ← All fetch calls for /api/blood-requests
│   │   ├── requestHooks.ts               ← useRequests(), useCreateRequest() hooks
│   │   ├── requestTypes.ts               ← Request-specific types (BloodRequest, etc.)
│   │   └── requestValidation.ts          ← Client-side checks before sending to backend
│   └── dashboard/
│       ├── dashboardApi.ts               ← Fetch calls for availability + summary data
│       └── dashboardHooks.ts             ← useDashboard() hook
│
├── components/
│   ├── ui/                               ← Primitives, no domain knowledge
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── request/                          ← Request-domain components
│   │   └── RequestCard.tsx               ← Single request card with live status badge
│   └── notification/                     ← Notification-domain components
│       └── NotificationBadge.tsx         ← Unread count badge, used in app header
│
├── providers/
│   ├── AuthProvider.tsx                  ← Stores current user, exposes useAuth context
│   ├── SocketProvider.tsx                ← Socket.io init with Bearer token, exposes socket context
│   └── NotificationProvider.tsx          ← Unread count state, exposes useNotifications context
│
├── types/                                ← Shared types used across multiple features
│   ├── api.ts                            ← ApiResponse<T>, PaginatedResponse<T>
│   ├── user.ts                           ← User, Role
│   ├── notification.ts                   ← Notification
│   └── common.ts                         ← Shared enums, utility types
│
├── utils/
│   ├── date.ts                           ← formatPHT(), formatDate()
│   └── blood.ts                          ← formatBloodType()
│
├── lib/
│   ├── api.ts                            ← apiFetch wrapper (Bearer token, 401 retry) — BUILD FIRST
│   ├── auth.ts                           ← SecureStore token get/set/clear helpers
│   └── socket.ts                         ← Socket.io init with Bearer token, room join, event export
│
└── constants/
    └── config.ts                         ← API_BASE_URL, ROLES, STATUSES, BLOOD_TYPES
```

`core/api.js` (web) and `lib/api.ts` (mobile) are the most critical files in
both clients. Build them first. Every other file depends on them.

---

## 16. Hosting — Railway Full-Stack

BloodSync runs entirely on Railway. The Express backend serves the frontend as
static files — no separate hosting platform needed.

### Setup in Express (app.js)
```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../frontend')));
```

### Project structure with Railway full-stack
```
bloodsync/                ← monorepo root, one Railway deployment
├── backend/              ← Node.js/Express (existing)
├── frontend/             ← Vanilla JS (new)
└── mobile/               ← React Native/Expo (separate — not served by Railway)
```

### API_BASE_URL by environment
```javascript
// js/constants/config.js
export const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : '';  // empty string = same origin in production (Railway)
```

Empty string in production means all `apiFetch('/api/...')` calls resolve to the
same Railway domain automatically — no hardcoded production URL needed.

### Hostinger
Domain retained for DNS only — point DNS A record to Railway deployment URL.
Do not use Hostinger for file hosting.

---

## 17. Things That Look Wrong But Are Intentional

1. **No token in login response body (web)** — correct. Token is in cookie.
2. **Token in login response body (mobile)** — correct. No cookie on native.
3. **No Authorization header needed (web)** — correct. Cookie handles it.
4. **GET /api/blood-drives/confirm returns HTML** — correct. Browser link, not API.
5. **role_id 3 (Donor) never logs in** — correct. Donors are not system users.
6. **branch_id not needed in most POST bodies** — correct. Backend reads from JWT.
7. **drive_id NULL on some records** — correct. NULL = walk-in (Admin/Staff, no drive).
8. **Requestors use same login endpoint as staff** — correct. Unified users table.
9. **Volunteer/Phlebotomist identity fields read-only** — correct. Server rejects
   updates to first_name, last_name, birthdate, sex even with valid token.
10. **API_BASE_URL is empty string in production** — correct. Same-origin Railway
    deployment means relative paths resolve automatically.
11. **cancelRequest returns 404 if request is not Pending** — correct. Backend scopes
    the cancel query to user_id AND status=Pending. Only show Cancel on Pending requests.
12. **Separated status is terminal on blood units** — correct. No further status
    transitions allowed. Hide all action buttons for Separated units.