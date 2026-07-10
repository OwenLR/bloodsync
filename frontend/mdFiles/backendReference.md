# BloodSync — Backend Reference (Blood Requests Feature)
# Consolidated from actual uploaded backend source files during the Blood
# Requests build (Sections 1a/1b/1c). Read this instead of re-uploading the
# backend files listed below — this doc reflects their ACTUAL content as of
# this session, including all fixes applied.
#
# Source files consolidated here:
#   bloodRequestController.js, bloodRequestService.js, bloodRequestModel.js,
#   bloodRequestRoutes.js, bloodRequestValidator.js, bloodRequestRules.js,
#   bloodRequestConstant.js, fulfillmentService.js, notificationService.js,
#   notificationModel.js, notificationController.js, notificationRoutes.js,
#   socketHandler.js, bloodUnitModel.js, hospitalModel.js, statusConstants.js,
#   roleMiddleware.js, responseHelper.js, businessError.js, uploadMiddleware.js,
#   uploadHelper.js, cloudinary.js, dateHelper.js, profileModel.js,
#   volunteerProfileController.js, volunteerProfileRoutes.js,
#   inventoryCheckService.js, inventoryRulesDomain.js
#
# If any of these files change on the backend, this doc goes stale — re-paste
# the changed file rather than assuming this doc still matches.

---

## 1. Response Shape — Global Pattern

Every controller uses `utils/responseHelper.js`. Never raw `res.status().json()`.

```js
success(res, data, message=null, statusCode=200)  → { success:true, message?, count? (if array), data }
created(res, data, message)                        → success() with statusCode 201
error(res, message, statusCode=500)                → { success:false, message } — captures to Sentry only on 500
notFound(res, message)                             → error(res, message, 404)
badRequest(res, message)                           → error(res, message, 400)
unauthorized(res, message)                         → error(res, message, 401)
forbidden(res, message)                             → error(res, message, 403)
handleError(res, err)                               → BusinessError → err.statusCode; plain Error → 500
```

`BusinessError(message, statusCode=400)` (`utils/businessError.js`) — thrown by services/domain
for expected failures. Controllers always catch with `response.handleError(res, error)`.

**Frontend rule:** always check `!res.ok || !body.success` — never check `body.status === 'success'`
(old shape, already fixed everywhere except where noted in Known Bugs below).

⚠ **Known bug, fixed this session:** `middleware/roleMiddleware.js`'s `checkRole()` was still
returning the OLD shape (`{status:'error', message}`) on 403 — no `success` field at all. Fixed
to use `response.forbidden()`. If a fresh backend copy doesn't have this fix, re-apply it:
```js
const response = require('../utils/responseHelper');
const checkRole = (allowedRoles) => (req, res, next) => {
    const { role_id } = req.user;
    if (!allowedRoles.includes(role_id)) {
        return response.forbidden(res, 'Access denied. Insufficient permissions.');
    }
    next();
};
```

---

## 2. Blood Request Endpoints — Full Reference

Base path: `/api/blood-requests`. Router file: `bloodRequestRoutes.js`.

### Requestor routes
| Method | Path | Controller fn | Notes |
|---|---|---|---|
| POST | `/` | `createRequest` | multipart/form-data, `upload.single('request_form')` |
| GET | `/my-requests` | `getMyRequests` | scoped to `req.user.user_id` server-side |
| POST | `/fulfillment-options` | `getFulfillmentOptions` | JSON body, read-only planning |
| GET | `/estimate/:branch_id` | `getWaitingTimeEstimate` | |
| PATCH | `/:id/cancel` | `cancelRequest` | Pending-only, direct DB update |
| PATCH | `/:id/received` | `markReceived` | Waiting → Released |

