# BloodSync — Frontend Contract
# Source of truth for API routes, request fields, response fields, valid values.
# Upload this file when building or modifying any API-touching feature.
# Do NOT guess field names — if a response field is not listed here, upload the backend model first.

---

## Valid Values

### Roles
| role_id | Role | Notes |
|---|---|---|
| 1 | Admin | Management only — no workflow |
| 2 | PRC Staff | Walk-in workflow + management |
| 3 | Donor | Not a login role |
| 4 | Requestor | Mobile + web |
| 5 | Volunteer | Drive workflow only |
| 6 | Phlebotomist | Drive workflow only |

### Blood Types
`A+ | A- | B+ | B- | AB+ | AB- | O+ | O-`

### Blood Components
`Whole Blood | Packed Red Blood Cells | Platelets | Fresh Frozen Plasma`

### Status Values
| Entity | Values | Notes |
|---|---|---|
| Blood Drive | `Upcoming \| Ongoing \| Ended \| Cancelled` | Computed server-side — never recompute on frontend |
| Drive Participant | `Assigned \| Confirmed \| Declined \| No Show` | |
| Screening result | `Eligible \| Deferred` | Auto-computed from hemoglobin — never a manual select |
| Hemoglobin status | `Allowed \| Not Allowed` | Auto-computed — never a manual select |
| Blood Collection | `Pending \| Safe \| Rejected \| Disposed \| Withdrawn` | |
| Blood Unit | `Available \| Reserved \| Released \| Disposed \| Withdrawn \| Expired \| Separated` | Released/Disposed/Withdrawn/Expired/Separated = terminal |
| Blood Request | `Pending \| Approved \| Released \| Rejected \| Cancelled` | Cancelled = display only, never a staff action |
| Donor | `Active \| Inactive \| Deferred` | |
| User | `Active \| Inactive \| Pending \| Declined` | |
| Urgency | `Routine \| STAT` | |
| Venue type | `School \| Hospital \| Community Center \| Church \| Government \| Other` | |

### Blood Request Transitions
`Pending → Approved | Rejected`
`Approved → Released | Rejected`
Cancelled: set only via PATCH /:id/cancel (requestor self-cancel, Pending only)

### Validation Rules
| Field | Rule |
|---|---|
| email | valid format |
| password | min 8 chars |
| contact/phone | digits only, 7–15 digits — strip non-digits before sending |
| birthdate | YYYY-MM-DD, not in future, age 18+ for donors |
| zip_code | digits only, 4–10 digits |
| blood_pressure | NNN/NN format e.g. 120/80 |
| datetime fields | ISO 8601 e.g. 2025-10-01T08:00:00+08:00 |
| answer values | exactly "YES" or "NO" — uppercase, backend rejects lowercase |
| extraction_time | whole minutes only — Math.round() before sending |
| hemoglobin | Male 13.0–20.0, Female 12.5–20.0 g/dL |

---

## Auth Endpoints

### POST /api/auth/login  [Public]
Request: `email`, `password`
Response: user object → `user_id`, `first_name`, `last_name`, `email`, `role_id`, `branch_id`
Web: sets httpOnly cookies — no token in body
Errors: 400 missing fields | 401 bad credentials/deactivated | 429 rate limit (5/15min)

### POST /api/auth/refresh  [Public]
Web: no body — cookie sent automatically. Response body.data = null (correct).
Errors: 401 invalid/expired refresh token

### POST /api/auth/logout  [Public]
Web: no body. Clears cookies.

### GET /api/auth/me  [All authenticated]
Response: `user_id`, `email`, `role_id`, `branch_id`, `first_name`, `last_name`
Does a DB lookup (not just JWT decode) — needed for navbar name on every page load.

### PATCH /api/auth/me/password  [All authenticated]
Request: `current_password`, `new_password` (min 8 chars, must differ)
Response: `user_id`
Errors: 400 validation/wrong current password | 404 user not found

---

## Registration Endpoints

### POST /api/requestors/register  [Public]
Request: `first_name`, `last_name`, `email`, `password`, `contact`
Errors: 400 validation | 409 email exists

### POST /api/volunteers/register  [Public — multipart/form-data]
### POST /api/phlebotomists/register  [Public — multipart/form-data]
Fields: `first_name`, `last_name`, `email`, `password`, `sex`, `contact`, `birthdate`,
  `zip_code`, `id_number`, `emergency_contact_phone`, `profile_img` (jpeg/png/jpg/pdf, max 5MB)
