# BloodSync File Index

## utils/businessError.js
Purpose: Custom typed error class for known business rule violations
Why: Eliminates string-matching in controllers, gives services a clean way to signal
     400/401/403/404 errors vs unexpected 500s
Responsibilities: Extend Error with statusCode property
Used By: All services, responseHelper.handleError()
Should NOT contain: Business logic, DB queries

## utils/responseHelper.js
Purpose: Standardized API response formatting
Responsibilities: success(), created(), error(), notFound(), badRequest(),
                  unauthorized(), forbidden(), handleError()
handleError(): if BusinessError → use error.statusCode; if plain Error → 500 + GlitchTip
Should NOT contain: Business logic

## utils/dateHelper.js
Purpose: Date calculation utilities
Responsibilities: calculateExpiryDate(), isExpired(), formatDate(), daysBetween()

## utils/uploadHelper.js
Purpose: Cloudinary file operations
Responsibilities: uploadToCloudinary(buffer, folder), deleteFromCloudinary(publicId)

## middleware/authMiddleware.js
Purpose: JWT verification
Responsibilities: Read token from req.cookies.access_token (web) OR
                  Authorization: Bearer header (mobile), verify JWT,
                  attach decoded payload to req.user
Note: Cookie takes priority over Bearer header — web always uses cookie

## middleware/roleMiddleware.js
Purpose: Role-based access control
Responsibilities: Read role_id from req.user, check against allowed roles array

## middleware/bloodDriveMiddleware.js
Purpose: Blood drive field operation gate
Responsibilities: Admin/PRC Staff → pass through (req.drive_id = null)
                  Volunteer/Phlebotomist → verify active drive assignment → set req.drive_id
Note: Lives at backend/middleware/ NOT app/middleware/ (app/middleware/ does not exist)

## middleware/uploadMiddleware.js
Purpose: Multer memory storage for file uploads
Allowed types: image/jpeg, image/png, image/jpg, application/pdf
File size limit: 5MB

## middleware/upstashRateLimiter.js
Purpose: Upstash Redis sliding window rate limiting
Exports: apiRateLimiter (100 req/15min), loginRateLimiter (5 req/15min)

## app/cache/cacheService.js
Purpose: All application caching logic
Exports: cache() middleware, getCache(), setCache(), invalidateCache()
Note: Old cacheMiddleware.js deleted — this is the replacement

## app/domain/donorEligibility.js
Exports: checkHemoglobinEligibility(hemoglobin, sex)
Throws: plain Error — wrapped as BusinessError in donationService

## app/domain/donationRules.js
Exports: evaluateExtractionTime(minutes) → {is_qns, qns_reason}
         assertNotQns(collection) — throws plain Error

## app/domain/bloodRequestRules.js
Exports: assertValidTransition(currentStatus, newStatus), VALID_TRANSITIONS

## app/domain/bloodUnitRules.js
Exports: assertNotTerminal(unit), assertReasonProvided(status, reason)
         TERMINAL_STATUSES, REASON_REQUIRED_STATUSES

## app/domain/bloodDriveRules.js
Exports: getNowPHT(), computeDriveStatus(drive), assertNotTerminal(drive),
         assertCancellable(drive), assertValidDateRange(start, end),
         assertStartNotInPast(start), isDriveActiveNow(drive), TERMINAL_STATUSES
Note: getNowPHT() uses 'Asia/Manila' explicitly — Railway runs UTC

## app/domain/inventoryRulesDomain.js
Exports: isLowStock(count) → boolean
         isNearExpiry(expirationDate, component) → boolean
Uses: constants/inventoryRulesConstant.js for thresholds
Should NOT contain: DB queries, email, socket
Note: Previously planned as inventoryRules.js — renamed to avoid confusion with
      constants file of similar name

## app/email/emailService.js
Purpose: nodemailer configuration + send function only
Exports: sendEmail({ to, subject, html })
Should NOT contain: Templates, business logic, DB queries

