# BloodSync Architecture

## Pattern
Full Layered Architecture with Domain layer.
(Converted from MVC+Service — conversion complete as of this session)

## Request Flow
Client Request
↓
Route (endpoint definition + middleware chain)
↓
authMiddleware (verifyToken — JWT verification)
↓
roleMiddleware (checkRole — role_id from JWT)
↓
bloodDriveMiddleware (requireBloodDrive — field role gate, optional)
↓
Controller (4 steps ONLY: extract → validate → call service → return response)
↓
Validator (technical input validation — format, required, type)
↓
Service (orchestration — calls domain + repositories + email/socket)
↓
Domain (pure business rules — no DB, no framework, no HTTP)
↓
Repository/Model (SQL queries ONLY)
↓
Database (Neon PostgreSQL)

## Complete Folder Structure
backend/
├── instrument.js                    ← GlitchTip init — MUST be first require in server.js
├── server.js                        ← Entry point, HTTP server, Socket.io init, scheduler start
├── config/
│   ├── db.js                        ← PostgreSQL pool
│   ├── cloudinary.js                ← Cloudinary SDK config
│   └── redis.js                     ← Upstash Redis client
├── constants/
│   ├── roles.js                     ← ROLES object (1=Admin...6=Phlebotomist)
│   ├── bloodTypes.js                ← Valid blood type array
│   ├── statuses.js                  ← All valid status arrays + NOTIFICATION_TYPES (pending)
│   ├── medicalRules.js              ← HEMOGLOBIN thresholds, EXTRACTION max duration
│   └── inventoryRules.js            ← LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS (pending)
├── middleware/
│   ├── authMiddleware.js            ← JWT verification → req.user
│   ├── roleMiddleware.js            ← Role-based access control
│   ├── uploadMiddleware.js          ← Multer memory storage
│   ├── bloodDriveMiddleware.js      ← Blood drive assignment gate → req.drive_id
│   └── upstashRateLimiter.js        ← Upstash sliding window rate limiter
├── utils/
│   ├── responseHelper.js            ← Standardized responses + handleError()
│   ├── dateHelper.js                ← Date calculation utilities
│   ├── uploadHelper.js              ← Cloudinary upload/delete
│   └── businessError.js            ← Custom error class (statusCode aware)
├── validators/
│   ├── userValidator.js
│   ├── donorValidator.js            ← email NOW REQUIRED (changed this session)
│   ├── registrationValidator.js     ← validateRequestorRegistration + validateRegistration
│   ├── donorInterviewValidator.js
│   ├── screeningValidator.js
│   ├── bloodCollectionValidator.js
│   ├── bloodRequestValidator.js
│   ├── bloodDriveValidator.js       ← drive + participant validation only
│   ├── bloodUnitValidator.js
│   ├── interviewAnswerValidator.js  ← object method style (intentional)
│   ├── interviewQuestionValidator.js
│   ├── branchValidator.js
│   ├── hospitalValidator.js
│   └── volunteerProfileValidator.js ← identity fields locked server-side
└── app/
    ├── cache/
    │   └── cacheService.js          ← cache(), getCache(), setCache(), invalidateCache()
    ├── domain/
    │   ├── donorEligibility.js      ← checkHemoglobinEligibility()
    │   ├── donationRules.js         ← evaluateExtractionTime(), assertNotQns()
    │   ├── bloodRequestRules.js     ← assertValidTransition()
    │   ├── bloodUnitRules.js        ← assertNotTerminal(), assertReasonProvided()
    │   ├── bloodDriveRules.js       ← computeDriveStatus(), getNowPHT(), assertNotTerminal()
    │   │                               assertCancellable(), assertValidDateRange(),
    │   │                               assertStartNotInPast(), isDriveActiveNow()
    │   └── inventoryRules.js        ← isLowStock(), isNearExpiry() [PENDING]
    ├── email/                        ← [PENDING — new folder this session]
    │   ├── emailService.js          ← nodemailer send wrapper only
    │   └── emailTemplates.js        ← HTML string builders only
    ├── scheduler/                    ← [PENDING]
    │   └── inventoryScheduler.js    ← node-cron daily job, calls inventoryCheckService
    ├── socket/                       ← [PENDING]
    │   └── socketHandler.js         ← Socket.io init, room management, emitToRoom(), getIO()
    ├── repositories/                 ← renamed from models/ — SQL queries ONLY
    │   ├── roleModel.js
    │   ├── branchModel.js
    │   ├── hospitalModel.js
    │   ├── userModel.js
    │   ├── profileModel.js          ← volunteer_profiles (volunteers + phlebotomists)
    │   ├── donorModel.js
    │   ├── donorInterviewModel.js   ← includes drive_id in all queries
    │   ├── interviewQuestionModel.js
    │   ├── interviewAnswerModel.js
    │   ├── deferralModel.js
    │   ├── screeningModel.js
    │   ├── donationModel.js
    │   ├── bloodCollectionModel.js
    │   ├── bloodUnitModel.js
    │   ├── bloodRequestModel.js
    │   ├── bloodDriveModel.js       ← includes getActiveDriveForUser() for middleware
    │   ├── staffModel.js            ← getStaffByBranch(), getAllAdmins() [PENDING]
    │   └── notificationModel.js     ← notifications table CRUD [PENDING]
    ├── services/
    │   ├── authService.js
    │   ├── userService.js
    │   ├── donorService.js
    │   ├── registrationService.js
    │   ├── bloodUnitService.js
    │   ├── interviewService.js
    │   ├── fulfillmentService.js    ← read-only fulfillment planning, distance sorting, wait time estimates; no mutations
    │   ├── screeningService.js      ← cross-drive check added
    │   ├── donationService.js       ← cross-drive check + donor email check added
    │   ├── bloodCollectionService.js ← cross-drive check added
    │   ├── bloodRequestService.js   ← will call notificationService after createRequest, lifecycle only (create, approve, release, reject, cancel); imports fulfillmentService
    │   ├── bloodDriveService.js     ← will call notificationService in addParticipant
    │   ├── notificationService.js   ← orchestrates DB + email + socket [PENDING]
    │   └── inventoryCheckService.js ← runDailyCheck() [PENDING]
    ├── controllers/
    │   ├── authController.js
    │   ├── userController.js
    │   ├── registrationController.js
    │   ├── donorController.js
    │   ├── donorInterviewController.js ← passes req.drive_id to model
    │   ├── bloodUnitController.js
    │   ├── branchController.js
    │   ├── hospitalController.js
    │   ├── interviewQuestionController.js
    │   ├── interviewAnswerController.js
    │   ├── deferralController.js
    │   ├── screeningController.js   ← passes req.user + req.drive_id to service
    │   ├── donationController.js    ← passes req.user + req.drive_id to service
    │   ├── bloodCollectionController.js ← passes req.user + req.drive_id to service
    │   ├── bloodRequestController.js
    │   ├── bloodDriveController.js
    │   ├── roleController.js
    │   ├── volunteerProfileController.js
    │   └── notificationController.js ← [PENDING]
    └── routes/
        ├── authRoutes.js
        ├── userRoutes.js
        ├── registrationRoutes.js    ← registration + admin approval only
        ├── volunteerProfileRoutes.js ← GET/PATCH /api/volunteers/me/profile
        ├── donorRoutes.js           ← requireBloodDrive on POST
        ├── donorInterviewRoutes.js  ← requireBloodDrive on POST
        ├── interviewAnswerRoutes.js ← requireBloodDrive on POST
        ├── screeningRoutes.js       ← requireBloodDrive on POST
        ├── donationRoutes.js        ← requireBloodDrive on POST
        ├── bloodCollectionRoutes.js ← requireBloodDrive on POST
        ├── bloodUnitRoutes.js
        ├── bloodRequestRoutes.js
        ├── bloodDriveRoutes.js
        ├── deferralRoutes.js
        ├── interviewQuestionRoutes.js
        ├── branchRoutes.js
        ├── hospitalRoutes.js
        ├── roleRoutes.js
        └── notificationRoutes.js    ← [PENDING]