Response: user with status=Pending — awaits admin approval

---

## User Endpoints

### Simple CRUD  [Admin only unless noted]
| Endpoint | Method | Roles | Notes |
|---|---|---|---|
| /api/users | GET | Admin | Query: ?status=Active\|Inactive\|Pending |
| /api/users/:id | GET | Admin, Staff | |
| /api/users | POST | Admin | Creates Admin or Staff only |
| /api/users/:id | PATCH | Admin | All fields optional, min 1 |
| /api/users/:id | DELETE | Admin | |
| /api/users/me/profile-img | PATCH | Admin, Staff | multipart, field: profile_img |

GET /api/users response fields: `user_id`, `first_name`, `last_name`, `email`, `status`,
  `is_active`, `role_id`, `role_name`, `branch_id`, `branch_name`

POST /api/users request: `first_name`, `last_name`, `email`, `password`, `role_id`, `branch_id`

PATCH /api/users/:id request: `first_name`, `last_name`, `email`, `role_id`, `branch_id`,
  `status`, `is_active` (all optional)

PATCH /api/users/me/profile-img response: `profile_id`, `user_id`, `profile_img` (Cloudinary URL)
⚠ Registered BEFORE /api/users/:id to prevent route shadowing.

---

## Volunteer/Phlebotomist Endpoints

### GET /api/volunteers/pending  [Admin]
Response fields per item: `user_id`, `first_name`, `last_name`, `email`, `status`, ...

### GET /api/volunteers/available  [Admin, Staff]
Query: `?role=5` (Volunteer) or `?role=6` (Phlebotomist) | `?municipality=Batangas City`
Response fields: `user_id`, `first_name`, `last_name`, `role_id`, `role_name`, `email`,
  `contact`, `address_municipality`, `address_province`, `profile_img`
⚠ Registered BEFORE /api/volunteers/:id/profile to prevent route shadowing.

### GET /api/volunteers/:id/profile  [Admin]
Response fields: `user_id`, `first_name`, `last_name`, `email`, `status`, `is_active`,
  `role_name`, `role_id`, `birthdate`, `sex`, `contact`, `address_street`, `address_brgy`,
  `address_municipality`, `address_province`, `zip_code`, `nationality`, `education`,
  `occupation`, `id_type`, `id_number`, `emergency_contact_name`, `emergency_contact_phone`,
  `profile_img`

### PATCH /api/volunteers/:id/approve  [Admin] — no body
### PATCH /api/volunteers/:id/decline  [Admin] — no body

### GET /api/volunteers/me/profile  [Vol, Phleb] — same fields as /:id/profile
### PATCH /api/volunteers/me/profile  [Vol, Phleb — multipart]
Allowed: `contact`, `address_street`, `address_brgy`, `address_municipality`,
  `address_province`, `zip_code`, `emergency_contact_name`, `emergency_contact_phone`, `profile_img`
⚠ LOCKED server-side (400 if sent): `first_name`, `last_name`, `birthdate`, `sex`

---

## Blood Drive Endpoints

### GET /api/blood-drives/confirm  [Public — returns HTML, not JSON]
Browser email link only — frontend never calls this programmatically.
⚠ Registered BEFORE /:id to prevent route shadowing.

### GET /api/blood-drives  [Admin, Staff]
### GET /api/blood-drives/:id  [Admin, Staff, Vol, Phleb]
### GET /api/blood-drives/branch/:branch_id  [Admin, Staff]
Response fields: `drive_id`, `name`, `description`, `status`, `branch_id`, `branch_name`,
  `start_datetime`, `end_datetime`, `slots_available`, `venue_name`, `venue_type`,
  `building`, `floor_room`, `street_address`, `city`, `province`, `postal_code`,
  `venue_latitude`, `venue_longitude`, `contact_person`, `contact_number`, `contact_email`,
  `created_by`, `created_by_first`, `created_by_last`, `cancelled_by`, `cancelled_by_first`,
  `cancelled_by_last`, `cancellation_reason`, `cancelled_at`

### POST /api/blood-drives  [Admin, Staff]
Required: `name`, `branch_id`, `start_datetime`, `end_datetime`
Optional: `description`, `venue_name`, `venue_type`, `building`, `floor_room`,
  `street_address`, `city`, `province`, `postal_code`, `slots_available`,
  `contact_person`, `contact_number`, `contact_email`, `venue_latitude`, `venue_longitude`
Staff: branch auto-set from JWT — cannot create for other branches (403)
Errors: 400 validation | 403 wrong branch | 422 past date / end before start