## app/email/emailTemplates.js
Purpose: HTML email content builders only
Exports: bloodDriveAssignmentEmail(data), donorPostExtractionEmail(data),
         inventoryLowEmail(data), inventoryExpiringEmail(data)
Note: bloodDriveAssignmentEmail includes confirmUrl + declineUrl buttons
Should NOT contain: Sending logic, nodemailer, DB queries

## app/socket/socketHandler.js
Purpose: Socket.io server setup and room management
Exports: initSocket(server), emitToRoom(room, event, data), getIO()
Room strategy:
  - branch_${branch_id} — Staff and Admin (branch-scoped events)
  - admin_global — Admins only (system-wide events)
  - user_${user_id} — Requestors only (private request status updates)
Should NOT contain: Business logic, DB queries, email

## app/scheduler/inventoryScheduler.js
Purpose: node-cron daily job registration
Exports: startScheduler()
Calls: inventoryCheckService.runDailyCheck()
Schedule: '0 0 * * *' UTC = 8AM PHT daily
Should NOT contain: Inventory logic, notification logic

## app/repositories/bloodDriveModel.js
Key functions:
- getActiveDriveForUser(user_id) — used by bloodDriveMiddleware, PHT comparison
- setConfirmationToken(drive_id, user_id, token) — stores confirmation token
- getParticipantByToken(token) — looks up participant by confirmation token
- clearConfirmationToken(drive_id, user_id) — clears token after use (single-use)
- cancelDrive() — guards against double-cancellation (AND status != 'Cancelled')
- updateDrive() — uses ?? null (nullish coalescing) not || null

## app/repositories/staffModel.js
Purpose: SQL to fetch staff users for notification targeting
Exports: getStaffByBranch(branch_id) → Active Admin + PRC Staff at branch
         getAllAdmins() → All active admins
Uses: status = 'active' (not is_active — users table uses status column)
Should NOT contain: Notification logic

## app/repositories/notificationModel.js
Purpose: SQL for notifications table
Exports: createNotification(data), getNotificationsByUser(user_id),
         markAsRead(notification_id, user_id), markAllAsRead(user_id),
         getUnreadCount(user_id)
Note: markAsRead scopes by both notification_id AND user_id — prevents
      users from marking other users' notifications as read

## app/repositories/bloodUnitModel.js
Key functions:
- getInventoryAvailability() — boolean per blood type + component per branch,
  includes branch coordinates (latitude, longitude) for distance calculation
  Does NOT expose unit counts — requestor-safe
- getAvailableCountByBranch(bloodType, component) — stock count per branch with
  coordinates, used for multi-branch fulfillment planning
- getAvailableUnitsForAssignment(bloodType, component, branchId, limit) — FEFO,
  nearest expiry first, scoped to branch
- getPendingRequestCountByBranch(branchId) — used for waiting time estimate
- markUnitSeparated(client, unitId, separatedBy) — sets status='Separated' inside
  a transaction; accepts pg client

## app/repositories/bloodRequestModel.js
Key functions:
- cancelRequest(requestId, userId) — SQL-scoped to user_id AND status='Pending',
  returns null if not found/not owned/wrong status
- getPendingCountByBranch(branchId) — pending request count for waiting time
- createReservation(data) — now accepts branch_id for multi-branch tracking
- getReservationsByRequest(requestId) — includes branch_name from branches join

## app/services/authService.js
Exports: login(), refresh(), logout()
login(): issues access token (JWT, 15min) + refresh token (random 64-char hex, 7d)
         stores refresh token HASHED (SHA-256) in refresh_tokens table
refresh(): validates token hash against DB, rotates token (delete old, issue new),
           re-checks user is_active on every refresh
logout(): deletes refresh token from DB immediately — token is truly dead
Should NOT contain: Cookie logic (that is in authController)
Note: authController handles web/mobile branching — service is client-agnostic