### Staff/Admin routes
| Method | Path | Controller fn | Notes |
|---|---|---|---|
| GET | `/` | `getAllRequests` | Staff auto-scoped to own branch; Admin sees all |
| GET | `/:id` | `getRequestById` | Staff 403 if branch mismatch |
| PATCH | `/:id/status` | `updateRequestStatus` | Staff 403 if branch mismatch |
| PATCH | `/:id/ready` | `markReadyForPickup` | Approved → Waiting; Staff 403 if branch mismatch |

All routes: `verifyToken` + `checkRole([...])`.

### POST `/` (createRequest) — full behavior
Request body (multipart): `hospital_id`, `branch_id`, `patient_name`, `patient_age`, `diagnosis`,
`urgency_level`, `notes`, `items` (JSON string, parsed server-side), `request_form` (file, required).

⚠ **Fixed this session:** file is now REQUIRED. `validateRequestFormFile(req.file)` runs after
`validateCreateRequest`, before upload — 400 if missing. (Previously optional, silently stored
`request_form_path: null`.)

Fields NOT enforced by validator but accepted by the model (frontend currently omits both —
see project notes): `fulfillment_type` (defaults `'Pickup'` if omitted), `delivery_address`,
`preferred_branch_id` (defaults `null` if omitted — dead field, nothing reads it downstream).

Flow: `validateCreateRequest` → `validateRequestFormFile` → `uploadToCloudinary(buffer, 'request_forms')`
→ `bloodRequestService.createRequest(data, items, user_id)` → inserts request row → inserts
`request_items` rows → inserts status log (`null → 'Pending'`, `changed_by_type: 'requestor'`) →
fire-and-forget `notificationService.notifyNewBloodRequest()` (DB notification to branch staff +
socket `blood_request_new` to `branch_{branch_id}` room).

### POST `/fulfillment-options` — full behavior
Body: `items: [{blood_type, component, units_requested}]`, `latitude` (optional), `longitude` (optional).
Read-only — no mutation, no notification, no cache write.

⚠ **Fixed this session:** `bloodRequestValidator.js`'s `validateItems(items, errors)` previously
had NO return statement (implicit `undefined` on both exit paths). This crashed
`fulfillmentService.getFulfillmentOptions()` with `Cannot read properties of undefined (reading
'length')` on EVERY call (500), because that function uses `const errors = validateItems(items, [])`
and reads the return value directly. Now fixed — `validateItems` returns `errors` on both paths.

Response shape:
```js
{
  plans: [
    {
      blood_type, component, units_requested,   // echoed from input item
      plan: {
        canSingleBranch: boolean,
        singleBranchOption: { branch_id, branch_name, latitude, longitude, distance_km, available_count } | null,
        splitOption: [{ branch_id, branch_name, units_to_take, distance_km }],  // empty [] if can't fully cover
        totalAvailable: number
      }
    }
  ],
  recommendation: 'single_branch' | 'split',
  any_insufficient: boolean   // true if any item's totalAvailable < units_requested
}
```
`getDistanceKm()` uses Haversine; if any coordinate is missing/falsy, returns `Infinity` for that
pair — branches sort to the back, but the call never throws. If lat/lng omitted entirely, every
branch gets `Infinity`, so sort is a no-op and branches stay in `branch_name ASC` order from SQL
(alphabetical) — this is how "no location" gracefully degrades, confirmed in code.

**Frontend note (already built, Section 1b):** since `POST /` only accepts ONE `branch_id` for
the whole request, `bloodRequestFulfillmentUI.js` aggregates all items' branch candidates into a
single ranked list (most items fully covered, then nearest) rather than forcing per-item branch
selection. This is safe because `approveRequest()` (see below) already re-checks stock and spills
across branches per item automatically at approval time — the requestor's chosen branch is only a
"primary/home branch" hint, not a hard constraint. **No backend change was made or needed for this.**

### GET `/estimate/:branch_id`
Response: `{ pending_count, estimate: <label>, next_open: <string|null>, is_open: boolean }`.
`estimate` label comes from `WAIT_TIME_ESTIMATES` (queue-depth thresholds, see Constants section) —
never hardcode label strings frontend-side. `is_open` computed from PHT hour vs `OPERATING_HOURS`
(8AM–5PM PHT) in `bloodRequestConstant.js`.

