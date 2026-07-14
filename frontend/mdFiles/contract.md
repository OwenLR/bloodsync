# BloodSync — Frontend Contract
# Source of truth for API routes, request fields, response fields, valid values.
# Upload this file when building or modifying any API-touching feature.
# Do NOT guess field names — if a response field is not listed here, upload the backend model first.

NOTE: Role brackets throughout this document ([Admin, Staff], etc.)
describe backend route permissions only — NOT which roles have a
frontend page for that feature. Several features (Blood Units, Blood
Collections, Inventory Cleaning, Blood Separation, Blood Requests) permit
Admin at the backend route level but have no Admin frontend page, by
deliberate project decision. Always check sessionState.md's Permanent
Rules and rules.md's Role Responsibilities table for actual frontend
access before assuming a bracket implies a page exists.

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
| Blood Request | `Pending \| Approved \| Waiting \| Released \| Rejected \| Cancelled` | Cancelled = requestor self-cancel only, never a staff action — see transitions below |
| Donor | `Active \| Inactive \| Deferred` | |
| User | `Active \| Inactive \| Pending \| Declined` | |
| Urgency | `Routine \| STAT` | |
| Venue type | `School \| Hospital \| Community Center \| Church \| Government \| Other` | |

### Blood Request Transitions
Source of truth: `bloodRequestRules.js` VALID_TRANSITIONS.
`Pending → Approved | Rejected`
`Approved → Waiting | Rejected`
`Waiting → Released | Rejected`
`Released`, `Rejected` — terminal, no further transitions.
Cancelled: NOT part of VALID_TRANSITIONS — reachable ONLY via
PATCH /:id/cancel (requestor self-cancel, Pending only, direct DB update,
bypasses the transition table entirely). Cannot be set through
PATCH /:id/status.
Waiting → Released can happen two ways: requestor confirms receipt via
PATCH /:id/received, OR staff manually releases via PATCH /:id/status.

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
| extraction_time_seconds | TOTAL seconds (minutes*60 + seconds) — collected as two separate minutes/seconds inputs on the frontend and combined before sending. Supersedes the old whole-minutes-only extraction_time field (gochas.md #63). |
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

### GET /api/donors/:donor_id/cycle-status  [Admin, Staff, Vol, Phleb]
Walk-in (Staff/Admin, non-drive) cycle status only — resolves whether the
donor's most recent non-drive interview->screening->donation->collection
chain is in progress, in a deferral cooldown, or free to restart. Not
meaningful for Volunteer/Phlebotomist drive-scoped flows, which use a
separate, already-correct drive_id-scoped mechanism instead.
Response: `{ state, ...contextual fields }` where state is one of:
  `available` | `resume_interview` | `proceed_screening` |
  `proceed_donation` | `proceed_collection` | `cooldown`
`cooldown` responses additionally include `retryAt` (ISO timestamp) and
`step` (`interview`|`screening`|`donation`). See donorCycleRules.js
(backend) / donorCycleStatus.js (frontend) for the full state machine.
⚠ Registered AFTER /:id to avoid route-shadowing concerns — two path
  segments, same precedent as PATCH /:id/contact.

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
  `extraction_date`, `blood_volume_ml`, `extraction_time_seconds`, `reaction_notes`,
  `is_qns`, `qns_reason`, `branch_id`, `branch_name`, `drive_id`, `created_at`,
  `extracted_by`, `extracted_by_first`, `extracted_by_last`,
  `phlebotomist_id`, `phlebotomist_first`, `phlebotomist_last`

### POST /api/donations  [All roles — Vol/Phleb need active drive]
Request: `screening_id`, `extraction_time_seconds`, `phlebotomist_id` (optional)
⚠ extraction_time_seconds = TOTAL seconds (minutes*60 + seconds), not whole
  minutes. Frontend collects minutes + seconds as two separate inputs and
  combines them before sending — see fieldWorkflowValidation.js's
  validateDonation(). Replaces the old extraction_time_minutes column/field
  this session — see gochas.md #63.
⚠ extraction_time_seconds > EXTRACTION.MAX_DURATION_MINUTES*60 (900s / 15min)
  → is_qns: true (set automatically, via donationRules.js's
  evaluateExtractionTime() — not a separate hardcoded check, see gochas.md #62)
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
Response fields: `collection_id`, `blood_type`, `component`, `volume_ml`, `barcode`,
  `collection_date`, `expiration_date`, `status`, `is_qns`, `qns_reason`, `notes`,
  `created_at`, `approved_at`, `rejected_at`, `rejection_reason`,
  `extraction_time_seconds` (joined from the linked donation — added this
  session, displayed on the Blood Collections detail modal), `donor_id`,
  `first_name`, `last_name`, `branch_name`, `collected_by_first`, `collected_by_last`,
  `approved_by_first`, `approved_by_last`,
  `source_unit_id` (nullable — set ONLY on collections created via
  POST /api/blood-units/:id/separate; links back to the whole blood unit
  it was derived from. NULL for normal donation-flow collections. Frontend
  can use this to distinguish "collection from a donor donation" vs
  "collection derived from separation" if a display distinction is ever needed —
  not currently surfaced in the UI, but the field exists on every collection row.)

### GET /api/blood-collections/branch/:branch_id  [Admin, Staff only]
⚠ Returns 403 for Vol/Phleb — catch silently with .catch(() => [])
Response fields (list — narrower than detail): `collection_id`, `blood_type`,
  `component`, `volume_ml`, `barcode`, `expiration_date`, `status`, `collection_date`,
  `is_qns`, `qns_reason`, `notes`, `created_at`, `donor_id`, `first_name`, `last_name`,
  `collected_by_first`, `collected_by_last`

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
⚠ PRC Staff: automatically scoped to own branch — backend returns branch-only
  units via getUnitsByBranchAll, not getAllUnits. Admin sees all branches.
  (Fixed this session — previously no branch enforcement for Staff on this route.)

### GET /api/blood-units/branch/:branch_id  [Admin, Staff]
⚠ PRC Staff: 403 if branch_id in URL does not match JWT branch_id.
  (Fixed this session — previously no ownership check.)
⚠ Returns ALL statuses (Available, Reserved, Released, Disposed, Withdrawn,
  Separated, Expired) — not just Available. Use this for the Staff inventory page.
  (Fixed this session — previously returned Available + non-expired only.)

### GET /api/blood-units/:id  [Admin, Staff]
Response fields (GET / and GET /branch/:branch_id list):
  `unit_id`, `blood_type`, `component`, `volume_ml`, `barcode`,
  `collection_date`, `expiration_date`, `status`, `near_expiry`,
  `disposal_reason`, `withdrawal_reason`, `created_at`,
  `donor_id`, `first_name`, `last_name`

Response fields (GET /:id detail):
  All list fields plus: `collection_id`, `donation_id`, `branch_id`, `drive_id`,
  `branch_name`, `processed_at`, `processed_by_first`, `processed_by_last`

⚠ status field — 'Expired' is computed server-side via SQL CASE expression
  in ALL three GET query functions (getAllUnits, getUnitsByBranchAll, getUnitById).
  A unit with status='Available' AND expiration_date <= NOW() returns status='Expired'
  in the API response. The DB row still says 'Available' — never set to 'Expired'
  by any write operation. Frontend never needs to compute expiry from the date field
  for display purposes. (Fixed this session.)

⚠ near_expiry field — boolean, added this session to the same three GET query
  functions as the Expired computation above (getAllUnits, getUnitById,
  getUnitsByBranchAll — NOT getUnitsByBranch, which is FEFO-only). True only
  when status is Available, not yet expired, and expiration_date falls within
  the per-component NEAR_EXPIRY_DAYS threshold from
  constants/inventoryRulesConstant.js (Whole Blood: 7 days, Packed Red Blood
  Cells: 7 days, Platelets: 2 days, Fresh Frozen Plasma: 30 days). Frontend
  never computes this client-side — reads the boolean directly, same pattern
  as the Expired status field.

### PATCH /api/blood-units/:id/status  [Admin, Staff]
Request: `status`, `reason`
⚠ Terminal states (no update allowed): Released, Disposed, Withdrawn, Separated,
  Expired. Backend (assertNotTerminal in bloodUnitRules.js) now also rejects if
  expiration_date has passed, regardless of stored status string.
  (Fixed this session — previously assertNotTerminal only checked status column,
  not expiration_date, so expired Available units could still accept status updates.)
⚠ reason required for: Disposed, Withdrawn (backend: REASON_REQUIRED_STATUSES)
⚠ Staff inventory page (Section 2) only exposes Disposed and Withdrawn as UI
  actions — Available/Reserved/Released/Separated/Expired are not triggerable
  from the frontend on this page.
⚠ Both this route and /:id/separate below now invalidate
  cache:blood-units:availability and cache:blood-units:inventory on success
  (fixed this session — previously only blood unit creation via markAsSafe
  invalidated these keys; status changes and separation left stale cache
  entries for up to 60s).

### POST /api/blood-units/:id/separate  [Admin, Staff]
No request body — unit_id from URL only.
Only valid for: component=Whole Blood AND status=Available (backend: assertSeparable
  in bloodUnitRules.js). Uses the same server-computed status field as above —
  an Available-but-expired unit is already returned as status='Expired', so no
  extra date check is needed frontend-side beyond checking the status string.
Staff: 403 if unit's branch_id doesn't match JWT branch_id
Response: `{ separated_unit, derived_collections: [...] }`
  `separated_unit` — the source unit's raw row (status now 'Separated', terminal) —
    NOT joined with donor/branch display names. UI must source display fields
    (donor name, blood type, branch) from the unit row already in hand before
    calling this endpoint, not from this response.
  `derived_collections` — array of 3 new blood_collections rows (Packed Red
    Blood Cells, Platelets, Fresh Frozen Plasma), each `status: 'Pending'`,
    with a fresh `collection_date` (NOW()) and `expiration_date` computed from
    the moment of separation — NOT inherited from the source unit's own
    expiration_date. Each carries `source_unit_id` pointing back to the
    original whole blood unit (see source_unit_id note under Blood Collection
    Endpoints above). Each must pass Blood Testing again (PATCH
    /api/blood-collections/:id/status) before becoming its own blood unit —
    same lifecycle as any donation-flow collection.
Errors: 404 unit not found | 400 not Whole Blood / not Available |
  403 wrong branch (Staff) | 500 expiry days not configured for a component
  (component_expiry_days table missing a row — not expected in normal operation)
⚠ Runs as a DB transaction — marking the unit Separated and inserting the
  3 derived collections either both succeed or both roll back. Frontend
  never needs to handle a partial-separation state.
⚠ Frontend (Section 4, Blood Separation page) exposes this as a single-unit
  action with a plain confirm dialog (not the typed-word pattern used for
  Inventory Cleaning's bulk removal) — separation isn't a bulk/multi-select
  action, so the extra confirmation friction wasn't judged necessary; the
  confirm message itself states the action is irreversible.

---

## Blood Request Endpoints

Two-step submission flow (per bloodsync.md items 9–17): the backend does
NOT auto-pick a branch at submit time. The requestor must call
POST /fulfillment-options first to see branch availability / split
options, then submit POST / with whichever branch_id they chose. Do not
build a submit form that sends items directly without this first step.

### GET /api/blood-requests  [Admin, Staff]
Admin: sees all branches. PRC Staff: scoped to own branch server-side
(getRequestsByBranch) — no frontend filter needed, and no 403 either;
the endpoint just silently returns only that branch's requests.
(Branch-scoping fixed this session — previously returned all branches to
every role.)
Response fields: `request_id`, `user_id`, `first_name`, `last_name`,
  `hospital_id`, `hospital_name`, `branch_id`, `branch_name`,
  `patient_name`, `patient_age`, `diagnosis`, `urgency_level`,
  `request_form_path`, `fulfillment_type`, `delivery_address`,
  `preferred_branch_id`, `status`, `denial_reason`, `reviewed_by`,
  `reviewed_at`, `notes`, `created_at`, `updated_at`

### GET /api/blood-requests/:id  [Admin, Staff]
PRC Staff: 403 if the request's branch_id doesn't match JWT branch_id
(fixed this session — previously no check).
Response: all fields from the list endpoint above, plus:
  `items: [{ item_id, request_id, blood_type, component, units_requested,
  units_fulfilled }]`,
  `reservations: [{ reservation_id, request_id, item_id, unit_id,
  reserved_by, notes, branch_id, status, released_at, blood_type,
  component, expiration_date, barcode, branch_name }]`,
  `logs: [{ log_id, request_id, old_status, new_status, changed_by_type,
  changed_by_id, notes, created_at }]`

### GET /api/blood-requests/my-requests  [Requestor]
Scoped to own requests server-side — no frontend filter needed.
Response fields (narrower than the staff list — no reviewed_by/notes):
  `request_id`, `hospital_id`, `hospital_name`, `branch_id`,
  `branch_name`, `patient_name`, `urgency_level`, `fulfillment_type`,
  `delivery_address`, `status`, `denial_reason`, `created_at`

### POST /api/blood-requests  [Requestor only — multipart/form-data]
Request: `hospital_id`, `branch_id` (chosen from fulfillment-options —
NOT auto-computed, see note above), `patient_name`, `patient_age`,
`diagnosis`, `urgency_level`, `notes`, `fulfillment_type` (defaults
'Pickup'), `delivery_address`, `preferred_branch_id`,
`items: [{ blood_type, component, units_requested }]` (JSON string in
multipart, parsed server-side), `request_form` (file field — uploaded to
Cloudinary, stored as `request_form_path`)
Validation (bloodRequestValidator.js): `hospital_id`, `branch_id`,
`patient_name` required; each item needs `blood_type` (valid enum),
`component` (valid enum), `units_requested` (positive integer, max 10 per
item — MAX_UNITS_PER_ITEM); total units across all items capped at 10
(MAX_UNITS_PER_REQUEST). Both caps are policy constants in
bloodRequestConstant.js, not hardcoded — check there if PRC changes the
limits.
On success: notification created for branch staff + socket event
blood_request_new emitted to `branch_{branch_id}` room.

### POST /api/blood-requests/fulfillment-options  [Requestor]
Body: `items: [{ blood_type, component, units_requested }]`, `latitude`
(optional), `longitude` (optional — system still works without location,
just sorts branches alphabetically instead of by distance)
Response: `{ plans: [{ ...item, plan: { canSingleBranch,
singleBranchOption, splitOption, totalAvailable } }],
recommendation: 'single_branch' | 'split', any_insufficient: boolean }`
Read-only — no mutation, no notification, no cache write. Call this
before POST / to get the branch_id(s) to present to the requestor.

### GET /api/blood-requests/estimate/:branch_id  [Requestor]
Response: `{ pending_count, estimate: <label string>, next_open:
<string|null>, is_open: boolean }`. Estimate label is queue-depth based
(WAIT_TIME_ESTIMATES in bloodRequestConstant.js), not a fixed value —
don't hardcode any of the label strings frontend-side.

### PATCH /api/blood-requests/:id/status  [Admin, Staff]
Request: `status`, `denial_reason` (required if status is 'Rejected')
PRC Staff: 403 if the request's branch_id doesn't match JWT branch_id
(fixed this session — previously no check).
Valid transitions — see "Blood Request Transitions" above. This route
can perform Pending→Approved, Pending→Rejected, Approved→Waiting,
Approved→Rejected, Waiting→Released, Waiting→Rejected. It cannot set
Cancelled.
⚠ Response shape is NOT consistent across transitions —
bloodRequestService.js's updateStatus() dispatches differently per
status: Approved returns { request: {...}, reservations: [...] }
(nested); Waiting/Released/Rejected return the raw blood_requests row
directly (flat, RETURNING * from the model). Frontend should not assume
a fixed shape from this endpoint's response — for single-record views,
refetch via GET /:id after a successful mutation instead of parsing the
response.
On Approved: FEFO auto-assignment/reservation of blood units, spilling
across branches if the request's own branch is short (see
fulfillmentService.js buildFulfillmentPlan logic, applied here via the
service layer — reservations created, unit status Available→Reserved).
On Rejected (from Approved or Waiting): any reserved units are freed back
to Available.
Notifies the requestor (DB notification + socket event
blood_request_status to `user_{user_id}`) on Approved/Waiting/Released/
Rejected — see gochas.md #44.

### PATCH /api/blood-requests/:id/ready  [Admin, Staff]
Staff marks units ready for pickup — Approved → Waiting only.
PRC Staff: 403 if the request's branch_id doesn't match JWT branch_id
(fixed this session — previously no check).
No body. Notifies the requestor same as /status above.

### PATCH /api/blood-requests/:id/cancel  [Requestor only]
No body. Own Pending requests only. Direct DB update, bypasses
VALID_TRANSITIONS entirely (Cancelled is not reachable via /status).
Returns 404 if not Pending or not owned.
Response: raw blood_requests row (RETURNING * — no joined display
fields like hospital_name/branch_name). Frontend should patch only
known fields (e.g. status) into cached state, not replace a list item
with this response wholesale.
Does NOT send a notification or socket event — see gochas.md #44.

### PATCH /api/blood-requests/:id/received  [Requestor only]
Requestor confirms receipt — Waiting → Released. Reserved units'
reservation status updates accordingly.
No body.
Response: raw blood_requests row (RETURNING * — no joined display
fields like hospital_name/branch_name). Same patch-not-replace caution
as /cancel above.
Does NOT send a notification or socket event — see gochas.md
#44. Update the UI from this call's own response, not from a socket
listener.

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
Payload: `request_id`, `patient_name`, `urgency_level`
Frontend: increment notification badge; if on blood-requests page, prepend new row

### blood_request_status
Received by: the requesting Requestor only (via user_{user_id} room)
Trigger: staff/service-layer transitions to Approved, Waiting, Released, or
Rejected via PATCH /:id/status or PATCH /:id/ready. Does NOT fire on
cancelRequest or markReceived (those two are direct Requestor actions with
no notification/socket side effect — see gochas.md #44; update the UI from
the API response for those two instead of listening for this event).
Payload: `request_id`, `new_status`, `patient_name`, `reason` (null unless
Rejected)

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
| Blood unit Expired status — server-computed from expiration_date, never set by a write op. Frontend checks status string only — no date math needed. | Blood units |
| QNS collection → hide Safe button | Blood collections |
| Only Separate button for Whole Blood + Available | Blood units / Blood Separation |
| Separated components must pass Blood Testing again before becoming available inventory — each derived collection starts as Pending, same as a donation-flow collection | Blood Testing / Blood Separation |
| Cancel button only on own Pending requests | Blood requests |
| Submit flow is two steps: POST /fulfillment-options to choose a branch, then POST / with that branch_id — backend does not auto-pick a branch | Blood requests — submit |
| Only show action buttons matching the real transition table (Pending→Approved/Rejected, Approved→Waiting/Rejected, Waiting→Released/Rejected) — Cancelled is requestor-only via a separate route, never a status-button option | Blood requests — staff management |
| Only Expired blood units are selectable for bulk removal — near-expiry is visual-only, not actionable | Inventory Cleaning |
| Bulk removal requires typing "remove" to confirm | Inventory Cleaning |
| Donor email required before donation step | donorDonation.html |
| answer values uppercase YES/NO | Interview form |
| Deferred donors blocked from proceeding | All workflow steps |
| Admin excluded from all field workflow pages | donorRegistration/Interview/Screening/Donation |
| Admin excluded from Blood Testing / Blood Units / Inventory Cleaning / Blood Separation / Blood Requests (management + detail pages) — Staff only, despite backend routes allowing Admin | All 5 sections |