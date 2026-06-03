# BloodSync Session State

## Current Objective
Build Phase 4 — Blood Request Flow
(requestors, blood_requests, request_items, request_status_logs, reservations)

## Current Progress

### Completed Phases
Phase 1 — Foundation ✅
✅ roles table + MVC
✅ branches table + MVC
✅ hospitals table + MVC (71 hospitals seeded)
✅ users table + MVC
✅ Auth system (login/logout with JWT)
Phase 2 — Donor + Screening ✅
✅ donors table + MVC
✅ donor_interview_questions table (34 questions seeded)
✅ screening table + MVC
✅ donor_interview_answers table + MVC
✅ donor_deferrals table + MVC
Phase 3 — Blood Collection ✅
✅ component_expiry_days table (4 components seeded)
✅ donations table + MVC
✅ blood_collections table + MVC
✅ blood_units table + MVC
Architecture Cleanup ✅
✅ responseHelper.js created
✅ dateHelper.js created
✅ constants/bloodTypes.js created
✅ constants/statuses.js created
✅ validators/ folder with 4 validator files
✅ services/ folder with 4 service files
✅ All 13 controllers refactored

### Phase 4 — Blood Request (CURRENT — NOT STARTED)
⬜ requestors table + MVC
⬜ blood_requests table + MVC
⬜ request_items table + MVC
⬜ request_status_logs table + MVC
⬜ reservations table + MVC
⬜ bloodRequestService.js

## Confirmed Design Decisions For Phase 4

### Requestors
- Requestors register and login themselves (not staff-created)
- hospital_id = hospital where patient needs blood
- Request form/document upload required when submitting
- Requestors have their own login separate from staff
- requestors table needs its own auth (separate from users table)

### Blood Requests
- One request can have MULTIPLE blood types and components
  (NEW feature — old PHP system only allowed one)
- request_items table handles multiple items per request
- Hospital document upload required

### Reservations / Auto Assignment
- System AUTO-assigns nearest expiry blood unit
- Must NOT assign already Reserved units
- Assignment happens when staff confirms request
- This logic goes in bloodRequestService.js

### Request Status Flow
Pending → Approved → Released
→ Rejected

### request_status_logs
- Every status change logged with who changed it
- Audit trail for accountability

## Current Blockers
- None — ready to start Phase 4

## Next Recommended Steps

### Step 1 — Design and confirm tables
Present proposed schemas for:
- requestors
- blood_requests
- request_items
- request_status_logs
- reservations

### Step 2 — Create tables in Neon in this order
1. requestors
2. blood_requests
3. request_items
4. request_status_logs
5. reservations

### Step 3 — Build MVC + Service
- requestorModel, Controller, Routes
- bloodRequestModel, Controller, Routes
- requestItemModel (may be part of bloodRequest)
- requestStatusLogModel (may be part of bloodRequest)
- reservationModel (may be part of bloodRequest)
- bloodRequestService.js (auto-assign logic)
- Add validator: bloodRequestValidator.js

### Step 4 — Test in Postman
Full flow:
1. Requestor registers
2. Requestor logs in (gets token)
3. Requestor views blood availability
4. Requestor submits blood request with items
5. Staff approves request
6. System auto-assigns nearest expiry unit
7. Blood unit status → Released

## Current Working Files
All files in backend/ folder on local machine
Pushed to GitHub after each phase

## Server Configuration
- Local: http://localhost:3000
- Environment: .env file with DATABASE_URL and JWT_SECRET
- Run command: npm run dev (nodemon)

## API Base URL
- Local: http://localhost:3000/api
- Production: Railway (not yet deployed)

## Current Installed Packages
```json
{
  "bcrypt": "installed",
  "dotenv": "installed",
  "express": "installed",
  "express-rate-limit": "installed",
  "helmet": "installed",
  "hpp": "installed",
  "jsonwebtoken": "installed",
  "morgan": "installed",
  "nodemailer": "installed",
  "nodemon": "installed (dev)",
  "pg": "installed",
  "validator": "installed",
  "xss": "installed"
}
```

## Known Issues
- db.js uses SSL rejectUnauthorized: false
  (acceptable for development, review for production)