### PATCH `/:id/cancel` (Requestor)
No body. `bloodRequestModel.cancelRequest(id, userId)` — single UPDATE with
`WHERE user_id=$2 AND status='Pending'`, returns `null` if no match (wrong owner or wrong status
→ service throws 403 or 400 accordingly by re-fetching to disambiguate). Bypasses
`VALID_TRANSITIONS` entirely — direct DB write to `'Cancelled'`. **Does NOT call
notificationService** — no DB notification, no socket event. Frontend must update UI from this
call's own response, never from a socket listener.

### PATCH `/:id/received` (Requestor)
No body. Scope check: `request.user_id !== userId` → 403. `assertValidTransition(status, 'Released')`
— only valid from `'Waiting'`. Loops `getReservationsByRequest()`, flips each unit to `'Released'` +
reservation status to `'Released'` with `released_at`. Updates request status, logs
(`changed_by_type: 'requestor'`). Invalidates both cache keys (availability + inventory).
**Does NOT call notificationService** — same as cancel, update UI from the response directly.

### GET `/` (Staff/Admin)
Admin → `bloodRequestModel.getAllRequests()` (all branches).
PRC Staff → `bloodRequestModel.getRequestsByBranch(req.user.branch_id)` — automatic, no 403, just
silently scoped. Both return the same field shape (see Model Field Reference below).

### GET `/:id` (Staff/Admin)
Staff: 403 if `request.branch_id !== req.user.branch_id`.
Response = request fields + `items[]` + `reservations[]` + `logs[]` (see shapes below).

### PATCH `/:id/status` (Staff/Admin)
Body: `status`, `denial_reason` (required if `status === 'Rejected'`, validated in
`validateUpdateRequestStatus`). Staff: 403 if branch mismatch (checked BEFORE calling service).
Routes to one of 4 service functions based on `status` value — see `updateStatus()` router below.

### PATCH `/:id/ready` (Staff/Admin)
No body. Staff: 403 if branch mismatch. Calls `markReadyForPickup()` service (Approved → Waiting).

---

## 3. Blood Request Status Machine

`app/domain/bloodRequestRules.js` — pure functions, no DB/framework deps.

```js
VALID_TRANSITIONS = {
  Pending:  ['Approved', 'Rejected'],
  Approved: ['Waiting',  'Rejected'],
  Waiting:  ['Released', 'Rejected'],
  Released: [],
  Rejected: [],
};
```
`assertValidTransition(current, next)` throws plain `Error` if invalid (not `BusinessError`) —
still caught by the service's callers via `handleError` in the controller, but since it's a plain
Error, it becomes a 500, not a clean 400. Worth knowing if you see an unexpected 500 on a bad
status transition attempt from Section 3's UI.
`Cancelled` is NOT in this table — reachable ONLY via the direct-DB-write `cancelRequest()` path,
never through `PATCH /:id/status`.

### `bloodRequestService.updateStatus(requestId, status, staffId, denialReason)` — router
```js
'Approved' → approveRequest(requestId, staffId)
'Waiting'  → markReadyForPickup(requestId, staffId)
'Released' → releaseRequest(requestId, staffId)
'Rejected' → rejectRequest(requestId, staffId, denialReason)
else       → throw BusinessError('Invalid status transition', 400)
```