## Layer Responsibilities

### Route
- Purpose: Endpoint definition + middleware chain only
- Responsibilities: Define URL, attach verifyToken + checkRole + requireBloodDrive, call controller
- Should NOT: Contain any logic, validation, or business rules
- Dependencies: authMiddleware, roleMiddleware, bloodDriveMiddleware, controller

### Middleware
- Purpose: Cross-cutting request concerns
- Responsibilities: Token verification, role checking, file upload, drive access gating
- Should NOT: Contain business logic or DB queries beyond what's needed for the gate
- Note: bloodDriveMiddleware sets req.drive_id — downstream services use this

### Controller
- Purpose: HTTP request/response boundary — exactly 4 steps
- Steps: 1. Extract request data, 2. Call validator, 3. Call service, 4. Return response
- Should NOT: Contain bcrypt, jwt, business logic, direct DB queries
- Error handling: always use response.handleError(res, error)

### Validator
- Purpose: Technical input validation only
- Responsibilities: Required fields, format, type, allowed values
- Should NOT: Contain business rules, DB queries, or domain logic
- Note: interviewAnswerValidator uses object method style — intentional, do not change

### Service
- Purpose: Business orchestration
- Responsibilities: Calls domain for rules, calls repositories for data, coordinates workflow
- Should NOT: Contain SQL, res/req objects, direct nodemailer or socket calls
- Throws: BusinessError for known violations, plain Error for unexpected failures