## app/services/notificationService.js
Purpose: Orchestrates all notification delivery
Exports:
  notifyNewBloodRequest(request) → DB + socket to branch room
  notifyRequestStatusChange({request_id, user_id, new_status, patient_name, reason})
    → DB notification + socket to user_${user_id} room
    → Called on: Approved, Rejected, Released
  notifyBloodDriveAssigned(user, drive) → DB + email with confirm/decline links
  notifyDonorPostExtraction(donor, donation) → email only
  notifyInventoryLow(branch_id, branch_name, items) → DB + email + socket
  notifyInventoryExpiring(branch_id, branch_name, items) → DB + email + socket
Calls: notificationModel, emailService, emailTemplates, socketHandler, staffModel
Should NOT contain: SQL, HTML templates, nodemailer directly

## app/services/inventoryCheckService.js
Purpose: Daily inventory evaluation logic
Exports: checkLowStock(), checkNearExpiry(), runDailyCheck()
Calls: pool directly (cross-branch aggregate query), inventoryRulesDomain,
       notificationService
Note: Direct pool usage is a known exception — cross-branch aggregate has no
      single repository owner
Should NOT contain: Email sending, socket emission, cron setup

## app/services/bloodDriveService.js
assertBranchOwnership(): PRC Staff branch restriction enforced here
getDriveWithCurrentStatus(): lazy status resolution helper
confirmParticipation(token, action): validates token, updates status, clears token
addParticipant(): generates confirmation_token via crypto.randomBytes(32),
                  calls notificationService.notifyBloodDriveAssigned() (fire and forget)

## app/services/bloodRequestService.js
Exports:
  createRequest(data, items, userId) — validates unit cap, creates request + items + log
  getFulfillmentOptions(items, lat, lon) — multi-branch plan with Haversine distance sorting
    Returns: { plans, recommendation: 'single_branch'|'split', any_insufficient }
  getWaitingTimeEstimate(branchId) — queue depth + operating hours → label
  approveRequest(requestId, staffId) — FEFO multi-branch, SELECT FOR UPDATE
  releaseRequest(requestId, staffId)
  rejectRequest(requestId, staffId, denialReason) — frees reserved units
  cancelRequest(requestId, userId) — requestor self-cancel, Pending only
  updateStatus(requestId, status, staffId, denialReason) — routes to above
All status changes call notifyRequestStatusChange() fire-and-forget

## app/services/screeningService.js
Cross-drive check: FIELD_ROLES check interview.drive_id !== reqDriveId → 403
Signature: createScreening(data, user_id, reqUser, reqDriveId)

## app/services/donationService.js
Cross-drive check: FIELD_ROLES check screening.drive_id !== reqDriveId → 403
Donor email check: if !donor.email → BusinessError before creating donation
Signature: createDonation(data, user_id, reqUser, reqDriveId)

## app/services/bloodCollectionService.js
Cross-drive check: FIELD_ROLES check donation.drive_id !== reqDriveId → 403
Signature: createCollection(data, user_id, reqUser, reqDriveId)

## app/controllers/notificationController.js
Purpose: Notification endpoints — 4 steps only
Responsibilities: getMyNotifications, getUnreadCount, markAsRead, markAllAsRead
Used By: notificationRoutes.js

## app/controllers/bloodDriveController.js
confirmParticipation(): public endpoint, returns HTML not JSON, uses esc() for
                        XSS safety, delegates logic to bloodDriveService
esc(): escapes &, <, >, ", ' — safe for both element content and attribute context

## app/controllers/bloodRequestController.js
Exports: getAllRequests, getRequestById, getMyRequests, createRequest,
         updateRequestStatus, getFulfillmentOptions, getWaitingTimeEstimate,
         cancelRequest
Note: All catch blocks use response.handleError() — NOT response.error()