### PATCH /api/blood-drives/:id  [Admin, Staff]
Same optional fields as POST. Cannot update Cancelled/Ended → 400

### PATCH /api/blood-drives/:id/cancel  [Admin, Staff]
Request: `cancellation_reason`
Errors: 400 already Cancelled/Ended

### GET /api/blood-drives/:id/participants  [Admin, Staff]
Response fields: `drive_id`, `user_id`, `first_name`, `last_name`, `email`,
  `role_name`, `role_id`, `assignment_status`, `role_notes`, `assigned_at`,
  `assigned_by_first`, `assigned_by_last`

### POST /api/blood-drives/:id/participants  [Admin, Staff]
Request: `user_id`, `role_notes` (optional)
On success: assignment email sent with confirm/decline links

### DELETE /api/blood-drives/:id/participants/:user_id  [Admin, Staff]

### PATCH /api/blood-drives/:id/participants/:user_id  [Admin, Staff]
Request: `assignment_status`

### GET /api/blood-drives/:id/participants/suggestions  [Admin, Staff]
Query: `?role_id=5` | `?limit=20` (default 20, max 50)
Response fields: `user_id`, `first_name`, `last_name`, `role_id`, `role_name`,
  `address_municipality`, `address_province`, `distance_km`, `profile_img`
`distance_km` = null if drive or volunteer has no coordinates

### POST /api/blood-drives/:id/participants/bulk  [Admin, Staff]
Mode A (manual): `{ "user_ids": [1, 2, 3] }`
Mode B (auto-nearest): `{ "target_count": 30, "role_id": 5 }` (role_id optional)
Response: `total_assigned`, `total_failed`, `assigned[]`, `failed[]`
Already-assigned users → skipped (counted in total_failed, not errored)

### GET /api/blood-drives/:id/stats  [Admin, Staff]
Response fields: `drive_id`, `total_donors`, `new_donors`, `returning_donors`,
  `interviews_total/passed/failed/pending`, `screenings_total/eligible/deferred`,
  `donations_total/qns/valid`, `collections_total/pending/safe/rejected`

---

## Donor Endpoints

### Role Access Summary
| Endpoint | Roles | Notes |
|---|---|---|
| GET /api/donors | Admin, Staff, Vol, Phleb | |
| GET /api/donors/search?q= | Admin, Staff, Vol, Phleb | Server-side search |
| GET /api/donors/:id | Admin, Staff, Vol, Phleb | |
| POST /api/donors | Admin, Staff, Vol, Phleb | Field roles need active drive |
| PATCH /api/donors/:id | Staff only | Full edit |
| PATCH /api/donors/:id/contact | Vol, Phleb only | email + contact only |
| DELETE /api/donors/:id | Admin only | |

GET response fields: `donor_id`, `first_name`, `last_name`, `birthdate`, `sex`,
  `email`, `blood_type`, `contact`, `status`, `id_number`

POST request — Required: `first_name`, `last_name`, `birthdate`, `sex`, `email`
Optional: `blood_type`, `contact`, `id_number`
⚠ email required — missing email causes donation step to fail (backend sends post-extraction email)
Errors: 409 duplicate (detected via id_number) → show "already registered, search above"

PATCH /api/donors/:id/contact request: `email`, `contact` (at least one required)
⚠ Sending any other field → 400. Not gated by requireBloodDrive.

Workflow dropdown filtering (frontend cross-reference, all 4 steps):
- Interview: donors with no interview yet
- Screening: donors with passed interview, no screening yet
- Donation: donors with Eligible screening, no donation yet
- Collection: now merged into Donation page (donorDonation.html)
Staff walk-in (drive_id=null): show all donors — not scoped to a drive

---

## Interview Endpoints

### GET /api/donor-interviews  [All roles]
### GET /api/donor-interviews/donor/:donor_id  [All roles]
### GET /api/donor-interviews/:id  [All roles]
Response fields: `interview_id`, `donor_id`, `branch_id`, `drive_id`,
  `interview_result`, `conducted_by`, `created_at`
⚠ drive_id = null for Staff walk-in — correct, not a bug

### POST /api/donor-interviews  [All roles — Vol/Phleb need active drive]
Request: `donor_id`, `branch_id`
⚠ Never send drive_id — set by bloodDriveMiddleware
If donor has pending interview in current drive → returns existing session
If donor has completed interview in current drive → 409

