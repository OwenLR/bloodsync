# BloodSync — Frontend Contract

## Purpose
This file defines the exact API surface the frontend needs to integrate with the
backend. Nothing more. No implementation details, no database structure, no service
logic. Only what goes in, what comes out, and what the rules are.

Cross-reference FRONTEND_NOTES.MD for auth setup, fetch wrappers, folder structure,
and build plan.

---

## Constants — Use These Everywhere, Never Hardcode

### Roles
```javascript
// constants/config.js
export const ROLES = {
  ADMIN:         1,
  PRC_STAFF:     2,
  DONOR:         3, // not a login role
  REQUESTOR:     4,
  VOLUNTEER:     5,
  PHLEBOTOMIST:  6,
};
```

### Blood Types
```javascript
export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];
```

### Blood Components
```javascript
export const COMPONENTS = [
  'Whole Blood',
  'Packed Red Blood Cells',
  'Fresh Frozen Plasma',
  'Platelets',
];
```

### Status Values
```javascript
export const STATUSES = {
  // Blood drives
  DRIVE: ['Scheduled', 'Active', 'Ended', 'Cancelled'],

  // Blood drive participants
  PARTICIPANT: ['Pending', 'Confirmed', 'Declined', 'No Show'],

  // Screening
  SCREENING_RESULT: ['Eligible', 'Deferred'],
  HEMOGLOBIN_STATUS: ['Allowed', 'Not Allowed'],

  // Blood collections
  COLLECTION: ['Pending', 'Safe', 'Rejected'],

  // Blood units
  BLOOD_UNIT: ['Available', 'Reserved', 'Released', 'Expired', 'Disposed', 'Withdrawn'],

  // Blood requests
  BLOOD_REQUEST: ['Pending', 'Approved', 'Released', 'Rejected', 'Cancelled'],

  // Users
  USER: ['Active', 'Inactive', 'Pending'],
};

// Blood request valid transitions — only show buttons for these
export const REQUEST_TRANSITIONS = {
  Pending:  ['Approved', 'Rejected'],
  Approved: ['Released', 'Rejected'],
};

// Blood drive venue types
export const VENUE_TYPES = ['Indoor', 'Outdoor', 'Mobile'];
```

---

## Build Order / Feature Tiers

### Tier 1 — Core (must work before anything else)
1. Auth (login, refresh, logout)
2. User profile (GET /api/users/me equivalent)
3. Registration (requestor + volunteer/phlebotomist)

### Tier 2 — Primary Workflows
4. Blood Drives (create, list, manage)
5. Donors (register, search, view)
6. Donor Workflow (interview → answers → screening → donation → collection)

### Tier 3 — Inventory & Requests
7. Blood Units (list, status updates)
8. Blood Requests (submit, approve, release) + real-time socket

### Tier 4 — Supporting Features
9. Notifications (badge, list, mark read)
10. Volunteer/Phlebotomist profile
11. Branches, Hospitals (reference data — mostly read-only)

### Tier 5 — Admin Only
12. User management (create, update, delete)
13. Registration approvals (approve/decline volunteers)
14. Interview questions (update only)

### Tier 6 — Reports (read-only, build last)
15. Reports (aggregate data display)

---

## Auth Endpoints

### POST /api/auth/login
**Public — no token required**

Request:
```json
{ "email": "user@example.com", "password": "password123" }
```

Web response (cookies set, no tokens in body):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": 1,
      "first_name": "Juan",
      "last_name": "dela Cruz",
      "email": "juan@prc.org",
      "role_id": 2,
      "branch_id": 1
    }
  }
}
```

Mobile response (add header `x-client-type: mobile`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "access_token": "eyJ...",
    "refresh_token": "abc123..."
  }
}
```

Errors:
- `400` — email or password missing
- `401` — invalid credentials or deactivated account
- `429` — 5 failed attempts within 15 minutes

---

### POST /api/auth/refresh
**Public**

Web: no body — refresh token cookie sent automatically
Mobile: `{ "refresh_token": "<stored_token>" }` + header `x-client-type: mobile`