## app/routes/notificationRoutes.js
Base path: /api/notifications
GET /               → getMyNotifications (all authenticated roles)
GET /unread-count   → getUnreadCount (all authenticated roles)
PATCH /:id/read     → markAsRead (all authenticated roles)
PATCH /read-all     → markAllAsRead (all authenticated roles)

## app/routes/bloodDriveRoutes.js
GET /confirm → confirmParticipation — PUBLIC, no auth middleware
CRITICAL: Must be registered BEFORE /:id route to avoid Express route shadowing

## app/routes/bloodRequestRoutes.js
Requestor routes:
  POST /                    → createRequest
  GET  /my-requests         → getMyRequests
  POST /fulfillment-options → getFulfillmentOptions (call before submitting)
  GET  /estimate/:branch_id → getWaitingTimeEstimate
  PATCH /:id/cancel         → cancelRequest (Pending only)
Staff/Admin routes:
  GET  /         → getAllRequests
  GET  /:id      → getRequestById
  PATCH /:id/status → updateRequestStatus

## app/routes/registrationRoutes.js
Contains: Self-registration routes + Admin approval routes ONLY
Does NOT contain: Volunteer self-profile routes (those are in volunteerProfileRoutes.js)

## app/routes/volunteerProfileRoutes.js
Base path: /api/volunteers/me
Contains: GET /profile, PATCH /profile for Volunteer and Phlebotomist roles only

## app/routes/authRoutes.js
POST /login   → login (public)
POST /refresh → refresh (public — refresh token cookie/body is the auth)
POST /logout  → logout (public — clears cookies + deletes refresh token from DB)

## validators/bloodRequestValidator.js
Exports: validateCreateRequest, validateUpdateRequestStatus, validateFulfillmentOptions
validateItems() — shared internal helper, validates unit cap using bloodRequestConstant.js
Unit cap: MAX_UNITS_PER_ITEM per line item, MAX_UNITS_PER_REQUEST total

## validators/interviewAnswerValidator.js
Uses object method style: interviewAnswerValidator.validateSubmit()
References interview_id (NOT screening_id) — was fixed previously
Do NOT change to function export style

## validators/registrationValidator.js
Exports: validateRequestorRegistration (name + email + password + optional contact only)
         validateRegistration (full volunteer/phlebotomist profile fields)
These are SEPARATE — requestors use the lighter validator

## validators/donorValidator.js
email is NOW REQUIRED (was optional before)

## validators/volunteerProfileValidator.js
LOCKED_FIELDS = ['first_name', 'last_name', 'birthdate', 'sex']
These fields are rejected server-side if sent — not just frontend restriction

## constants/inventoryRulesConstant.js
LOW_STOCK_THRESHOLD = 5
NEAR_EXPIRY_DAYS = {
  'Whole Blood': 7,
  'Packed Red Blood Cells': 7,
  'Platelets': 2,
  'Fresh Frozen Plasma': 30
}
Should NOT contain: Functions or logic
Note: Previously planned as inventoryRules.js — renamed to avoid confusion

## constants/bloodRequestConstant.js
MAX_UNITS_PER_REQUEST = 10 (total units across all items per request)
MAX_UNITS_PER_ITEM = 10 (units per single blood type + component line item)
WAIT_TIME_ESTIMATES = queue depth thresholds → human-readable labels
OPERATING_HOURS = { start: 8, end: 17 } (PHT, 8AM–5PM)
Should NOT contain: Functions or logic
Note: Update here when PRC changes policy — no other files need to change

## app/services/fulfillmentService.js
Purpose: Blood request fulfillment planning — read-only, no mutations
Exports: getDistanceKm(lat1, lon1, lat2, lon2)
         getWaitingTimeEstimate(branchId)
         buildFulfillmentPlan(item, requestorLat, requestorLon)
         getFulfillmentOptions(items, requestorLat, requestorLon)
Uses: bloodUnitModel, bloodRequestModel, bloodRequestValidator.validateItems()
Should NOT contain: DB mutations, cache writes, notifications, socket, email