### GET /api/interview-questions  [All roles]
### GET /api/interview-questions/sex/:sex  [All roles]
⚠ Route is /sex/:sex — NOT /gender/:sex (was a bug, now fixed)
`:sex` = `Male` or `Female`

### PATCH /api/interview-questions/:id  [Admin]
Request: `question_text`, `sex_filter`, `defer_if`

### POST /api/interview-answers  [All roles]
Request: `interview_id`, `donor_id`, `answers: [{ question_id, answer }]`
⚠ Field is interview_id — NOT screening_id
⚠ answer must be exactly "YES" or "NO" — uppercase

---

## Screening Endpoints

### GET /api/screenings  [All roles]
### GET /api/screenings/donor/:donor_id  [All roles]
### GET /api/screenings/:id  [All roles]
Response fields: `screening_id`, `interview_id`, `donor_id`, `branch_id`, `drive_id`,
  `hemoglobin`, `hemoglobin_status`, `screening_result`, `blood_type_confirmed`,
  `weight`, `pulse_rate`, `blood_pressure`, `screened_by`, `created_at`

### POST /api/screenings  [All roles — Vol/Phleb need active drive]
Required: `interview_id`, `hemoglobin`, `screening_result`
Optional: `weight`, `pulse_rate`, `blood_pressure`, `blood_type_confirmed`, `hemoglobin_status`
⚠ hemoglobin_status and screening_result are AUTO-COMPUTED on frontend — never a manual select
  Male min 13.0, Female min 12.5, both max 20.0 g/dL
⚠ blood_type_confirmed is required — backend rejects without it
If screening_result = Deferred → deferral record created automatically

### PATCH /api/screenings/:id  [Admin, Staff only]

---

## Donation Endpoints

### GET /api/donations  [All roles]
### GET /api/donations/donor/:donor_id  [All roles]
### GET /api/donations/:id  [All roles]
Response fields: `donation_id`, `donor_id`, `first_name`, `last_name`, `blood_type`,
  `screening_id`, `screening_result`, `hemoglobin`, `blood_type_confirmed`,
  `extraction_date`, `blood_volume_ml`, `extraction_time_minutes`, `reaction_notes`,
  `is_qns`, `qns_reason`, `branch_id`, `branch_name`, `drive_id`, `created_at`,
  `extracted_by`, `extracted_by_first`, `extracted_by_last`,
  `phlebotomist_id`, `phlebotomist_first`, `phlebotomist_last`

### POST /api/donations  [All roles — Vol/Phleb need active drive]
Request: `screening_id`, `extraction_time`, `phlebotomist_id` (optional)
⚠ extraction_time = whole minutes only
⚠ extraction_time > 15 → is_qns: true (set automatically)
⚠ Donor must have email on record — 400 if missing
⚠ phlebotomist_id: if drive active → must be assigned to that drive (role_id=6)
   If no drive (Staff walk-in) → any phlebotomist accepted
⚠ phlebotomist_id column requires migration:
   ALTER TABLE donations ADD COLUMN phlebotomist_id integer REFERENCES users(user_id);

### PATCH /api/donations/:id  [Admin, Staff only]

---

## Blood Collection Endpoints

### GET /api/blood-collections  [Admin, Staff only]
### GET /api/blood-collections/:id  [Admin, Staff only]
### GET /api/blood-collections/branch/:branch_id  [Admin, Staff only]
⚠ Returns 403 for Vol/Phleb — catch silently with .catch(() => [])

### POST /api/blood-collections  [All roles — Vol/Phleb need active drive]
Request: `donation_id`, `blood_type`, `component`, `volume_ml`
Component default: Whole Blood | Volume default: 450 mL | Range: 50–600 mL
When marked Safe → blood unit created automatically in inventory

### PATCH /api/blood-collections/:id/status  [Admin, Staff only]
Request: `status`, `reason`
⚠ QNS collections (is_qns=true) cannot be marked Safe → 400

---

## Blood Unit Endpoints

### GET /api/blood-units  [Admin, Staff]
### GET /api/blood-units/:id  [Admin, Staff]
Response fields: `unit_id`, `blood_type`, `component`, `status`, `expiration_date`,
  `volume_ml`, `branch_id`, `drive_id`, `donation_id`, `donor_id`, `collection_id`

### PATCH /api/blood-units/:id/status  [Admin, Staff]
Request: `status`, `reason`
⚠ Terminal states (no update): Released, Disposed, Withdrawn, Separated, Expired

