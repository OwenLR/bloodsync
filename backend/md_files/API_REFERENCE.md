# BloodSync API Reference

## Base URL
- Local: http://localhost:3000/api
- Production: Railway (not yet deployed)

## Authentication
All protected routes require:
Authorization: Bearer <token>
Token obtained from POST /api/auth/login or POST /api/requestors/login

## Role Access Legend
- PUBLIC — no token required
- ADMIN — role_id = 1
- STAFF — role_id = 2
- REQUESTOR — role_id = 4
- VOLUNTEER — role_id = 5
- PHLEBOTOMIST — role_id = 6

---

## Auth Routes

### POST /api/auth/login
Access: PUBLIC
Body: { email, password }
Response: { token, user: { user_id, first_name, last_name, email, role_id, branch_id } }
Notes: Covers all staff roles (Admin, PRC Staff, Volunteer, Phlebotomist, Requestor)

### POST /api/auth/logout
Access: PUBLIC
Response: { message: 'Logged out successfully' }

---

## Registration Routes

### POST /api/requestors/register
Access: PUBLIC
Body: { first_name, last_name, email, password, contact? }
Response 201: user record, status=Active immediately

### POST /api/volunteers/register
Access: PUBLIC
Body: form-data with optional profile_img file
Required: first_name, last_name, email, password
Optional: birthdate, sex, contact, address fields, id_type, id_number, emergency contact
Response 201: { user, profile }, status=Pending

### POST /api/phlebotomists/register
Access: PUBLIC
Same body as volunteers/register
Response 201: { user, profile }, role_id=6, status=Pending

### GET /api/volunteers/pending
Access: ADMIN
Response: All volunteer/phlebotomist profiles with status=Pending

### GET /api/volunteers/:id/profile
Access: ADMIN
Response: Full profile with user info

### PATCH /api/volunteers/:id/approve
Access: ADMIN
No body required
Response: Updated user, status=Active, is_active=true

### PATCH /api/volunteers/:id/decline
Access: ADMIN
No body required
Response: Updated user, status=Declined, is_active=false

---

## User Routes

### GET /api/users
Access: ADMIN
Query: ?status=Pending (optional filter)
Response: All users with role_name, branch_name

### GET /api/users/:id
Access: ADMIN
Response: Single user

### POST /api/users
Access: ADMIN
Body: { first_name, last_name, email, password, role_id, branch_id? }
Note: role_id restricted to [1,2] (Admin or PRC Staff only)

### PATCH /api/users/:id
Access: ADMIN
Body: any user fields to update

### DELETE /api/users/:id
Access: ADMIN

---

## Branch Routes

### GET /api/branches
Access: PUBLIC
Response: All branches (cached 300s browser)

### GET /api/branches/:id
Access: PUBLIC

### POST /api/branches
Access: ADMIN
Body: { branch_name, location }

### PATCH /api/branches/:id
Access: ADMIN

### DELETE /api/branches/:id
Access: ADMIN

---

## Hospital Routes

### GET /api/hospitals
Access: PUBLIC
Response: All 71 hospitals (cached 300s browser)

### GET /api/hospitals/:id
Access: PUBLIC

### POST /api/hospitals
Access: ADMIN

### PATCH /api/hospitals/:id
Access: ADMIN

### DELETE /api/hospitals/:id
Access: ADMIN

---

## Donor Routes

### GET /api/donors
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/donors/:id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/donors/search?keyword=
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### POST /api/donors
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Body: { first_name, last_name, birthdate, sex, blood_type?, contact?, national_id_type?, national_id_number?, address fields... }
Note: If national_id matches existing donor → returns existing record with 200

### PATCH /api/donors/:id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### DELETE /api/donors/:id
Access: ADMIN

---

## Donor Interview Routes

### GET /api/donor-interviews
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/donor-interviews/:id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/donor-interviews/donor/:donor_id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### POST /api/donor-interviews
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Body: { donor_id, branch_id }
Note: conducted_by auto-set from req.user.user_id

---

## Interview Answer Routes

