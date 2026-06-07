# BloodSync Domain Rules

## What Goes Here
Business rules that would exist regardless of framework, database, or interface.
These rules come from PRC blood bank medical standards and system policy.

---

## Donor Eligibility Rules

### Hemoglobin Thresholds
Source: PRC blood bank medical standards
Male:   Minimum 13.0 g/dL, Maximum 20.0 g/dL
Female: Minimum 12.5 g/dL, Maximum 20.0 g/dL
Enforced in: donationService.js (calling domain/donorEligibility.js — TO BE CREATED)
Location of constants: constants/medicalRules.js

### Same-Day Deferral Block
A donor deferred on any date cannot attempt interview again on that same calendar date.
Enforced in: interviewService.js via deferralModel.checkSameDayDeferral()
Reset: automatically — the rule only applies within the same calendar day

### Active Deferral Block
A donor with an active permanent deferral or a temporary deferral where deferral_until > NOW() cannot proceed to donation.
Enforced in: donationService.js via deferralModel.checkActiveDeferral()

### Re-application After Decline (Registration)
A volunteer/phlebotomist with status=Declined can re-register using the same email.
Old record (user + profile) is deleted atomically before new record created.
Enforced in: registrationService.js

---

## Blood Collection Flow Rules

### Extraction Time Limit
Maximum extraction duration: 15 minutes
Source: constants/medicalRules.js EXTRACTION.MAX_DURATION_MINUTES
If extraction_time_minutes > 15:
- is_qns automatically set to true
- qns_reason set to descriptive message
- Collection record still created for history
Enforced in: bloodCollectionService.createCollection()

### QNS Collection Cannot Be Marked Safe
A collection with is_qns = true cannot be marked as Safe.
Enforced in: bloodCollectionService.markAsSafe()

### Auto Blood Unit Creation
When blood_collection is marked Safe:
- blood_unit is automatically created in blood_units table
- blood_unit.status starts as Available
- Developer must NOT create blood_units manually
Enforced in: bloodCollectionService.markAsSafe()

---

## Blood Request Rules

### Status Transitions
Valid transitions:
- Pending → Approved (staff action)
- Pending → Rejected (staff action)
- Approved → Released (staff action)
- Approved → Rejected (staff action — frees reserved units back to Available)
Invalid transitions throw errors.
Enforced in: bloodRequestService.updateStatus()

### Auto-Assignment (FEFO)
When request is Approved:
- System assigns blood units with nearest expiration date first (First Expiry First Out)
- Only Available units are assigned
- Units must match blood_type, component, and branch_id of the request
- If insufficient units, entire approval fails with error
Enforced in: bloodRequestService.approveRequest()

### Race Condition Prevention
approveRequest uses SELECT FOR UPDATE within a BEGIN/COMMIT transaction.
Two simultaneous approvals cannot both succeed.
Enforced in: bloodRequestService.approveRequest()

### Request Items
One blood request can have multiple items (blood_type + component combinations).
Each item has units_requested and units_fulfilled tracked separately.

---

## Donor Interview Flow Rules

### Correct Medical Flow (Enforced)
Donor Registration
↓
Interview Session Created (donor_interviews)
↓
Interview Answers Submitted (donor_interview_answers)
↓ [auto-detects deferrals, sets interview_result]
Interview Result: Passed or Failed
↓ [only if Passed]
Screening Created (screening)
↓ [only if screening_result = Eligible]
Donation Created (donations — auto-fills from screening)
↓
Blood Collection (blood_collections)
↓ [only if not QNS]
Mark as Safe → Blood Unit Created (blood_units)

### Interview Must Pass Before Screening
Enforced in: screeningService.createScreening()
Error if interview_result !== 'Passed'

### Answers Cannot Be Submitted Twice
Enforced in: interviewService.submitAnswers()
Checks interview.interview_result — if already set, rejects

### Screening Belongs To One Interview
getScreeningByInterviewId() used to prevent duplicate screenings per interview.
Enforced in: screeningService.createScreening()

---

## Duplicate Donor Detection

### National ID Check
When registering a new donor, if national_id_type + national_id_number match an existing record:
- Return existing donor record with message
- Do NOT create duplicate
- Frontend redirects volunteer to existing donor record
Enforced in: donorController.createDonor() (will move to donorService.js)

---

## Auto-Fill Rules (Backend Responsibility)

### Screening Creation
Frontend sends: interview_id + physical measurements
Backend auto-fills: donor_id, branch_id (from interview record)

### Donation Creation
Frontend sends: screening_id + optional reaction_notes, blood_volume_ml
Backend auto-fills: donor_id, branch_id (from screening record)

### Blood Collection Creation
Frontend sends: donation_id + blood_type, component, barcode, etc.
Backend auto-fills: donor_id, branch_id (from donation record)

---

## Registration Rules

### Requestor
- Self-register via POST /api/requestors/register
- Immediately Active — no approval needed
- role_id = 4

### Volunteer
- Self-register via POST /api/volunteers/register
- Status starts as Pending, is_active = false
- Admin must approve before they can log in
- role_id = 5

### Phlebotomist
- Self-register via POST /api/phlebotomists/register
- Same flow as Volunteer
- role_id = 6

### Admin / PRC Staff
- Admin-created only via POST /api/users
- role_id restricted to [1, 2] by userValidator

---

## Account Lock Rules

### Staff/Volunteer/Phlebotomist Login
No account lockout — uses application-level rate limiting (Upstash: 5 requests/15min per IP)

### Requestor Login
5 failed password attempts → account locked for 15 minutes
locked_until stored in users table
On successful login: login_attempts reset to 0, locked_until set to NULL

---

## Visibility Rules

### Blood Unit Availability (Requestors)
Requestors see only Available / Not Available
Never show exact counts to requestors
Frontend responsibility to display Available vs Not Available text
Backend returns count data, frontend filters display

### Blood Unit Inventory (Staff)
Full count data visible to Admin and PRC Staff only