### POST /api/blood-units/:id/separate  [Admin, Staff]
Only for: component=Whole Blood AND status=Available
On success: source → Separated (terminal), 3 new Pending collections created (PRBC, Platelets, FFP)

---

## Blood Request Endpoints

### GET /api/blood-requests  [Admin, Staff, Requestor]
Requestor: scoped to own requests server-side — no frontend filter needed
Response fields: `request_id`, `status`, `urgency_level`, `diagnosis`, `hospital_id`,
  `hospital_name`, `created_at`, `items: [{ blood_type, component, quantity }]`

### GET /api/blood-requests/:id  [Admin, Staff, Requestor]

### POST /api/blood-requests  [Requestor only]
Request: `hospital_id`, `diagnosis`, `items: [{ blood_type, component, quantity }]`
On success: socket event blood_request_new emitted to branch staff rooms

### PATCH /api/blood-requests/:id/status  [Admin, Staff]
Request: `status`, `reason`
Valid: Pending→Approved, Pending→Rejected, Approved→Released, Approved→Rejected
On Approved: FEFO auto-assignment of blood units

### PATCH /api/blood-requests/:id/cancel  [Requestor only]
No body. Own Pending requests only. Returns 404 if not Pending or not owned.

### POST /api/blood-requests/fulfillment-options  [Requestor]
### GET /api/blood-requests/estimate/:branch_id  [Requestor]

---

## Deferral Endpoints

### GET /api/deferrals  [Admin, Staff]
### GET /api/deferrals/donor/:donor_id  [Admin, Staff, Vol, Phleb]
### GET /api/deferrals/:id  [Admin, Staff]

---

## Notification Endpoints

### GET /api/notifications  [All authenticated]
Response fields: `notification_id`, `user_id`, `type`, `title`, `message`,
  `is_read`, `reference_id`, `reference_type`, `created_at`
Scoped to own notifications server-side.

### GET /api/notifications/unread-count  [All authenticated]
Response: `{ data: { count: 3 } }`

### PATCH /api/notifications/:id/read  [All authenticated]
### PATCH /api/notifications/read-all  [All authenticated]

---

## Reference Data Endpoints

### Branches
| Endpoint | Method | Roles |
|---|---|---|
| /api/branches | GET | All authenticated |
| /api/branches/:id | GET | All authenticated |
| /api/branches | POST | Admin only |
| /api/branches/:id | PATCH | Admin only |
| /api/branches/:id | DELETE | Admin only |

### Hospitals
| Endpoint | Method | Roles |
|---|---|---|
| /api/hospitals | GET | All authenticated |
| /api/hospitals/:id | GET | All authenticated |
| /api/hospitals | POST | Admin only |
| /api/hospitals/:id | PATCH | Admin only |
| /api/hospitals/:id | DELETE | Admin only |

---

## Socket Events

### blood_request_new
Received by: Admin, Staff (via branch_{branch_id} room)
Trigger: Requestor submits a blood request
Payload: `request_id`, `status`, `created_at`, `branch_id`, `patient_name`, `urgency_level`
Frontend: increment notification badge; if on blood-requests page, prepend new row

### inventory_low
Received by: Admin, Staff
Trigger: Daily cron 8AM PHT
Payload: `branch_id`, `branch_name`, `items: [{ blood_type, component, count }]`

### inventory_expiring
Received by: Admin, Staff
Trigger: Daily cron 8AM PHT
Payload: `branch_id`, `branch_name`, `items: [{ unit_id, blood_type, component, expiration_date }]`

### Socket connection
```javascript
socket = io(url, { auth: { user_id, role_id, branch_id }, withCredentials: true });
```
Rooms assigned server-side — never emit join_room manually.

---

## Business Rules — Frontend Must Enforce (backend also rejects)
| Rule | Page |
|---|---|
| Workflow sequential: Interview → Screening → Donation & Collection | Field pages |
| Only show valid blood request transition buttons | Blood requests |
| Vol/Phleb identity fields read-only | Profile edit |
| Drive Ended/Cancelled → no edit | Drive edit |
| Blood unit terminal states → hide all action buttons | Blood units |
| QNS collection → hide Safe button | Blood collections |
| Only Separate button for Whole Blood + Available | Blood units |
| Cancel button only on own Pending requests | Blood requests |
| Donor email required before donation step | donorDonation.html |
| answer values uppercase YES/NO | Interview form |
| Deferred donors blocked from proceeding | All workflow steps |
| Admin excluded from all field workflow pages | donorRegistration/Interview/Screening/Donation |