### Domain
- Purpose: Pure business rules
- Responsibilities: Takes plain data, returns result or throws Error
- Should NOT: require() any framework, DB pool, or HTTP module
- Testable: without Express or PostgreSQL

### Repository (app/repositories/ — files named *Model.js)
- Purpose: Database queries only
- Responsibilities: SQL queries, parameter binding, return raw rows
- Should NOT: Contain business logic, validation, or error classification
- Note: Folder is repositories/ but files are *Model.js — intentional, do not rename files

### Email (app/email/)
- emailService.js: nodemailer config + sendEmail() only
- emailTemplates.js: HTML string builders only — no sending, no DB

### Socket (app/socket/)
- socketHandler.js: Socket.io setup + room management + emitToRoom() + getIO()
- Should NOT: Contain business logic or DB queries

### Scheduler (app/scheduler/)
- inventoryScheduler.js: node-cron registration only — calls inventoryCheckService
- Should NOT: Contain inventory logic

## Business Rules

### Technical Validation (validators/)
- Required fields, email format, phone format (7-15 digits numbers only)
- Blood type must be in VALID_BLOOD_TYPES
- Component must be in VALID_COMPONENTS
- Dates: valid format, not in future (for birthdates)
- Volunteer profile: first_name, last_name, birthdate, sex are LOCKED — rejected if sent

### Business Validation (domain/ + services/)
- Hemoglobin: Male min 13.0, Female min 12.5, both max 20.0 g/dL
- Extraction time > 15 min → is_qns = true (collection still created for history)
- QNS collection cannot be marked Safe
- Interview must Pass before screening
- Screening must be Eligible before donation
- Donor email required at donation time (donor must have email on record)
- Active deferral blocks donation
- Same-day deferral blocks re-attempt
- Blood request transitions: Pending→Approved, Pending→Rejected, Approved→Released, Approved→Rejected
- Blood unit terminal states: Released, Disposed, Withdrawn — no further updates
- Blood drive: Volunteers/Phlebotomists blocked outside active time window (PHT)
- Blood drive: cross-drive isolation — field roles can only act on records from their assigned drive
- PRC Staff branch restriction: can only create/manage drives for own branch
- Blood drive terminal states: Ended, Cancelled — no updates, no participant changes
- FEFO: nearest expiry blood units assigned first on request approval
- Race condition: SELECT FOR UPDATE on blood request approval

## Database Summary