### `approveRequest(requestId, staffId)` — the important one for Staff/Admin management UI
- Wrapped in a DB transaction with `SELECT ... FOR UPDATE` (race-condition safe).
- `assertValidTransition(request.status, 'Approved')`.
- For each item: tries `getAvailableUnitsForAssignment(blood_type, component, request.branch_id, units_requested)`
  (FEFO — nearest expiry first, scoped to the request's home branch).
- **If insufficient at home branch:** queries `getAvailableCountByBranch()` across ALL branches,
  filters out the home branch, sums total available everywhere. If grand total (home + others)
  still `< units_requested` → throws `BusinessError` with a message listing which other branches
  have stock, 400 (transaction rolls back — nothing partially applied).
- **If enough exists somewhere:** loops other branches (in the order returned — not necessarily
  distance-sorted, no lat/lng passed here), pulls remaining units via
  `getAvailableUnitsForAssignment()` per branch until `remaining <= 0`.
- Every assigned unit: `updateUnitStatus(unit_id, 'Reserved')` + `createReservation({request_id,
  item_id, unit_id, reserved_by: staffId, branch_id: unit.branch_id, notes:null})` — **reservation's
  branch_id is the UNIT's branch, not the request's branch** — this is what makes multi-branch
  spill actually work correctly for tracking.
- `updateItemFulfilled(item_id, availableUnits.length)` — by the time this runs, the
  insufficient-total case has already thrown, so `availableUnits.length` should always equal
  `units_requested` for every item (barring a race condition slipping past the request-row lock,
  since units aren't individually row-locked).
- On success: request status → `'Approved'`, status log written, cache invalidated (both keys),
  `notifyRequestStatusChange()` fired (DB notification + socket `blood_request_status` to
  `user_{user_id}`).
- **Frontend implication:** a request that gets Approved either fully succeeds (all items
  100% fulfilled across possibly multiple branches) or the whole approval throws and nothing
  changes — there's no "partially approved" state to render.

### `markReadyForPickup(requestId, staffId)` — Approved → Waiting
Units stay `Reserved` (no unit status change here). Just flips request status + logs + notifies.

### `releaseRequest(requestId, staffId)` — Waiting → Released (staff-initiated)
Loops reservations, flips each unit `Reserved → 'Released'`, reservation status → `'Released'` +
`released_at`. Invalidates cache. Notifies requestor.

### `rejectRequest(requestId, staffId, denialReason)` — from Pending, Approved, or Waiting
Loops reservations (if any exist — none yet if rejecting from Pending), flips units back to
`'Available'` (freed), reservation status → `'Cancelled'` (not `'Released'` — different terminal
value, means "never fulfilled" vs "fulfilled then handed over"). Logs `old_status: request.status`
(whatever it was) `→ 'Rejected'`, notes = denial reason. Notifies requestor with `reason` field.

---

## 4. Model Field Reference — `bloodRequestModel.js`

### Request row shape (getAllRequests / getRequestsByBranch / getRequestById — same shape)
```
request_id, user_id, first_name, last_name (requestor, via LEFT JOIN users),
hospital_id, hospital_name (LEFT JOIN hospitals),
branch_id, branch_name (LEFT JOIN branches),
patient_name, patient_age, diagnosis, urgency_level, request_form_path,
fulfillment_type, delivery_address, preferred_branch_id,
status, denial_reason, reviewed_by, reviewed_at, notes, created_at, updated_at
```

### getRequestsByUser (My Requests — narrower, no reviewed_by/notes)
```
request_id, hospital_id, hospital_name, branch_id, branch_name,
patient_name, urgency_level, fulfillment_type, delivery_address,
status, denial_reason, created_at
```

### getItemsByRequest → `request_items` table
```
item_id, request_id, blood_type, component, units_requested, units_fulfilled
```
⚠ Field is `units_requested`/`units_fulfilled` — NOT `quantity` (contract.md previously said
`quantity`, corrected).

### getReservationsByRequest → joined with blood_units + branches
```
reservation_id, request_id, item_id, unit_id, reserved_by, notes, branch_id, status,
released_at, blood_type, component, expiration_date, barcode, branch_name
```
`status` values: `'Reserved' | 'Released' | 'Cancelled'` (RESERVATION_STATUS constant).

### getStatusLogsByRequest → `request_status_logs` table
```
log_id, request_id, old_status, new_status, changed_by_type ('requestor'|'staff'),
changed_by_id, notes, created_at
```

### createRequest(data) — INSERT columns
`user_id, hospital_id, branch_id, patient_name, patient_age, diagnosis, urgency_level,
request_form_path, notes, fulfillment_type (default 'Pickup'), delivery_address (default null),
preferred_branch_id (default null)`

### getPendingCountByBranch(branchId) — used by fulfillmentService's waiting-time estimate
`SELECT COUNT(*) WHERE branch_id=$1 AND status='Pending'`

---

## 5. `bloodUnitModel.js` — functions used by request fulfillment

### `getAvailableCountByBranch(bloodType, component)`
Returns per-branch stock counts for a type+component combo, across ALL branches (not scoped).
```
[{ branch_id, branch_name, latitude, longitude, available_count }]
```
Only `WHERE status='Available' AND expiration_date > NOW()`, `HAVING COUNT > 0` (branches with
zero stock are excluded entirely, not returned with `available_count: 0`).

### `getAvailableUnitsForAssignment(bloodType, component, branchId, limit)`
FEFO — nearest expiry first, scoped to ONE branch.
```
[{ unit_id, blood_type, component, expiration_date, barcode, branch_id }]
```
`LIMIT $4` — caller passes `units_requested` (or `remaining`) as the limit, so it never returns
more rows than needed.

(Other `bloodUnitModel.js` functions — `getAllUnits`, `getUnitById`, `getUnitsByBranchAll`,
`updateUnitStatus`, `markUnitSeparated`, `getInventoryAvailability`,
`getPendingRequestCountByBranch` — are for the Blood Units/Inventory feature, already built.
Not directly relevant to Blood Requests except `updateUnitStatus`, which the request-approval
flow calls to flip units to `'Reserved'`/`'Available'`/`'Released'`.)

---

## 6. `hospitalModel.js` — full file (short, reproduced in full)

```js
getAllHospitals()        → SELECT * FROM hospitals ORDER BY hospital_id ASC
getHospitalById(id)      → SELECT * WHERE hospital_id=$1
createHospital(name, location)   → Admin only, per contract.md role table
updateHospital(id, name, location)
deleteHospital(id)
```
Row shape: `hospital_id, hospital_name, location` (only 3 real columns — `SELECT *` returns
whatever else exists in the table, but nothing else has ever been referenced anywhere in the
codebase). No `address`, `latitude`/`longitude`, or `contact` fields exist on this model.

---

## 7. Notification System — `notificationService.js` / `notificationModel.js`

### Functions relevant to Blood Requests
```js
notifyNewBloodRequest({request_id, branch_id, patient_name, urgency_level})
  → creates one DB notification PER staff member at that branch (staffModel.getStaffByBranch)
  → emits socket 'blood_request_new' to room `branch_{branch_id}`
  → payload: { request_id, patient_name, urgency_level }

notifyRequestStatusChange({request_id, user_id, new_status, patient_name, reason})
  → ONE DB notification to the requestor (user_id)
  → emits socket 'blood_request_status' to room `user_{user_id}`
  → payload: { request_id, new_status, patient_name, reason: reason||null }
  → called for: Approved, Waiting, Released (staff-initiated only), Rejected
  → NEVER called for: cancelRequest, markReceived (both requestor self-actions)
```
Message/title text per status is hardcoded in `notificationService.js` (`messages`/`titles`
objects) — don't duplicate this text frontend-side, just display `notification.title` /
`notification.message` as-is (already built, Notifications feature).

### Notification row shape (`notificationModel.js`)
```
notification_id, user_id, type, title, message, is_read, reference_id, reference_type, created_at
```
`NOTIFICATION_TYPES` relevant here: `BLOOD_REQUEST_NEW`, `BLOOD_REQUEST_STATUS` (exact string
values live in `constants/statuses.js` backend-side — not pasted in this doc, mirror already
exists frontend-side in `constants/notificationTypes.js`, already built).

### Notification endpoints (already built, Section: Notifications)
```
GET    /api/notifications              → own notifications, scoped server-side
GET    /api/notifications/unread-count → { count }
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```
All roles allowed: Admin, PRC Staff, Requestor, Volunteer, Phlebotomist.

---

## 8. Socket Events — `socketHandler.js`

Connection: `io(url, { auth: {user_id, role_id, branch_id}, withCredentials: true })`. Rooms
assigned server-side on connect — frontend never emits `join_room`.

| Role condition | Room joined |
|---|---|
| `role_id === REQUESTOR` (4) | `user_{user_id}` |
| any role with truthy `branch_id` | `branch_{branch_id}` |
| `role_id === ADMIN` (1) | `admin_global` |

Events relevant to Blood Requests: `blood_request_new` (→ branch room), `blood_request_status`
(→ requestor's user room). Full event name constants: `constants/socketEvents.js` (frontend,
already built) — `BLOOD_REQUEST_NEW`, `BLOOD_REQUEST_STATUS`, `INVENTORY_LOW`, `INVENTORY_EXPIRING`.

---

## 9. Constants Reference

### `constants/bloodRequestConstant.js` (backend) — mirrored frontend at same path
```js
MAX_UNITS_PER_REQUEST = 10   // total across all items
MAX_UNITS_PER_ITEM    = 10   // per single line item
WAIT_TIME_ESTIMATES = [
  { maxQueue: 2,        label: 'Usually under 15 minutes' },
  { maxQueue: 5,        label: 'Usually 15–30 minutes'    },
  { maxQueue: 10,       label: 'Usually 30–60 minutes'    },
  { maxQueue: Infinity, label: 'Usually over 1 hour'      },
]
OPERATING_HOURS = { start: 8, end: 17 }   // 8AM–5PM PHT
```

### Blood Request status values (`statusConstants.js` frontend / `constants/statuses.js` backend)
```
Pending | Approved | Waiting | Released | Rejected | Cancelled
```
Frontend constant `BLOOD_REQUEST_STATUS` (in `statusConstants.js`) is currently MISSING a
`WAITING` key — as pasted, it only has:
```js
export const BLOOD_REQUEST_STATUS = Object.freeze({
  PENDING:   'Pending',
  APPROVED:  'Approved',
  RELEASED:  'Released',
  REJECTED:  'Rejected',
  CANCELLED: 'Cancelled',
});
```
Add `WAITING: 'Waiting'` before building Section 2 (My Requests needs to detect Waiting status
for the "Already Received" button) or Section 3 (status badges/transition buttons).

### Blood types / components (`constants/bloodTypes.js`, both sides)
```js
BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
COMPONENTS  = ['Whole Blood','Packed Red Blood Cells','Platelets','Fresh Frozen Plasma']
```

### Roles (`constants/roles.js`, both sides)
```js
ADMIN:1, PRC_STAFF:2, DONOR:3, REQUESTOR:4, VOLUNTEER:5, PHLEBOTOMIST:6
```

---

## 10. File Upload Infrastructure

`middleware/uploadMiddleware.js` — multer, memoryStorage, used for BOTH request-form uploads
and profile-picture uploads (shared middleware, different `folder` param passed at call site):
```js
fileFilter: allows 'image/jpeg', 'image/png', 'image/jpg', 'application/pdf'
limits.fileSize: 5 * 1024 * 1024  // 5MB
```
Route usage: `upload.single('request_form')` (blood requests) / `upload.single('profile_img')`
(volunteer profile) — field name is the only difference.

`utils/uploadHelper.js`:
```js
uploadToCloudinary(buffer, folder) → Promise<secure_url string>   // folder e.g. 'request_forms'
deleteFromCloudinary(publicId)      → Promise
```
`config/cloudinary.js` — just `cloudinary.config({...})` from env vars, nothing else to know.

---

## 11. Profile Pattern Reference (used as the model for file-upload UI in Submit Request)

`volunteerProfileController.js` / `volunteerProfileRoutes.js` / `profileModel.js` — the
PATCH `/api/volunteers/me/profile` flow was used as the reference pattern for how multipart
file uploads + `uploadToCloudinary` + validator-before-upload are wired together. Nothing here
is directly reused by Blood Requests code, but the pattern (`validate → upload if req.file →
call service/model → response.success`) is the same shape `createRequest` follows.

---

## 12. Business Rules Checklist — Frontend Must Enforce (mirrors contract.md, kept in sync)

| Rule | Status |
|---|---|
| Two-step submit: fulfillment-options → submit with chosen branch_id | ✅ built (1b→1c) |
| MAX_UNITS_PER_ITEM / MAX_UNITS_PER_REQUEST caps | ✅ built (1a) |
| Request form file required | ✅ built (1c) + backend now enforces too |
| Only show valid status transition buttons (Pending→Approved/Rejected, Approved→Waiting/Rejected, Waiting→Released/Rejected) | ⏳ needed for Section 3 (Staff/Admin) |
| Cancel button only on own Pending requests | ⏳ needed for Section 2 (My Requests) |
| "Already Received" button only on own Waiting requests | ⏳ needed for Section 2 |
| No socket listener for cancel/markReceived — update from API response directly | ⏳ needed for Section 2 |
| PRC Staff branch-scoping — no frontend filter needed, backend already scopes | ⏳ needed for Section 3 |
| fulfillment_type/delivery_address — never collected, out of scope | ✅ enforced (1c) |
| preferred_branch_id — never collected | ✅ enforced (1c) |

---

## 13. Open Items / Things to Verify Before Building Section 2 or 3

- `BLOOD_REQUEST_STATUS` frontend constant is missing `WAITING` — add before building status
  badges anywhere that displays this status (see Section 9 above).
- Haven't seen `staffModel.js` (`getStaffByBranch`, `getAllAdmins`) — not needed for Requestor-side
  work (Section 2) but WILL be needed context if Section 3 touches staff notification logic.
- Haven't seen `middleware/authMiddleware.js` full source (only referenced/described in
  architecture.md and gotchas — the shape fix is documented but not the full file). Shouldn't be
  needed unless touching auth directly.
- Haven't seen `constants/apiConfig.js` — `API_BASE_URL`/`API_ENDPOINTS` referenced in `api.js`/
  `socket.js` but never pasted. Not needed for feature files, which hardcode their own `BASE`
  path constants per the established pattern (see `bloodUnitsApi.js`, `bloodRequestApi.js`).

---

## 14. Frontend Files Already Built (Section 1 — Requestor Submit Request)

For quick reference when starting Section 2 — these already exist, don't recreate them:
```
constants/bloodRequestConstant.js
js/features/bloodRequests/bloodRequestApi.js
js/features/bloodRequests/bloodRequestSelectionUI.js
js/features/bloodRequests/bloodRequestFulfillmentUI.js
js/features/bloodRequests/bloodRequestSubmitUI.js
js/features/bloodRequests/bloodRequestValidation.js
js/features/hospitals/hospitalsApi.js
pages/requestor/submitRequest.html
js/entry/requestor/submitRequest.js
assets/css/features/bloodRequests.css
```
`routes.js` has `ROUTES.REQUESTOR.SUBMIT_REQUEST` and `ROUTES.REQUESTOR.REQUESTS` (the latter is
"My Requests" — Section 2's target page). `sidebarItems.js`'s Requestor section already points
both links correctly.

`bloodRequestApi.js` currently exports: `getFulfillmentOptions(items, lat, lon)` and
`submitBloodRequest(formData)`. Section 2 will need to add `getMyRequests()`, `cancelRequest(id)`,
and `markReceived(id)` to this same file (feature-to-feature reuse — same file, don't create a
second Api file for the same feature).