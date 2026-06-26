# BloodSync — Frontend Contract

## Purpose
This file defines the exact API surface the frontend needs to integrate with the
backend. Nothing more. No implementation details, no database structure, no service
logic. Only what goes in, what comes out, and what the rules are.

This file documents API request/response fields and valid values — it does NOT
define frontend constant shapes (arrays vs frozen objects, file locations, etc.).
Frontend implementation decisions live in FRONTEND_AI_RULES.md.

Cross-reference FRONTEND_NOTES.MD for auth setup, fetch wrappers, folder structure,
and build plan.

---

## Valid Values Reference

### Roles (role_id)
| role_id | Role | Login? |
|---|---|---|
| 1 | Admin | Yes |
| 2 | PRC Staff | Yes |
| 3 | Donor | No — not a system user |
| 4 | Requestor | Yes |
| 5 | Volunteer | Yes |
| 6 | Phlebotomist | Yes |

### Blood Types
`A+ | A- | B+ | B- | AB+ | AB- | O+ | O-`

### Blood Components
`Whole Blood | Packed Red Blood Cells | Platelets | Fresh Frozen Plasma`

### Status Values

**Blood Drive status** (`GET /api/blood-drives*`):
`Upcoming | Ongoing | Ended | Cancelled` — computed server-side from PHT time, never recompute on frontend

**Blood Drive Participant status** (`assignment_status`):
`Assigned | Confirmed | Declined | No Show`

**Screening result** (`screening_result`):
`Eligible | Deferred`

**Hemoglobin status** (`hemoglobin_status`):
`Allowed | Not Allowed`

**Blood Collection status**:
`Pending | Safe | Rejected | Disposed | Withdrawn`

**Blood Unit status**:
`Available | Reserved | Released | Disposed | Withdrawn | Expired | Separated`
— `Released`, `Disposed`, `Withdrawn`, `Expired`, `Separated` are terminal; no further transitions

**Blood Request status**:
`Pending | Approved | Released | Rejected | Cancelled`
— `Cancelled` is set only via `PATCH /:id/cancel` (requestor self-cancel, Pending requests only)
— `Cancelled` is NEVER a valid value for `PATCH /:id/status` — staff cannot set this via the status update route
— Frontend shows `Cancelled` as a display status only, never as a staff action button option

**Reservation status**:
`Reserved | Released | Cancelled`

**Donor status**:
`Active | Inactive | Deferred`

**User status**:
`Active | Inactive | Pending | Declined`

**Urgency level**:
`Routine | STAT`

**Venue type**:
`School | Hospital | Community Center | Church | Government | Other`

### Blood Request Valid Transitions
| Current status | Can transition to |
|---|---|
| Pending | Approved, Rejected |
| Approved | Released, Rejected |

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

### GET /api/auth/me
**Requires authentication**

Response `200`:
```json
{
  "success": true,
  "message": "User fetched",
  "data": {
    "user": {
      "user_id":    1,
      "email":      "juan@prc.org",
      "role_id":    2,
      "branch_id":  1,
      "first_name": "Juan",
      "last_name":  "dela Cruz"
    }
  }
}
```

Note: Does a DB lookup (not just JWT decode) specifically to include first_name/last_name
for navbar display on every page load. In-memory cache resets on navigation.

Errors:
- `401` — no valid token (handled by apiFetch refresh flow)

### PATCH /api/auth/me/password
Requires authentication — ALL authenticated roles (Admin, PRC Staff, Volunteer, Phlebotomist, Requestor).
This is the password change endpoint for every role — lives under /api/auth, NOT /api/users.

Request:
json{ "current_password": "string", "new_password": "string" }

Response 200:
json{ "success": true, "message": "Password updated successfully", "data": { "user_id": 1 } }

Validation:
current_password required
new_password required, min 8 characters
new_password must differ from current_password

Errors:
400 — validation failure, OR current_password does not match
404 — user not found (should not normally occur for an authenticated request)