UPDATED CHANGES (LATEST)
## app/repositories/bloodCollectionModel.js
ADD to Exports: createDerivedCollections(client, sourceUnit, components, separatedBy)
  — inserts 3 derived Pending collections from a separated whole blood unit,
    sets source_unit_id for traceability, fresh expiry from separation date

## app/repositories/bloodUnitModel.js
ADD to Key functions:
- markUnitSeparated(client, unitId, separatedBy) — sets status='Separated' inside
  a transaction; accepts pg client

## app/services/bloodUnitService.js
ADD to Exports: separateUnit(unitId, staffUser)
  — asserts Whole Blood + Available, PRC Staff branch ownership check,
    fetches component expiry days, runs transaction:
    markUnitSeparated + createDerivedCollections
    invalidates both cache keys after commit

## app/services/bloodRequestService.js
UPDATE description: lifecycle only — createRequest, approveRequest, releaseRequest,
  rejectRequest, cancelRequest, updateStatus
  Fulfillment planning moved to fulfillmentService.js
  validateRequestItems removed — uses validateItems() from bloodRequestValidator

## validators/bloodRequestValidator.js
ADD to Exports: validateItems() — now exported for use by services
  (was previously internal helper only)

## app/controllers/bloodUnitController.js
ADD to Exports: separateUnit

## app/routes/bloodUnitRoutes.js
ADD: POST /:id/separate — Admin + PRC Staff only
ADD: GET /inventory now cached (60s, key: cache:blood-units:inventory)



### UPDATED

# Patch for FILE_INDEX.MD
# Apply to your actual FILE_INDEX.MD. Insert each entry in its appropriate
# alphabetical/logical location matching the existing file's organization.

## ADD new entry — validators/authValidator.js

## validators/authValidator.js
Purpose: Technical input validation for auth endpoints
Exports: validateChangePassword(data) — current_password required,
         new_password required (min 8 chars), new_password must differ
         from current_password
Should NOT contain: business rules, DB queries, bcrypt calls
Note: login()'s own inline validation in authService.js was NOT migrated
      here — pre-existing inconsistency, flagged but not fixed this session

## UPDATE existing entry — app/services/authService.js
ADD to Exports: changePassword(userId, currentPassword, newPassword) —
  shared by ALL roles, not role-restricted. Verifies currentPassword via
  bcrypt.compare against the stored hash, then hashes and stores
  newPassword via userModel.updatePassword(). Throws BusinessError(404) if
  user not found, BusinessError(400) if currentPassword doesn't match.

## UPDATE existing entry — app/repositories/userModel.js
ADD to Key functions:
- getUserCredentialsById(id) — returns {user_id, password} only. Exists
  separately from getUserById() because getUserById() intentionally
  excludes the password hash from its SELECT (used for public-safe user
  data elsewhere). This one exists specifically so authService.changePassword()
  can bcrypt.compare() against the real hash.
- updatePassword(id, hashedPassword) — caller (authService) must hash
  before calling; this function does not hash, only stores.
- getStaffProfileByUserId(userId) — SELECT from staff_profiles
- upsertStaffProfileImg(userId, profileImgUrl) — INSERT ... ON CONFLICT
  (user_id) DO UPDATE SET profile_img, updated_at — safe to call repeatedly,
  creates the staff_profiles row on first call, updates on subsequent calls

## UPDATE existing entry — app/services/userService.js
ADD to Exports: updateOwnProfileImg(userId, fileBuffer) — Admin + PRC Staff
  self-service. Uploads fileBuffer to Cloudinary ('profile_images' folder,
  same as volunteer/phlebotomist uploads), then calls
  userModel.upsertStaffProfileImg() with the resulting URL.
Note: changeOwnPassword() was considered for this file but moved to
      authService.js instead — see ARCHITECTURE.MD "Important Decisions"
      for the reasoning (password logic is role-independent, /api/users is
      reserved for Admin managing OTHER users).