### Key Tables
- users — ALL user types (Admin, PRC Staff, Requestor, Volunteer, Phlebotomist)
- volunteer_profiles — profile data for role_id 5 and 6 only
- donors — separate from users, not login-capable
- donor_interviews — drive_id FK added
- donor_interview_answers — references interview_id (NOT screening_id)
- donor_deferrals — references interview_id (NOT screening_id)
- screening — references interview_id, drive_id FK added
- donations — drive_id FK added
- blood_collections — temporary holding, drive_id FK added
- blood_units — main inventory, auto-created when collection marked Safe, drive_id FK added
- blood_requests — user_id references users (requestors are role_id=4)
- request_items — line items per blood request
- reservations — blood units reserved against a request
- request_status_logs — audit trail for request status changes
- blood_drives — NEW: name, branch_id, start_datetime, end_datetime (TIMESTAMPTZ), status
- blood_drive_participants — NEW: drive_id, user_id, assigned_by, assignment_status
- component_expiry_days — Whole Blood(35), PRBC(35), FFP(365), Platelets(5) — NO cryoprecipitate
- notifications — NEW (pending): user_id, type, title, message, reference_id, reference_type, is_read

### Critical FK Notes
- donor_interview_answers.interview_id → donor_interviews (NOT screening)
- donor_deferrals.interview_id → donor_interviews (NOT screening)
- request_status_logs.changed_by_id → no FK constraint (intentional — type field disambiguates)
- blood_drives uses TIMESTAMPTZ for timezone-safe PHT comparisons

### drive_id propagation chain
donor_interviews → screening → donations → blood_collections → blood_units
Set once at interview, auto-filled downstream. NULL = walk-in (Admin/Staff outside drive).

## Authentication
- JWT, 8h expiry
- Payload: { user_id, email, role_id, branch_id }
- No separate requestor token — unified users table
- req.user set by authMiddleware
- req.drive_id set by bloodDriveMiddleware (null for Admin/Staff)

## Important Decisions

### Accepted
- Requestors merged into users table (role_id=4) — eliminates dual auth flow
- Folder named repositories/ but files named *Model.js — folder renamed, files kept as-is
- Lazy status resolution for blood drives — status stored, corrected on read via computeDriveStatus()
- BusinessError class — services throw typed errors, controllers use handleError()
- cross-drive isolation in services not middleware — business rule belongs in service layer
- Volunteer profile identity fields locked in validator (not just frontend)
- app/email/ folder — emailService and emailTemplates together, not in utils/

### Rejected
- Separate requestors table — caused dual token structures
- cryoprecipitate in component_expiry_days — removed intentionally
- RLS on Neon — PgBouncer transaction mode breaks SET session variables
- app/middleware/ subfolder — does not exist, middleware is at backend/middleware/
- notificationRules.js name for both domain and constants — renamed to inventoryRules.js

## Things That Look Wrong But Are Intentional
1. app/repositories/ files named *Model.js — folder renamed, not files
2. profileModel.js covers both volunteers AND phlebotomists — shared table
3. No separate requestors table — merged into users
4. No unique_code on donors — donor_id serves as identifier
5. No cryoprecipitate in component_expiry_days
6. No total_donations column on donors — computed from donations table
7. interviewAnswerValidator uses object method style — do not change
8. changed_by_id in request_status_logs has no FK — intentional
9. donor_id and branch_id not sent by frontend for donations — auto-filled
10. interview_id in answers and deferrals (NOT screening_id) — architectural fix
11. drive_id NULL on records = walk-in operation — intentional, not a bug
12. bloodDriveMiddleware sets req.drive_id = null for Admin/Staff — intentional
13. confirmParticipation returns HTML not JSON — browser-facing endpoint, not API
14. GET /confirm has no auth middleware — confirmation token IS the authentication
15. inventoryCheckService uses pool directly — cross-branch aggregate query has
    no single repository owner; known exception to the no-SQL-in-services rule
16. refresh token stored as plaintext in DB but access token stored as JWT —
    refresh token is random bytes (not JWT), hashed before storage; access token
    is short-lived JWT verified by signature, not DB lookup