Note: this endpoint lives under /api/auth, NOT /api/users — it is
self-service for the currently authenticated user only. user_id is read
from the JWT (req.user.user_id), never from the request body.

---

## Registration Endpoints

### POST /api/requestors/register
**Public — no token required**

Request:
```json
{
  "first_name": "Maria",
  "last_name":  "Santos",
  "email":      "m@email.com",
  "password":   "secret123",
  "contact":    "09171234567"
}
```

Response `201`:
```json
{ "success": true, "message": "...", "data": { "user_id": 5, ... } }
```

Errors: `400` validation, `409` email already exists

---

### POST /api/volunteers/register
**Public — multipart/form-data**

Fields: `first_name`, `last_name`, `email`, `password`, `sex`, `contact`, `birthdate`,
`zip_code`, `id_number`, `emergency_contact_phone`, `profile_img` (file, jpeg/png/jpg/pdf, max 5MB)

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
{ "success": true, "data": [ { "user_id": 3, "first_name": "...", "status": "Pending", ... } ] }
```

---

### GET /api/volunteers/available
**Admin, PRC Staff only**

Query params (optional):
- `?role=5` — filter by role_id (5=Volunteer, 6=Phlebotomist)
- `?municipality=Batangas City` — filter by address_municipality (case-insensitive)

Response `200`:
```json
{
  "success": true,
  "count": 1,
  "data": [{
    "user_id":              3,
    "first_name":           "Maria",
    "last_name":            "Santos",
    "role_id":              5,
    "role_name":            "Volunteer",
    "email":                "maria@email.com",
    "contact":              "09171234567",
    "address_municipality": "Batangas City",
    "address_province":     "Batangas",
    "profile_img":          "https://res.cloudinary.com/..."
  }]
}
```

Note: Returns only Active users (is_active=true, status='Active') with role_id 5 or 6.
Used for participant assignment panel on blood drive pages.
Route registered BEFORE /volunteers/:id/profile to prevent Express route shadowing.

---

### GET /api/volunteers/:id/profile
**Admin only**

Response `200`: full volunteer profile including volunteer_profiles table data

Fields returned: `user_id`, `first_name`, `last_name`, `email`, `status`, `is_active`,
`role_name`, `role_id`, `birthdate`, `sex`, `contact`, `address_street`, `address_brgy`,
`address_municipality`, `address_province`, `zip_code`, `nationality`, `education`,
`occupation`, `id_type`, `id_number`, `emergency_contact_name`, `emergency_contact_phone`,
`profile_img`

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
  "success": true,
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
  "first_name": "string",
  "last_name":  "string",
  "email":      "string",
  "password":   "string",
  "role_id":    1,
  "branch_id":  1
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

### PATCH /api/users/me/profile-img
**Admin, PRC Staff only** — multipart/form-data
Profile photo for Admin/Staff. Volunteer/Phlebotomist use PATCH /api/volunteers/me/profile instead. Requestor has no profile photo endpoint yet.
Field: profile_img (file, jpeg/png/jpg/pdf, max 5MB — same constraints as
volunteer/phlebotomist registration uploads)

Response 200:
json{
  "success": true,
  "message": "Profile photo updated successfully",
  "data": {
    "profile_id": 1,
    "user_id": 2,
    "profile_img": "https://res.cloudinary.com/..."
  }
}

Errors:
400 — no file uploaded, or invalid file type/size (rejected by upload middleware)

Note: This writes to a NEW table, staff_profiles (not the users table
itself) — mirrors the existing pattern where Volunteer/Phlebotomist
profile_img lives in volunteer_profiles, not users. Upserts on
conflict — safe to call multiple times, always replaces the prior URL.
user_id is read from the JWT (req.user.user_id), never from the request body.

This endpoint is registered BEFORE /api/users/:id in userRoutes.js to
prevent Express route shadowing (the literal path /me/profile-img would
otherwise be captured by the :id wildcard if registered after it — same
issue previously fixed for GET /api/volunteers/available vs
/volunteers/:id/profile).

---

## Volunteer/Phlebotomist Self-Profile

### GET /api/volunteers/me/profile
**Volunteer, Phlebotomist only**
Response `200`: own profile data (same shape as GET /api/volunteers/:id/profile)

---

### PATCH /api/volunteers/me/profile
**Volunteer, Phlebotomist only**

LOCKED server-side (backend rejects with 400 if sent): `first_name`, `last_name`, `birthdate`, `sex`

Allowed fields:
```json
{
  "contact":                  "string",
  "address_street":           "string",
  "address_brgy":             "string",
  "address_municipality":     "string",
  "address_province":         "string",
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
Browser link from email — frontend never calls this programmatically.
CRITICAL: registered BEFORE /:id route in Express to prevent route shadowing.

---

### GET /api/blood-drives
**Admin, PRC Staff**

Response `200`: array of drives

Fields per drive:
`drive_id`, `name`, `description`, `status`, `branch_id`, `branch_name`,
`start_datetime`, `end_datetime`, `slots_available`,
`venue_name`, `venue_type`, `building`, `floor_room`,
`street_address`, `city`, `province`, `postal_code`,
`venue_latitude`, `venue_longitude`,
`contact_person`, `contact_number`, `contact_email`,
`created_by`, `created_by_first`, `created_by_last`,
`cancelled_by`, `cancelled_by_first`, `cancelled_by_last`,
`cancellation_reason`, `cancelled_at`

Note: `status` is computed on the backend from current PHT time — do not recompute on frontend.

---

### GET /api/blood-drives/:id
**Admin, PRC Staff, Volunteer, Phlebotomist**
Response `200`: single drive object (same fields as list above)

---

### GET /api/blood-drives/branch/:branch_id
**Admin, PRC Staff**
Response `200`: array of drives for that branch (same fields as list above)

---

### POST /api/blood-drives
**Admin, PRC Staff**
PRC Staff can only create drives for their own branch (enforced server-side — 403 otherwise).

Request:
```json
{
  "name":            "string",
  "branch_id":       1,
  "start_datetime":  "ISO 8601",
  "end_datetime":    "ISO 8601",
  "description":     "string",
  "venue_name":      "string",
  "venue_type":      "School",
  "building":        "string",
  "floor_room":      "string",
  "street_address":  "string",
  "city":            "string",
  "province":        "string",
  "postal_code":     "string",
  "slots_available": 50,
  "contact_person":  "string",
  "contact_number":  "string",
  "contact_email":   "string",
  "venue_latitude":  13.7565,
  "venue_longitude": 121.0583
}
```

Required: `name`, `branch_id`, `start_datetime`, `end_datetime`
`venue_latitude` and `venue_longitude` are optional — set via map picker.
All other fields optional.

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
{ "cancellation_reason": "string" }
```

Errors: `400` — already Cancelled or Ended

---

### GET /api/blood-drives/:id/participants
**Admin, PRC Staff**

Response `200`: array of participants

Fields per participant:
`drive_id`, `user_id`, `first_name`, `last_name`, `email`,
`role_name`, `role_id`, `assignment_status`, `role_notes`,
`assigned_at`, `assigned_by_first`, `assigned_by_last`

---

### POST /api/blood-drives/:id/participants
**Admin, PRC Staff**

Request:
```json
{
  "user_id":    3,
  "role_notes": "string"
}
```

On success: assignment email sent to participant with confirm/decline links.

---

### DELETE /api/blood-drives/:id/participants/:user_id
**Admin, PRC Staff**

---

### PATCH /api/blood-drives/:id/participants/:user_id
**Admin, PRC Staff**

Request:
```json
{ "assignment_status": "Confirmed" }
```

---

### GET /api/blood-drives/:id/participants/suggestions
**Admin, PRC Staff only**

Query params (all optional):
- `?role_id=5` — filter by role (5=Volunteer, 6=Phlebotomist)
- `?limit=20` — max results (default 20, max 50)

Response `200`:
```json
{
  "success": true,
  "data": [{
    "user_id":              3,
    "first_name":           "Maria",
    "last_name":            "Santos",
    "role_id":              5,
    "role_name":            "Volunteer",
    "address_municipality": "Batangas City",
    "address_province":     "Batangas",
    "distance_km":          2.4,
    "profile_img":          "https://res.cloudinary.com/..."
  }]
}
```

Notes:
- Returns only Active users not already assigned to this drive
- Sorted by distance from drive venue if `venue_latitude`/`venue_longitude` set; falls back to alphabetical
- `distance_km` is `null` if either the drive or the volunteer has no coordinates

---

### POST /api/blood-drives/:id/participants/bulk
**Admin, PRC Staff only**

Two modes — send one or the other, not both:

Mode A — manual selection:
```json
{ "user_ids": [1, 2, 3] }
```

Mode B — auto-assign nearest N by distance:
```json
{ "target_count": 30, "role_id": 5 }
```
`role_id` is optional in Mode B — omit to auto-assign any role.

Response `200`:
```json
{
  "success": true,
  "message": "3 participant(s) assigned successfully",
  "data": {
    "total_assigned": 3,
    "total_failed":   0,
    "assigned": [{ "user_id": 1 }],
    "failed":   []
  }
}
```

Notes:
- Partial success is intentional — already-assigned users are skipped (counted in `total_failed`), not errored
- Each assigned user receives the assignment email (fire-and-forget)

---

### GET /api/blood-drives/:id/stats
**Admin, PRC Staff only**

Response `200`:
```json
{
  "success": true,
  "data": {
    "drive_id":             1,
    "total_donors":         42,
    "new_donors":           28,
    "returning_donors":     14,
    "interviews_total":     42,
    "interviews_passed":    38,
    "interviews_failed":    4,
    "interviews_pending":   0,
    "screenings_total":     38,
    "screenings_eligible":  35,
    "screenings_deferred":  3,
    "donations_total":      35,
    "donations_qns":        2,
    "donations_valid":      33,
    "collections_total":    33,
    "collections_pending":  5,
    "collections_safe":     26,
    "collections_rejected": 2
  }
}
```

Note: `new_donors + returning_donors = total_donors` always.

---

## Donor Endpoints

### GET /api/donors
**Admin, PRC Staff, Volunteer, Phlebotomist**

Response `200`:
```json
{
  "success": true,
  "data": [{
    "donor_id":   1,
    "first_name": "Pedro",
    "last_name":  "Reyes",
    "birthdate":  "1990-05-15",
    "sex":        "Male",
    "email":      "pedro@email.com",
    "blood_type": "O+",
    "contact":    "09171234567",
    "status":     "Active",
    "id_number":  "XX-XXXXX"
  }]
}
```

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
  "success": true,
  "data": {
    "donor_id":   1,
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
  "first_name": "string",
  "last_name":  "string",
  "birthdate":  "YYYY-MM-DD",
  "sex":        "Male",
  "email":      "string",
  "blood_type": "O+",
  "contact":    "string"
}
```

Required: `first_name`, `last_name`, `birthdate`, `sex`, `email`
`email` is required — a donor without email will fail at the donation step (backend sends post-extraction email).
Errors: `409` — duplicate donor (backend detects via `id_number`)

Frontend search-first flow: always show donor search BEFORE the registration form. On match, select the existing donor — no new record. Only show the form when no match is found or staff confirms the person is new. On `409`: "This donor is already registered. Please search for them and select their existing record."

When an existing donor is selected: show their contact info with an inline "Update contact info" option (PATCH /api/donors/:id/contact for field roles). If the selected donor has no email, prompt staff to add one via the contact update form BEFORE proceeding to the donation step.

---

### PATCH /api/donors/:id
**Admin, PRC Staff only**
All fields optional, at least one required. Same validation as create.

---

### PATCH /api/donors/:id/contact
**Volunteer, Phlebotomist only** (Admin/Staff use `PATCH /api/donors/:id`)
Not gated by `requireBloodDrive` — field staff can call this without an active drive.

Request:
```json
{ "email": "new@email.com", "contact": "09171234567" }
```

At least one field required. Sending any field other than `email`/`contact` → `400`.

Response `200`:
```json
{ "success": true, "message": "Donor contact information updated successfully", "data": { ...full donor object... } }
```

Errors: `400` — validation failure or disallowed field sent, `404` — donor not found

Frontend: show email + contact as inline-editable only (not a full form). All other fields read-only for these roles.

---

### DELETE /api/donors/:id
**Admin only**

### Donor Endpoint Role Access Summary
| Endpoint | Roles | Notes |
|---|---|---|
| GET /api/donors | Admin, PRC Staff, Volunteer, Phlebotomist | All |
| GET /api/donors/search?q= | Admin, PRC Staff, Volunteer, Phlebotomist | Server-side search |
| GET /api/donors/:id | Admin, PRC Staff, Volunteer, Phlebotomist | Read-only for field roles |
| POST /api/donors | Admin, PRC Staff, Volunteer, Phlebotomist | Field roles need active drive |
| PATCH /api/donors/:id | Admin, PRC Staff only | Full edit |
| PATCH /api/donors/:id/contact | Volunteer, Phlebotomist only | Contact info only |
| DELETE /api/donors/:id | Admin only | Hard delete |

---

## Donor Interview Endpoints

### GET /api/donor-interviews
**All roles**
Response `200`: array of interviews (same fields as single below).

### GET /api/donor-interviews/donor/:donor_id
**All roles**
Response `200`: array of interviews for that donor.

### GET /api/donor-interviews/:id
**All roles**

Response `200`:
```json
{
  "success": true,
  "data": {
    "interview_id": 1,
    "donor_id":     1,
    "branch_id":    1,
    "drive_id":     2,
    "created_at":   "..."
  }
}
```

Note: `drive_id` is `null` for Admin/Staff walk-in operations — this is correct.

### POST /api/donor-interviews
**All roles**
Volunteer/Phlebotomist: requires active blood drive assignment.

Behavior:
- If this donor already has a pending interview in the current drive, the backend returns the existing interview session instead of creating a duplicate.
- If the donor already has a completed interview in the current drive, the backend rejects the request with `409 Conflict`.

Request:
```json
{
  "donor_id":  1,
  "branch_id": 1
}
```

Note: `drive_id` is set automatically by middleware — do not send it.

**Workflow dropbox filtering (frontend-side, applies to all 5 steps):**
Each step's donor selector should show only donors valid for that step. Filter by completion of the prior step using data already fetched from the relevant list endpoints.
- Interview page: show donors registered in this drive who have no interview yet
- Screening page: show donors with a completed interview but no screening yet
- Donation page: show donors with an `Eligible` screening but no donation yet
- Collection page: show donors with a completed donation but no collection yet

Admin/Staff walk-in (drive_id = null): show all donors in the system unfiltered — they are not scoped to a drive. Sequential prerequisite logic still applies per donor.

---

## Interview Answer Endpoints

### POST /api/interview-answers
**All roles**

Request:
```json
{
  "interview_id": 1,
  "donor_id":     1,
  "answers": [
    { "question_id": 1, "answer": "YES" },
    { "question_id": 2, "answer": "NO"  }
  ]
}
```

CRITICAL: field is `interview_id` — NOT `screening_id`. `answer` must be exactly `"YES"` or `"NO"` (uppercase).

---

## Interview Question Endpoints

### GET /api/interview-questions
**All roles**

### GET /api/interview-questions/sex/:sex
Note: route parameter is :sex (not :gender) — backend route was previously
registered as /gender/:sex in error. Corrected to /sex/:sex to match this contract.
**All roles**
`:sex` — `Male` or `Female`

### PATCH /api/interview-questions/:id
**Admin only**

```json
{
  "question_text": "string",
  "sex_filter":    "Both",
  "defer_if":      "YES"
}
```

---

## Screening Endpoints

### GET /api/screenings
### GET /api/screenings/donor/:donor_id
### GET /api/screenings/:id
**All roles**

### POST /api/screenings
**All roles**
Volunteer/Phlebotomist: requires active blood drive.

Request:
```json
{
  "interview_id":         1,
  "hemoglobin":           14.5,
  "screening_result":     "Eligible",
  "weight":               65,
  "pulse_rate":           72,
  "blood_pressure":       "120/80",
  "blood_type_confirmed": "O+",
  "hemoglobin_status":    "Allowed"
}
```

Required: `interview_id`, `hemoglobin`, `screening_result`
Business rules: Male hgb min 13.0, Female min 12.5, both max 20.0 g/dL
If `screening_result` is `Deferred`, deferral record created automatically.

### PATCH /api/screenings/:id
**Admin, PRC Staff only**

---

## Donation Endpoints

### GET /api/donations
### GET /api/donations/donor/:donor_id
### GET /api/donations/:id
**All roles**

### POST /api/donations
**All roles**
Volunteer/Phlebotomist: requires active blood drive.

Request:
```json
{
  "screening_id":    1,
  "extraction_time": 10
}
```

Business rules: Screening must be Eligible, donor must have email, extraction > 15 min → is_qns: true

### PATCH /api/donations/:id
**Admin, PRC Staff only**

---

## Blood Collection Endpoints

### GET /api/blood-collections
### GET /api/blood-collections/:id
### GET /api/blood-collections/branch/:branch_id
**Admin, PRC Staff only**

### POST /api/blood-collections
**All roles**
Volunteer/Phlebotomist: requires active blood drive.

Request:
```json
{
  "donation_id": 1,
  "blood_type":  "O+",
  "component":   "Whole Blood",
  "volume_ml":   450
}
```

### PATCH /api/blood-collections/:id/status
**Admin, PRC Staff only**

Request:
```json
{
  "status": "Safe",
  "reason": "string"
}
```

Business rule: QNS collections (is_qns=true) cannot be marked Safe.
When marked Safe, blood unit created automatically in inventory.

---

## Blood Unit Endpoints

### GET /api/blood-units
### GET /api/blood-units/:id
**Admin, PRC Staff**

Response fields: `unit_id`, `blood_type`, `component`, `status`, `expiration_date`,
`branch_id`, `drive_id`, `donation_id`, `donor_id`

### PATCH /api/blood-units/:id/status
**Admin, PRC Staff**

Request:
```json
{
  "status": "Withdrawn",
  "reason": "string"
}
```

Terminal states (no update allowed): `Released`, `Disposed`, `Withdrawn`, `Separated`, `Expired`

### POST /api/blood-units/:id/separate
**Admin, PRC Staff**
Only for Whole Blood + Available units.
On success: source unit → Separated (terminal), 3 new Pending collections created (PRBC, Platelets, FFP).

---

## Blood Request Endpoints

### GET /api/blood-requests
**Admin, PRC Staff, Requestor**
Requestors only see their own requests (enforced server-side — no filter needed).

Response `200`:
```json
{
  "success": true,
  "data": [{
    "request_id":    1,
    "status":        "Pending",
    "urgency_level": "Routine",
    "diagnosis":     "string",
    "hospital_id":   1,
    "hospital_name": "string",
    "created_at":    "...",
    "items": [
      { "blood_type": "O+", "component": "Whole Blood", "quantity": 2 }
    ]
  }]
}
```

### GET /api/blood-requests/:id
**Admin, PRC Staff, Requestor**

Response `200`:
```json
{
  "success": true,
  "data": {
    "request_id": 1,
    "status":     "Pending",
    "created_at": "...",
    "items": [
      { "blood_type": "O+", "component": "Whole Blood", "quantity": 2 }
    ]
  }
}
```

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

### PATCH /api/blood-requests/:id/status
**Admin, PRC Staff**

Request:
```json
{
  "status": "Approved",
  "reason": "string"
}
```

Valid transitions: Pending→Approved, Pending→Rejected, Approved→Released, Approved→Rejected
On Approved: FEFO auto-assignment of blood units.
Race condition protection: SELECT FOR UPDATE prevents double-approval.

### PATCH /api/blood-requests/:id/cancel
**Requestor only**
No body required. Only works on own Pending requests.
Returns 404 if not Pending or not owned by requestor.

### POST /api/blood-requests/fulfillment-options
**Requestor only**

### GET /api/blood-requests/estimate/:branch_id
**Requestor only**

---

## Deferral Endpoints

### GET /api/deferrals
**Admin, PRC Staff**

### GET /api/deferrals/donor/:donor_id
**Admin, PRC Staff, Volunteer, Phlebotomist**

### GET /api/deferrals/:id
**Admin, PRC Staff**

---

## Notification Endpoints

### GET /api/notifications
**All authenticated roles**
Scoped to own notifications server-side — no filter needed.

Response `200`:
```json
{
  "success": true,
  "data": [{
    "notification_id": 1,
    "user_id":         2,
    "type":            "blood_request_new",
    "message":         "New blood request submitted",
    "is_read":         false,
    "created_at":      "..."
  }]
}
```

### GET /api/notifications/unread-count
**All authenticated roles**
Response `200`:
```json
{ "success": true, "data": { "count": 3 } }
```

### PATCH /api/notifications/:id/read
**All authenticated roles**
Scoped to own notifications server-side.

### PATCH /api/notifications/read-all
**All authenticated roles**

---

## Branch Endpoints

### GET /api/branches
**All authenticated roles** — reference data for dropdowns

### GET /api/branches/:id
**All authenticated roles**

### POST /api/branches
**Admin only**

### PATCH /api/branches/:id
**Admin only**

### DELETE /api/branches/:id
**Admin only**

---

## Hospital Endpoints

### GET /api/hospitals
**All authenticated roles** — reference data for blood request forms

### GET /api/hospitals/:id
**All authenticated roles**

### POST /api/hospitals
**Admin only**

### PATCH /api/hospitals/:id
**Admin only**

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
  "request_id":    1,
  "status":        "Pending",
  "created_at":    "...",
  "branch_id":     1,
  "patient_name":  "...",
  "urgency_level": "Routine"
}
```

Frontend action: increment notification badge, if on blood-requests page prepend new row.

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

### Room assignment — server-side only
```javascript
socket = io(url, {
  auth: { user_id, role_id, branch_id },
  withCredentials: true,
});
```

Rooms assigned by backend on connect:
- Requestor (role_id 4) → `user_${user_id}` (private)
- Any role with branch_id → `branch_${branch_id}`
- Admin (role_id 1) → also `admin_global`

Frontend NEVER calls `socket.emit('join_room', ...)` — no handler exists on backend.

---

## Validation Rules Summary

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

### Business Rules the Frontend Should Enforce (backend also rejects)
| Rule | Where |
|---|---|
| Donor workflow sequential: interview → answers → screening → donation → collection | All field operation pages |
| Only show valid blood request transition buttons | Blood requests page |
| Volunteer/Phlebotomist identity fields are read-only | Profile edit form |
| Drive status Ended/Cancelled — no edit allowed | Drive edit form |
| Blood unit terminal states — no status update button | Blood units page |
| QNS collections cannot be marked Safe | Collection status form |
| Requestors cannot see blood collections or blood units | Role-based page access |
| Only show Separate button for Whole Blood + Available | Blood units page |
| Cancel only on Pending requests owned by current requestor | Blood requests page |
| Donor email required | Donor registration form |
| answer values must be uppercase YES/NO | Interview answers form |
| Separated blood unit — hide all action buttons (terminal) | Blood units page |

---

## Email Notifications (informational — frontend does not trigger these)
| Trigger | Recipient | Channel |
|---|---|---|
| Volunteer/Phlebotomist assigned to drive | Assigned user | Email with confirm/decline buttons |
| Donation created | Donor | Email — post-extraction instructions |
| Daily inventory low stock | Branch staff + all admins | Email + socket |
| Daily inventory near expiry | Branch staff + all admins | Email + socket |