### GET /api/interview-answers/interview/:interview_id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### POST /api/interview-answers
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Body: { interview_id, donor_id, answers: [{ question_id, answer }] }
Note: answer must be 'YES' or 'NO' (case insensitive)
Response: { answers_submitted, deferrals_created, interview_result, deferrals }

---

## Interview Question Routes

### GET /api/interview-questions
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/interview-questions/gender/:sex
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Note: sex must be 'Male' or 'Female'

### GET /api/interview-questions/:id
Access: ADMIN, STAFF

### PATCH /api/interview-questions/:id
Access: ADMIN

---

## Screening Routes

### GET /api/screenings
Access: ADMIN, STAFF

### GET /api/screenings/:id
Access: ADMIN, STAFF

### GET /api/screenings/donor/:donor_id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### POST /api/screenings
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Body: { interview_id, weight?, blood_pressure?, pulse_rate?, temperature?, hemoglobin, blood_type_confirmed?, hemoglobin_status?, screening_result, notes? }
Note: donor_id and branch_id auto-filled from interview record
Requires: interview_result must be 'Passed'

### PATCH /api/screenings/:id
Access: ADMIN, STAFF

---

## Deferral Routes

### GET /api/deferrals/donor/:donor_id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/deferrals/interview/:interview_id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST

### GET /api/deferrals/check/:donor_id
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Response: { is_deferred: boolean, data: deferral | null }

---

## Donation Routes

### GET /api/donations
Access: ADMIN, STAFF

### GET /api/donations/:id
Access: ADMIN, STAFF

### GET /api/donations/donor/:donor_id
Access: ADMIN, STAFF

### POST /api/donations
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Body: { screening_id, reaction_notes?, blood_volume_ml? }
Note: donor_id, branch_id auto-filled from screening record
Requires: screening_result=Eligible, hemoglobin within thresholds, no active deferral

### PATCH /api/donations/:id
Access: ADMIN, STAFF

---

## Blood Collection Routes

### GET /api/blood-collections
Access: ADMIN, STAFF

### GET /api/blood-collections/:id
Access: ADMIN, STAFF

### GET /api/blood-collections/branch/:branch_id
Access: ADMIN, STAFF

### POST /api/blood-collections
Access: ADMIN, STAFF, VOLUNTEER, PHLEBOTOMIST
Body: { donation_id, blood_type, component?, volume_ml?, barcode?, extraction_time_minutes?, notes? }
Note: donor_id, branch_id auto-filled from donation record
If extraction_time_minutes > 15 → is_qns=true automatically

### PATCH /api/blood-collections/:id/status
Access: ADMIN, STAFF
Body: { status, reason? }
Note: status=Safe blocked if is_qns=true
Status=Safe auto-creates blood_unit

---

## Blood Unit Routes

### GET /api/blood-units/availability
Access: ADMIN, STAFF, REQUESTOR
Response: Available/Not Available per branch/blood_type/component
Cached: 60 seconds (Upstash Redis)

### GET /api/blood-units/inventory
Access: ADMIN, STAFF
Response: Full counts per branch/blood_type/component

### GET /api/blood-units/branch/:branch_id
Access: ADMIN, STAFF

### GET /api/blood-units
Access: ADMIN, STAFF

### GET /api/blood-units/:id
Access: ADMIN, STAFF

### PATCH /api/blood-units/:id/status
Access: ADMIN, STAFF
Body: { status, reason? }
Note: reason required for Disposed and Withdrawn

---

## Blood Request Routes

### POST /api/blood-requests
Access: REQUESTOR
Body: { hospital_id, branch_id, patient_name, patient_age?, diagnosis?, urgency_level?, notes?, items: [{ blood_type, component, units_requested }] }
Supports file upload: request_form (multipart/form-data)

### GET /api/blood-requests/my-requests
Access: REQUESTOR
Response: All requests by current user

### GET /api/blood-requests
Access: ADMIN, STAFF

### GET /api/blood-requests/:id
Access: ADMIN, STAFF
Response: Full request with items, reservations, logs

### PATCH /api/blood-requests/:id/status
Access: ADMIN, STAFF
Body: { status, denial_reason? }
Note: denial_reason required when status=Rejected
Status transitions: Pending→Approved, Pending→Rejected, Approved→Released, Approved→Rejected