17. fulfillmentService exports getDistanceKm() — pure math helper exported
    intentionally so callers can use it without reimplementing Haversine


# ARCHITECTURE.MD — Updated Sections Only
# Replace the corresponding sections in your existing ARCHITECTURE.MD file.
# Everything not listed here stays unchanged.

---

## REPLACE: folder structure entries for domain and constants (lines ~41-44)
Old:
│   ├── inventoryRules.js            ← LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS (pending)

New:
│   ├── inventoryRulesConstant.js    ← LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS

Old:
│   └── inventoryRules.js        ← isLowStock(), isNearExpiry() [PENDING]

New:
│   └── inventoryRulesDomain.js  ← isLowStock(), isNearExpiry()

---

## REPLACE: email, socket, scheduler folder lines (remove [PENDING] tags)
Old:
    ├── email/                        ← [PENDING — new folder this session]
    │   ├── emailService.js          ← nodemailer send wrapper only
    │   └── emailTemplates.js        ← HTML string builders only
    ├── scheduler/                    ← [PENDING]
    │   └── inventoryScheduler.js    ← node-cron daily job, calls inventoryCheckService
    ├── socket/                       ← [PENDING]
    │   └── socketHandler.js         ← Socket.io init, room management, emitToRoom(), getIO()

New:
    ├── email/
    │   ├── emailService.js          ← nodemailer send wrapper only
    │   └── emailTemplates.js        ← HTML string builders only (includes confirm/decline buttons)
    ├── scheduler/
    │   └── inventoryScheduler.js    ← node-cron daily job, calls inventoryCheckService
    ├── socket/
    │   └── socketHandler.js         ← Socket.io init, room management, emitToRoom(), getIO()

---

## REPLACE: repositories section (remove [PENDING] tags, update bloodDriveModel note)
Old:
    │   ├── staffModel.js            ← getStaffByBranch(), getAllAdmins() [PENDING]
    │   └── notificationModel.js     ← notifications table CRUD [PENDING]

New:
    │   ├── staffModel.js            ← getStaffByBranch(), getAllAdmins()
    │   └── notificationModel.js     ← notifications table CRUD

---

## REPLACE: services section (remove [PENDING] tags, update hookup notes)
Old:
    │   ├── bloodRequestService.js   ← will call notificationService after createRequest
    │   ├── bloodDriveService.js     ← will call notificationService in addParticipant
    │   ├── notificationService.js   ← orchestrates DB + email + socket [PENDING]
    │   └── inventoryCheckService.js ← runDailyCheck() [PENDING]

New:
    │   ├── bloodRequestService.js   ← calls notifyNewBloodRequest() after createRequest
    │   ├── bloodDriveService.js     ← calls notifyBloodDriveAssigned() after addParticipant
    │   │                               confirmParticipation() — token validation + status update
    │   ├── notificationService.js   ← orchestrates DB + email + socket
    │   └── inventoryCheckService.js ← runDailyCheck()

---

## REPLACE: controllers section (add notificationController)
Old:
    │   └── notificationController.js ← [PENDING]

New:
    │   └── notificationController.js ← getMyNotifications, getUnreadCount, markAsRead, markAllAsRead

---

## REPLACE: routes section (add notificationRoutes, update bloodDriveRoutes)
Old:
    │   └── notificationRoutes.js    ← [PENDING]

New:
    │   └── notificationRoutes.js    ← /api/notifications endpoints

Add note to bloodDriveRoutes line:
    │   ├── bloodDriveRoutes.js      ← GET /confirm public route registered BEFORE /:id

---

## REPLACE: Database Summary → Key Tables section
Old:
- blood_drive_participants — NEW: drive_id, user_id, assigned_by, assignment_status
- component_expiry_days — Whole Blood(35), PRBC(35), FFP(365), Platelets(5) — NO cryoprecipitate
- notifications — NEW (pending): user_id, type, title, message, reference_id, reference_type, is_read

New:
- blood_drive_participants — drive_id, user_id, assigned_by, assignment_status,
                             confirmation_token (single-use, cleared after use)