Web response: new cookies set silently, body:
```json
{ "success": true, "message": "Token refreshed", "data": null }
```

Mobile response:
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": { "access_token": "eyJ...", "refresh_token": "xyz..." }
}
```

Errors:
- `401` — refresh token invalid, expired, or account deactivated

---

### POST /api/auth/logout
**Public**

Web: no body
Mobile: `{ "refresh_token": "<stored_token>" }` + header `x-client-type: mobile`

Response:
```json
{ "success": true, "message": "Logged out successfully", "data": null }
```

---

## Registration Endpoints

### POST /api/requestors/register
**Public — no token required**

Request:
```json
{
  "first_name": "Maria",       // required
  "last_name":  "Santos",      // required
  "email":      "m@email.com", // required, valid email
  "password":   "secret123",   // required, min 8 chars
  "contact":    "09171234567"  // optional, digits only, 7-15 digits
}
```

Response `201`:
```json
{ "success": true, "message": "...", "data": { "user_id": 5, ... } }
```

Errors: `400` validation, `409` email already exists

---

### POST /api/volunteers/register
**Public — multipart/form-data (has file upload)**

Fields (form-data):
```
first_name    string  required
last_name     string  required
email         string  required
password      string  required, min 8 chars
sex           string  optional — Male | Female
contact       string  optional — digits only, 7-15
birthdate     string  optional — YYYY-MM-DD
zip_code      string  optional — digits only, 4-10
id_number     string  optional — min 3 chars
emergency_contact_phone  string  optional — digits only, 7-15
profile_img   file    optional — jpeg/png/jpg/pdf, max 5MB
```

Response `201`: user created with `status: Pending` — awaits admin approval

---

### POST /api/phlebotomists/register
**Public — multipart/form-data**
Same fields as volunteer registration above.

---

### GET /api/volunteers/pending
**Admin only**

Response `200`:
```json
{ "data": [ { "user_id": 3, "first_name": "...", "status": "Pending", ... } ] }
```

---

### GET /api/volunteers/:id/profile
**Admin only**

Response `200`: full volunteer profile including volunteer_profiles table data

---

### PATCH /api/volunteers/:id/approve
**Admin only** — no body required

Response `200`: user status set to Active, is_active set to true

---

### PATCH /api/volunteers/:id/decline
**Admin only** — no body required

Response `200`: user status set to Declined

---

## User Endpoints

### GET /api/users
**Admin only**

Query params (optional): `?status=Active` | `Inactive` | `Pending`

Response `200`:
```json
{
  "data": [{
    "user_id": 1, "first_name": "...", "last_name": "...",
    "email": "...", "status": "Active", "is_active": true,
    "role_id": 1, "role_name": "Admin",
    "branch_id": 1, "branch_name": "Batangas"
  }]
}
```

---

### GET /api/users/:id
**Admin, PRC Staff**

Response `200`: single user object (same shape as list item above)

---

### POST /api/users
**Admin only** — creates Admin or PRC Staff accounts only

Request:
```json
{
  "first_name": "string",  // required
  "last_name":  "string",  // required
  "email":      "string",  // required, valid email
  "password":   "string",  // required, min 8 chars
  "role_id":    1,         // required — 1 (Admin) or 2 (PRC Staff) only
  "branch_id":  1          // optional
}
```

---

### PATCH /api/users/:id
**Admin only** — all fields optional, at least one required

```json
{
  "first_name": "string",
  "last_name":  "string",
  "email":      "string",
  "role_id":    2,
  "branch_id":  1,
  "status":     "Active",
  "is_active":  true
}
```

---

### DELETE /api/users/:id
**Admin only**

Response `200`: deleted user object

---

## Volunteer/Phlebotomist Self-Profile

### GET /api/volunteers/me/profile
**Volunteer, Phlebotomist only**

Response `200`: own profile data

---

### PATCH /api/volunteers/me/profile
**Volunteer, Phlebotomist only**

Updatable fields only — these four are LOCKED server-side, do not send them:
- `first_name`, `last_name`, `birthdate`, `sex` → backend rejects with `400`

Allowed fields:
```json
{
  "contact":                  "string",
  "address":                  "string",
  "zip_code":                 "string",
  "emergency_contact_name":   "string",
  "emergency_contact_phone":  "string",
  "profile_img":              "file (multipart)"
}
```

---

## Blood Drive Endpoints

### GET /api/blood-drives/confirm (PUBLIC — returns HTML, not JSON)
Query params: `?token=xxx&action=confirm` or `?action=decline`
This is a browser link from email — the frontend does not call this programmatically.

---

### GET /api/blood-drives
**Admin, PRC Staff**

Response `200`: array of drives with computed status

---

### GET /api/blood-drives/:id
**Admin, PRC Staff, Volunteer, Phlebotomist**

Response `200`:
```json
{
  "data": {
    "drive_id": 1,
    "name": "Batangas Blood Drive",
    "branch_id": 1,
    "start_datetime": "2025-10-01T08:00:00+08:00",
    "end_datetime":   "2025-10-01T17:00:00+08:00",
    "status": "Active",
    "slots_available": 50,
    "venue_type": "Indoor",
    "contact_number": "09171234567",
    "contact_email": "drive@prc.org"
  }
}
```

Note: `status` is computed on the backend from current PHT time — do not recompute on frontend.

---

### GET /api/blood-drives/branch/:branch_id
**Admin, PRC Staff**

---

### POST /api/blood-drives
**Admin, PRC Staff**
PRC Staff can only create drives for their own branch (enforced server-side).

Request:
```json
{
  "name":            "string",    // required
  "branch_id":       1,           // required — positive integer
  "start_datetime":  "ISO 8601",  // required — e.g. 2025-10-01T08:00:00+08:00
  "end_datetime":    "ISO 8601",  // required
  "slots_available": 50,          // optional — positive integer
  "venue_type":      "Indoor",    // optional — Indoor | Outdoor | Mobile
  "contact_number":  "string",    // optional — digits only, 7-15
  "contact_email":   "string",    // optional — valid email
  "location":        "string",    // optional
  "notes":           "string"     // optional
}
```

Errors:
- `400` — validation failure
- `403` — PRC Staff trying to create drive for another branch
- `422` — start date in the past, end before start

---

### PATCH /api/blood-drives/:id
**Admin, PRC Staff** — all fields optional

Cannot update Cancelled or Ended drives → `400`

---

### PATCH /api/blood-drives/:id/cancel
**Admin, PRC Staff**

Request:
```json
{ "cancellation_reason": "string" } // optional but recommended
```

Errors: `400` — already Cancelled or Ended

---

### GET /api/blood-drives/:id/participants
**Admin, PRC Staff**

---

### POST /api/blood-drives/:id/participants
**Admin, PRC Staff**

Request:
```json
{
  "user_id":    3,        // required — must be Volunteer or Phlebotomist
  "role_notes": "string"  // optional, max 255 chars
}
```

On success: assignment email sent to the participant with confirm/decline links.

---

### DELETE /api/blood-drives/:id/participants/:user_id
**Admin, PRC Staff**

---

### PATCH /api/blood-drives/:id/participants/:user_id
**Admin, PRC Staff**

Request:
```json
{ "assignment_status": "Confirmed" } // Pending | Confirmed | Declined | No Show
```

---

## Donor Endpoints

### GET /api/donors
**Admin, PRC Staff, Volunteer, Phlebotomist**

---

### GET /api/donors/search
**Admin, PRC Staff, Volunteer, Phlebotomist**

Query params: `?q=searchterm`

---

### GET /api/donors/:id
**Admin, PRC Staff, Volunteer, Phlebotomist**

Response `200`:
```json
{
  "data": {
    "donor_id": 1,
    "first_name": "Pedro",
    "last_name":  "Reyes",
    "birthdate":  "1990-05-15",
    "sex":        "Male",
    "email":      "pedro@email.com",
    "blood_type": "O+",
    "contact":    "09171234567"
  }
}
```

---

### POST /api/donors
**Admin, PRC Staff, Volunteer, Phlebotomist**
Volunteer/Phlebotomist: requires active blood drive assignment.

Request:
```json
{
  "first_name": "string",    // required
  "last_name":  "string",    // required
  "birthdate":  "YYYY-MM-DD",// required — not in future
  "sex":        "Male",      // required — Male | Female
  "email":      "string",    // required — valid email (required for donation email)
  "blood_type": "O+",        // optional — must be valid blood type
  "contact":    "string"     // optional — digits only, 7-15
}
```

Errors: `409` — duplicate donor detected (same national ID or matching identity)

---

### PATCH /api/donors/:id
**Admin, PRC Staff only**

All fields optional, at least one required. Same format validation as create.
Note: email is still validated if provided.

---

### DELETE /api/donors/:id
**Admin only**

---

## Donor Interview Endpoints

### GET /api/donor-interviews
**All roles**

---

### GET /api/donor-interviews/donor/:donor_id
**All roles**

---

### GET /api/donor-interviews/:id
**All roles**

Response `200`:
```json
{
  "data": {
    "interview_id": 1,
    "donor_id":     1,
    "branch_id":    1,
    "drive_id":     2,   // null if walk-in
    "created_at":   "..."
  }
}
```

---

### POST /api/donor-interviews
**All roles**
Volunteer/Phlebotomist: requires active blood drive assignment.

Request:
```json
{
  "donor_id":  1, // required — positive integer
  "branch_id": 1  // required — positive integer
}
```

Note: `drive_id` is set automatically from the middleware — do not send it.

---

## Interview Answer Endpoints

### POST /api/interview-answers
**All roles**
Volunteer/Phlebotomist: requires active blood drive.

Request:
```json
{
  "interview_id": 1,   // required — NOT screening_id
  "donor_id":     1,   // required
  "answers": [
    { "question_id": 1, "answer": "YES" },
    { "question_id": 2, "answer": "NO"  }
  ]
}
```

Note: `answer` must be exactly `"YES"` or `"NO"` (uppercase).

---

## Interview Question Endpoints

### GET /api/interview-questions
**All roles**

---

### GET /api/interview-questions/sex/:sex
**All roles**
`:sex` — `Male` or `Female` (case-insensitive, backend normalises)

Returns questions applicable to that sex (includes `Both` questions).

---

### PATCH /api/interview-questions/:id
**Admin only**

```json
{
  "question_text": "string",
  "sex_filter":    "Both",   // Male | Female | Both
  "defer_if":      "YES"     // YES | NO
}
```

---

## Screening Endpoints

### GET /api/screenings
**All roles**

---

### GET /api/screenings/donor/:donor_id
**All roles**

---

### GET /api/screenings/:id
**All roles**

---

### POST /api/screenings
**All roles**
Volunteer/Phlebotomist: requires active blood drive.
Cross-drive: interview must belong to same drive as requester's assignment.

Request:
```json
{
  "interview_id":        1,       // required
  "hemoglobin":          14.5,    // required — positive number
  "screening_result":    "Eligible", // required — Eligible | Deferred
  "weight":              65,      // optional — positive number
  "pulse_rate":          72,      // optional — positive integer
  "blood_pressure":      "120/80",// optional — format: NNN/NN
  "blood_type_confirmed":"O+",    // optional — valid blood type
  "hemoglobin_status":   "Allowed"// optional — Allowed | Not Allowed
}
```

Business rules (enforced server-side):
- Male hemoglobin: min 13.0, max 20.0 g/dL
- Female hemoglobin: min 12.5, max 20.0 g/dL
- If `screening_result` is `Deferred`, a deferral record is created automatically

---

### PATCH /api/screenings/:id
**Admin, PRC Staff only**
Same field validation as create.

---

## Donation Endpoints

### GET /api/donations
**All roles**

---

### GET /api/donations/donor/:donor_id
**All roles**

---

### GET /api/donations/:id
**All roles**

---

### POST /api/donations
**All roles**
Volunteer/Phlebotomist: requires active blood drive.
Cross-drive: screening must belong to same drive.

Request:
```json
{
  "screening_id":    1,     // required
  "extraction_time": 10     // optional — minutes, integer
}
```

Business rules (enforced server-side):
- Screening must be `Eligible`
- Donor must have an email on record (required for post-extraction email)
- Active deferral blocks donation
- Same-day deferral blocks donation
- Extraction time > 15 min → `is_qns: true` (still created, but flagged)

---

### PATCH /api/donations/:id
**Admin, PRC Staff only**

---

## Blood Collection Endpoints

### GET /api/blood-collections
**Admin, PRC Staff only**

---

### GET /api/blood-collections/:id
**Admin, PRC Staff only**

---

### GET /api/blood-collections/branch/:branch_id
**Admin, PRC Staff only**

---

### POST /api/blood-collections
**All roles**
Volunteer/Phlebotomist: requires active blood drive.
Cross-drive: donation must belong to same drive.

Request:
```json
{
  "donation_id": 1,                  // required
  "blood_type":  "O+",               // required — valid blood type
  "component":   "Whole Blood",      // optional — Whole Blood | Packed Red Blood Cells | Fresh Frozen Plasma | Platelets
  "volume_ml":   450                 // optional — positive integer
}
```

---

### PATCH /api/blood-collections/:id/status
**Admin, PRC Staff only**

Request:
```json
{
  "status": "Safe",    // required — Pending | Safe | Rejected
  "reason": "string"  // required if status is Rejected
}
```

Business rule: QNS collections (is_qns = true) cannot be marked `Safe`.
When marked `Safe`, a blood unit is automatically created in inventory.

---

## Blood Unit Endpoints

### GET /api/blood-units
**Admin, PRC Staff**

---

### GET /api/blood-units/:id
**Admin, PRC Staff**

Response `200`:
```json
{
  "data": {
    "unit_id":         1,
    "blood_type":      "O+",
    "component":       "Whole Blood",
    "status":          "Available",
    "expiration_date": "2025-11-05",
    "branch_id":       1,
    "drive_id":        2
  }
}
```

---

### PATCH /api/blood-units/:id/status
**Admin, PRC Staff**

Request:
```json
{
  "status": "Withdrawn",  // Available | Disposed | Withdrawn (cannot set terminal states manually in all cases)
  "reason": "string"      // required for Disposed and Withdrawn
}
```

Terminal states (cannot update after reaching): `Released`, `Disposed`, `Withdrawn`

---

## Blood Request Endpoints

### GET /api/blood-requests
**Admin, PRC Staff, Requestor**
Requestors only see their own requests (enforced server-side).

---

### GET /api/blood-requests/:id
**Admin, PRC Staff, Requestor**

Response `200`:
```json
{
  "data": {
    "request_id":    1,
    "status":        "Pending",
    "created_at":    "...",
    "items": [
      { "blood_type": "O+", "component": "Whole Blood", "quantity": 2 }
    ]
  }
}
```

---

### POST /api/blood-requests
**Requestor only**

Request:
```json
{
  "hospital_id": 1,
  "diagnosis":   "string",
  "items": [
    { "blood_type": "O+", "component": "Whole Blood", "quantity": 2 }
  ]
}
```

On success: socket event `blood_request_new` emitted to branch staff rooms.

---

### PATCH /api/blood-requests/:id/status
**Admin, PRC Staff**

Request:
```json
{
  "status": "Approved",  // see valid transitions below
  "reason": "string"     // optional — recommended for Rejected
}
```

Valid transitions:
- `Pending` → `Approved` or `Rejected`
- `Approved` → `Released` or `Rejected`

On `Approved`: FEFO auto-assignment of blood units (nearest expiry first).
Race condition protection: SELECT FOR UPDATE prevents double-approval.

---

## Deferral Endpoints

### GET /api/deferrals
**Admin, PRC Staff**

---

### GET /api/deferrals/donor/:donor_id
**Admin, PRC Staff, Volunteer, Phlebotomist**

---

### GET /api/deferrals/:id
**Admin, PRC Staff**

---

## Notification Endpoints

### GET /api/notifications
**All authenticated roles**

Response `200`: array of notifications for the current user

---

### GET /api/notifications/unread-count
**All authenticated roles**

Response `200`:
```json
{ "data": { "count": 3 } }
```

---

### PATCH /api/notifications/:id/read
**All authenticated roles**
Can only mark own notifications — scoped server-side.

---

### PATCH /api/notifications/read-all
**All authenticated roles**

---

## Branch Endpoints

### GET /api/branches
**All authenticated roles** — reference data for dropdowns

---

### GET /api/branches/:id
**All authenticated roles**

---

### POST /api/branches
**Admin only**

---

### PATCH /api/branches/:id
**Admin only**

---

### DELETE /api/branches/:id
**Admin only**

---

## Hospital Endpoints

### GET /api/hospitals
**All authenticated roles** — reference data for blood request forms

---

### GET /api/hospitals/:id
**All authenticated roles**

---

### POST /api/hospitals
**Admin only**

---

### PATCH /api/hospitals/:id
**Admin only**

---

### DELETE /api/hospitals/:id
**Admin only**

---

## Socket Events

### Event: `blood_request_new`
**Received by:** Admin and PRC Staff (via `branch_<branch_id>` room)
**Trigger:** Requestor submits a new blood request

Payload:
```json
{
  "request_id": 1,
  "status":     "Pending",
  "created_at": "...",
  "branch_id":  1
}
```

Frontend action: increment notification badge, if user is on blood-requests page
prepend the new row to the table.

---

### Event: `inventory_low`
**Received by:** Admin and PRC Staff
**Trigger:** Daily cron at 8AM PHT

Payload:
```json
{
  "branch_id":   1,
  "branch_name": "Batangas",
  "items": [
    { "blood_type": "O+", "component": "Whole Blood", "count": 3 }
  ]
}
```

---

### Event: `inventory_expiring`
**Received by:** Admin and PRC Staff
**Trigger:** Daily cron at 8AM PHT

Payload:
```json
{
  "branch_id":   1,
  "branch_name": "Batangas",
  "items": [
    { "unit_id": 5, "blood_type": "A+", "component": "Platelets", "expiration_date": "..." }
  ]
}
```

---

### Joining rooms (web only)
```javascript
socket.emit('join_room', `branch_${user.branch_id}`);
// Admins also:
socket.emit('join_room', 'admin_global');
```

---

## Validation Rules Summary

### Formats
| Field | Rule |
|---|---|
| email | valid email format |
| password | min 8 characters |
| contact / phone | digits only, 7–15 digits |
| birthdate | YYYY-MM-DD, not in future |
| zip_code | digits only, 4–10 digits |
| blood_pressure | NNN/NN format e.g. 120/80 |
| datetime fields | ISO 8601 e.g. 2025-10-01T08:00:00+08:00 |

### Business Rules the Frontend Should Enforce (but backend also rejects)
| Rule | Where |
|---|---|
| Donor workflow is sequential: interview → answers → screening → donation → collection | All field operation pages |
| Only show blood request action buttons for valid transitions | Blood requests page |
| Volunteer/Phlebotomist identity fields are read-only | Profile edit form |
| Drive status Ended or Cancelled — no edit allowed | Drive edit form |
| Blood unit terminal states — no status update button | Blood units page |
| QNS collections cannot be marked Safe | Collection status form |
| Requestors cannot see blood collections or blood units | Role-based page access |

---

## Email Notifications (informational — frontend does not trigger these)
| Trigger | Recipient | Channel |
|---|---|---|
| Volunteer/Phlebotomist assigned to drive | Assigned user | Email with confirm/decline buttons |
| Donation created | Donor | Email — post-extraction instructions |
| Daily inventory low stock | Branch staff + all admins | Email + socket |
| Daily inventory near expiry | Branch staff + all admins | Email + socket |