- Connection terminated unexpectedly error fixed
  by adding pool.on('error') handler and process event handlers

## Postman Setup
- Environment: BloodSync Local
- Variable: TOKEN = current JWT token
- All protected routes use: Authorization: Bearer {{TOKEN}}

## CONTEXT CRITICAL FOR FUTURE CHATS

### Project Location
- Project folder: CAPSTONE_2/bloodsync/backend
- Node version: v24.11.1
- OS: Windows

### Database Connection
- Provider: Neon PostgreSQL
- SSL required: yes (rejectUnauthorized: false)
- Connection via: DATABASE_URL in .env

### Auth System Has Two Parts
1. users table — for staff (admin, prc staff, volunteer, phlebotomist)
2. requestors table — for requestors (separate auth, separate login endpoint)
   IMPORTANT: requestors are NOT in the users table
   They have their own separate table and login endpoint

### Blood Unit Two-Stage Flow (Critical)
blood_collections = TEMPORARY holding (pending testing)
status: Pending → Safe or Rejected
NOT visible to requestors
blood_units = MAIN inventory (safe blood only)
auto-created when blood_collection marked Safe
status: Available → Reserved → Released
VISIBLE to requestors (Available/Not Available only)

### Auto Blood Unit Creation
When staff marks blood_collection as Safe:
→ bloodCollectionService.markAsSafe() is called
→ This AUTOMATICALLY creates a blood_unit record
→ blood_unit status starts as Available
Developer must NOT create blood_units manually

### Interview Answer Auto-Deferral
When interview answers submitted:
→ interviewService.submitAnswers() is called
→ Service automatically checks each answer against defer_if
→ If match found → deferral record auto-created
→ If any deferral → screening_result updated to Deferred
Developer must NOT manually create deferrals when submitting answers

### Expiry Date Calculation
- Stored in component_expiry_days table
- Calculated in bloodCollectionService using dateHelper.calculateExpiryDate()
- Applied to blood_collections AND blood_units at creation time

### Role Access Summary
GET branches/hospitals → PUBLIC (no token needed)
GET blood-units/availability → Admin, Staff, Requestor
GET blood-units/inventory → Admin, Staff only
POST donations → Admin, Staff, Volunteer, Phlebotomist
POST blood-collections → Admin, Staff, Volunteer, Phlebotomist
PATCH blood-collections/status → Admin, Staff only
DELETE anything → Admin only

## THINGS THAT LOOK WRONG BUT ARE INTENTIONAL

### 1. No unique_code on donors table
Removed intentionally. donor_id serves as unique identifier.
If display code needed, format in frontend: "PRC-" + donor_id.

### 2. No Cryoprecipitate in component_expiry_days
Developer removed it intentionally. Do not add it back.

### 3. requestors is a separate table from users
Intentional design. Requestors have different auth flow.
Do not merge into users table.

### 4. blood_collections and blood_units are separate tables
Intentional two-stage flow. Not redundant.
blood_collections = temporary, blood_units = permanent inventory.

### 5. No separate blood_types table
Intentional. Only 8 blood types, validated via constants/bloodTypes.js.
Over-normalization avoided.

### 6. Donation controller has no screening check
Moved to donationService.js intentionally.
Controller is clean, service handles the business logic.

### 7. interview answers have no auto-deferral in controller
Moved to interviewService.js intentionally.
Controller is clean, service handles deferral logic.

### 8. Custom XSS middleware instead of app.use(xss())
xss-clean package is deprecated.
Using xss package with custom middleware loop instead.

### 9. blood_collections status check not in controller
Status transition prevention (cannot update already-processed)
was removed from controller and moved to service layer.

### 10. No total_donations column on donors
Intentional. Computed from donations table via query when needed.
Never stored as a column.

### 11. No last_donation_date column on donors
Intentional. Queried from donations table when needed.
Never stored as a column.

### 12. Services only for 4 features
Only screening, interview, blood collection, and donation have services.
Other features are simple CRUD and call models directly from controllers.
This is intentional — not an oversight.

### 13. Requestor sees only Available/Not Available
Never show exact count to requestors.
Frontend responsibility to display Available vs Not Available.
Backend returns full count data but frontend filters display.