- component_expiry_days — Whole Blood(35), PRBC(35), FFP(365), Platelets(5) — NO cryoprecipitate
- notifications — user_id, type, title, message, reference_id, reference_type, is_read
- refresh_tokens — user_id, token_hash (SHA-256), expires_at — refresh token storage

---

## REPLACE: Authentication section
Old:
## Authentication
- JWT, 8h expiry
- Payload: { user_id, email, role_id, branch_id }
- No separate requestor token — unified users table
- req.user set by authMiddleware
- req.drive_id set by bloodDriveMiddleware (null for Admin/Staff)

New:
## Authentication
- JWT access token, 15min expiry, delivered via httpOnly cookie
- Refresh token, 7 days expiry, delivered via httpOnly cookie, stored hashed in DB
- Token rotation on every refresh — old token deleted, new one issued
- Logout deletes refresh token from DB immediately — no grace period
- Payload: { user_id, email, role_id, branch_id }
- No separate requestor token — unified users table
- req.user set by authMiddleware (reads req.cookies.access_token)
- req.drive_id set by bloodDriveMiddleware (null for Admin/Staff)
- Separate JWT_SECRET and JWT_REFRESH_SECRET in .env

---

## REPLACE: Important Decisions → Accepted section (add new entries)
Add to Accepted:
- httpOnly cookies for tokens — XSS-immune token delivery
- Refresh token rotation — stolen tokens invalidated after single use
- Tokenized email confirmation for blood drive assignments — single-use,
  no login required, token cleared after use
- inventoryRules split into inventoryRulesConstant.js + inventoryRulesDomain.js
  — avoids two files with identical names in different folders

---

REMINDER: THESE ARE MORE LATEST
Add to the folder structure under services/:
│   ├── fulfillmentService.js    ← read-only fulfillment planning, distance sorting,
│   │                               wait time estimates; no mutations
Update bloodRequestService.js line:
│   ├── bloodRequestService.js   ← lifecycle only (create, approve, release,
│   │                               reject, cancel); imports fulfillmentService
Add to "Things That Look Wrong But Are Intentional":
17. fulfillmentService exports getDistanceKm() — pure math helper exported
    intentionally so callers can use it without reimplementing Haversine
Add to "Important Decisions → Accepted":
- bloodRequestService split into bloodRequestService + fulfillmentService —
  lifecycle mutations and read-only planning are different concerns;
  fulfillmentService has no side effects and is easier to test in isolation
- validateItems exported from bloodRequestValidator — services use it directly
  as a BusinessError thrower; single definition of item validation rules
- Inventory cache added (cache:blood-units:inventory, 60s TTL) — invalidated
  alongside availability cache on all unit mutations
- Cache keys defined as constants in service files — prevents key drift between
  write (invalidation) and read (route middleware) sides




  ### UPDATES

  # Patch for ARCHITECTURE.MD
# Apply to your actual ARCHITECTURE.MD.

## ADD to folder structure — validators/ section

OLD:
validators/
├── userValidator.js
├── donorValidator.js            ← email NOW REQUIRED (changed this session)
├── registrationValidator.js     ← validateRequestorRegistration + validateRegistration
├── donorInterviewValidator.js
├── screeningValidator.js
├── bloodCollectionValidator.js
├── bloodRequestValidator.js
├── bloodDriveValidator.js       ← drive + participant validation only
├── bloodUnitValidator.js
├── interviewAnswerValidator.js  ← object method style (intentional)
├── interviewQuestionValidator.js
├── branchValidator.js
├── hospitalValidator.js
└── volunteerProfileValidator.js ← identity fields locked server-side

NEW:
validators/
├── authValidator.js             ← NEW — validateChangePassword() only
├── userValidator.js
├── donorValidator.js            ← email NOW REQUIRED (changed this session)
├── registrationValidator.js     ← validateRequestorRegistration + validateRegistration
├── donorInterviewValidator.js
├── screeningValidator.js
├── bloodCollectionValidator.js
├── bloodRequestValidator.js
├── bloodDriveValidator.js       ← drive + participant validation only
├── bloodUnitValidator.js
├── interviewAnswerValidator.js  ← object method style (intentional)
├── interviewQuestionValidator.js
├── branchValidator.js
├── hospitalValidator.js
└── volunteerProfileValidator.js ← identity fields locked server-side