## UPDATE existing entry — app/controllers/authController.js
ADD to Exports: changePassword — reads req.user.user_id from JWT (never
  request body), calls authValidator.validateChangePassword() then
  authService.changePassword()

## UPDATE existing entry — app/controllers/userController.js
ADD to Exports: updateMyProfileImg — reads req.user.user_id from JWT and
  req.file.buffer from multer (uploadMiddleware), calls
  userService.updateOwnProfileImg()

## UPDATE existing entry — app/routes/authRoutes.js
ADD: PATCH /me/password → changePassword (verifyToken only, no checkRole —
  every authenticated role may change their own password)

## UPDATE existing entry — app/routes/userRoutes.js
ADD: PATCH /me/profile-img → updateMyProfileImg (Admin + PRC Staff only,
  via upload.single('profile_img') middleware)
CRITICAL: Must be registered BEFORE PATCH /:id to avoid Express route
  shadowing (same pattern as GET /api/volunteers/available vs
  /volunteers/:id/profile)

## ADD new table reference (if FILE_INDEX.MD tracks tables — otherwise skip, covered in ARCHITECTURE.MD)
staff_profiles — Admin + PRC Staff profile data (currently: profile_img
  only). Parallel structure to volunteer_profiles for the other role group.



### UPDATED

# Patch for FILE_INDEX.MD — Registration address block: PSGC dropdowns +
# ZIP code lookup. Apply to your actual FILE_INDEX.MD, same as prior patches.

## ADD new entry — app/services/postalCodeService.js

## app/services/postalCodeService.js
Purpose: Best-effort ZIP/postal code lookup by province + city/municipality
         name, for the registration form's address block
Exports: lookupZip({ province, municipality }) →
         { post_code, matched_municipality, matched_location } | null
Uses: use-postal-ph (unofficial npm package, MIT, zero deps — verified this
      session: 2,139 rows, actively maintained). NOT PSGC, NOT an official
      PHLPost dataset — confirmed via a public FOI request that no official
      structured barangay/city-to-ZIP mapping exists (PHLPost pointed to a
      static 2019 PDF instead).
Note: Outside NCR, the data is one row per city/municipality — clean 1:1
      match, verified specifically for Batangas (this project's actual PRC
      chapter: 35 municipality rows, each a single post_code). Inside NCR,
      ZIP is split by district/subdivision under each city — a
      city-name-only match is unreliable there. This is a SUGGESTION only;
      callers must keep the ZIP field editable after pre-filling.
Should NOT contain: DB queries, HTTP handling (that's referenceController.js)

## ADD new entry — app/controllers/referenceController.js

## app/controllers/referenceController.js
Purpose: Small standalone public reference-data endpoints not owned by any
         single domain model
Exports: lookupZip — reads req.query.province/municipality, calls
         postalCodeService.lookupZip(). "No match" is NOT an error — returns
         200 with data: null so the frontend can silently leave the ZIP
         field blank, same pattern as geocoding fallback.
Used By: referenceRoutes.js

## ADD new entry — app/routes/referenceRoutes.js

## app/routes/referenceRoutes.js
Base path: /api/reference
GET /zip-lookup → lookupZip — PUBLIC, no auth middleware (used pre-auth by
                  the Volunteer/Phlebotomist registration form, same trust
                  level as registrationRoutes.js's self-registration routes)

## UPDATE existing entry — server.js
ADD: mounted referenceRoutes at app.use("/api/reference", referenceRoutes)
ADD to Helmet CSP connectSrc: https://psgc.gitlab.io (province/city/barangay
  cascading dropdowns) — https://nominatim.openstreetmap.org was already
  present for the blood drive map picker and registration geocoding, unchanged

## UPDATE existing entry — package.json
ADD dependency: use-postal-ph (^1.1.14) — see
  app/services/postalCodeService.js above