## ADD to "Database Summary → Key Tables" section

ADD this line alongside the existing volunteer_profiles entry:
- staff_profiles — Admin (role_id 1) + PRC Staff (role_id 2) profile data,
  parallel to volunteer_profiles but for the other role group. Currently
  minimal: user_id (UNIQUE FK → users, ON DELETE CASCADE), profile_img.
  Extend with more columns later the same way volunteer_profiles would be
  extended (add a column, not a new table) if Admin/Staff profile needs grow.

## ADD to "Critical FK Notes" section
- staff_profiles.user_id has a UNIQUE constraint (enforces true 1:1 with
  users) — note that volunteer_profiles.user_id does NOT currently have
  this constraint despite being conceptually 1:1 as well. This is a
  pre-existing gap in volunteer_profiles, not something this session
  introduced or fixed. staff_profiles was given the constraint from the
  start since there was no reason to repeat the gap in a new table.

## ADD to "Important Decisions → Accepted" section
- staff_profiles as a separate table (not a profile_img column directly on
  users) — keeps Admin/Staff and Volunteer/Phlebotomist profile data
  symmetric: both role groups get their own profile table rather than one
  group using a users column and the other using a separate table. Avoids
  conditional "which table has the photo" logic in any future code that
  needs to fetch a user's profile photo regardless of role.
- Password change endpoint lives under /api/auth (authService/
  authController/authRoutes), not /api/users — password verification and
  hashing logic is role-independent, so it is shared by every authenticated
  role rather than duplicated per role-specific controller. /api/users
  remains exclusively for Admin's management of OTHER users' accounts.

## ADD to "Things That Look Wrong But Are Intentional" — append as item 18
18. PATCH /api/auth/me/password has no checkRole middleware — intentional,
    not an oversight. Every authenticated role (Admin, PRC Staff, Volunteer,
    Phlebotomist, Requestor) can change their own password; verifyToken
    alone is the correct and sufficient guard, since the rule is "any
    logged-in user can change their own password," not "only some roles can."



### CURRENT UPDATE
here's what changed.
PATCH /api/donors/:id stays exactly as documented — Admin + PRC Staff only, full donor fields, unchanged. Don't add Volunteer/Phlebotomist to this one.
New endpoint added: PATCH /api/donors/:id/contact — Volunteer + Phlebotomist only.
Request body — only these two fields are accepted, nothing else:
json{ "email": "new@email.com", "contact": "09171234567" }
At least one of the two is required; either can be omitted if you're only updating the other. contact must be digits only, 7–15 characters — same rule as everywhere else. Sending any other field (blood_type, sex, birthdate, etc.) gets rejected with a 400 — this endpoint is hard-scoped to contact info only, by server-side validation, not just by what the UI exposes.
Response on success:
json{ "success": true, "message": "Donor contact information updated successfully", "data": { ...full donor object... } }
Errors: 400 for validation failure or extra fields, 404 if the donor doesn't exist. No 403 for active-drive requirement — this one isn't gated by requireBloodDrive, so Volunteer/Phlebotomist can use it regardless of whether they're currently assigned to an active drive.
So for the Donor detail view: Volunteer/Phlebotomist should get an inline-editable email/contact field (not the full edit form — that stays Admin/PRC-Staff-only and out of their reach entirely), backed by this new endpoint. Everything else on the donor record stays read-only for them, exactly as the contract already says.

Additional backend donor updates:
- POST /api/donors now rejects duplicate donors by national ID, email, or contact with 409 Conflict.
- GET /api/donors/search supports query parameter `q` for frontend search compatibility.
- searchDonors now returns matching donors on first/last/full name, contact, email, and national ID number.
- Donor GET and GET by ID responses now expose `id_number` as an alias for `national_id_number` to match frontend expectations.