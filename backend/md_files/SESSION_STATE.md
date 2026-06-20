# BloodSync Session State

## Current Development Goal
Frontend development — backend complete and stable.

## Project Phase
Thesis 2 — Implementation + Real User UAT phase.
Real PRC staff and requestors will use the system during UAT.
Mobile app for requestors is IN SCOPE for this phase.

## Pending Features
- Frontend (HTML + CSS + Vanilla JS) — web app for Admin, PRC Staff, Volunteer, Phlebotomist
- Requestor mobile app (React Native) — in scope for UAT
- Reports (frontend-first — build UI then write queries to match)
- Railway deployment

## Known Issues
- None confirmed. Server starts clean.

---

## Completed This Session (Full History)

### Architecture & Foundation
- Full architecture conversion (MVC+Service → Layered Architecture with Domain)
- businessError.js (camelCase) — typed error class
- responseHelper.handleError() — unified catch handler
- All services updated to throw BusinessError
- All controllers updated to use handleError
- bloodDriveMiddleware.js — moved to correct backend/middleware/ location
- cross-drive isolation in screeningService, donationService, bloodCollectionService
- volunteerProfileValidator.js — extracted from bloodDriveValidator
- volunteerProfileRoutes.js — extracted from registrationRoutes
- statuses.js — updated with BLOOD_DRIVE_STATUSES, VENUE_TYPES, PARTICIPANT_STATUSES
- donorValidator.js — email NOW required (was optional)
- interviewAnswerValidator.js — fixed screening_id → interview_id

### Notifications Feature — COMPLETE
- notifications table migrated on Neon
- constants/inventoryRulesConstant.js — fixed threshold values
- app/domain/inventoryRulesDomain.js — isLowStock(), isNearExpiry()
- app/email/emailService.js — sendEmail() only
- app/email/emailTemplates.js — HTML builders only
- app/socket/socketHandler.js — initSocket(), emitToRoom(), getIO()
- app/repositories/staffModel.js — getStaffByBranch(), getAllAdmins()
- app/repositories/notificationModel.js — notifications table CRUD
- app/services/notificationService.js — orchestrates DB + email + socket
- app/services/inventoryCheckService.js — evaluation + triggers notificationService
- app/controllers/notificationController.js — 4 steps only
- app/routes/notificationRoutes.js — /api/notifications endpoints
- app/scheduler/inventoryScheduler.js — daily cron at 0AM UTC (8AM PHT)
- server.js updated — http server, initSocket, startScheduler, notificationRoutes
- bloodRequestService.js — notifyNewBloodRequest() hooked up after createRequest
- bloodDriveService.js — notifyBloodDriveAssigned() hooked up after addParticipant

### Auth Overhaul — COMPLETE
- refresh_tokens table migrated on Neon
- httpOnly cookies — access_token + refresh_token set via res.cookie()
- Refresh token system — rotation on every refresh, deleted on logout
- Refresh tokens stored hashed (SHA-256) in DB — raw token never stored
- authService.js — login(), refresh(), logout() implemented
- authController.js — sets/clears cookies, no token in response body
- authMiddleware.js — reads req.cookies.access_token instead of Authorization header
- authRoutes.js — POST /refresh added
- server.js — cookie-parser added
- JWT access token expiry changed: 8h → 15m
- New env vars: JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRES_IN=7d

### Dual Auth (Web + Mobile) — COMPLETE
- authMiddleware.js — Bearer token fallback added (cookie first, then Authorization header)
- authController.js — mobile/web branching via x-client-type: mobile header
  - login: mobile returns tokens in body, web sets httpOnly cookies
  - refresh: mobile reads token from body, web reads from cookie
  - logout: mobile reads token from body, web reads from cookie + clears cookies
- server.js — CORS added with credentials: true, ALLOWED_ORIGINS env var
- New env var: ALLOWED_ORIGINS (comma-separated list of allowed frontend origins)

### Drive Assignment Confirmation — COMPLETE
- confirmation_token column added to blood_drive_participants (migration done)
- bloodDriveModel.js — setConfirmationToken(), getParticipantByToken(),
  clearConfirmationToken() added
- bloodDriveModel.js — cancelDrive() double-cancellation guard added
- bloodDriveModel.js — updateDrive() || null → ?? null (nullish coalescing fix)
- bloodDriveService.js — generates crypto token on addParticipant, passes to
  notificationService
- bloodDriveService.js — confirmParticipation() added (service layer, not controller)
- notificationService.js — notifyBloodDriveAssigned() updated to accept
  confirmation_token, builds confirmUrl + declineUrl
- emailTemplates.js — bloodDriveAssignmentEmail() updated with confirm/decline
  buttons and tokenized links
- bloodDriveController.js — confirmParticipation() added; uses esc() for XSS
  safety; returns HTML not JSON; delegates to service layer
- bloodDriveRoutes.js — GET /confirm added as public route (no auth middleware),
  registered BEFORE /:id to avoid Express route shadowing
- APP_URL added to .env (used to build tokenized confirmation links)

### Security Documentation
- CURRENT_SECURITY.md created — covers all security features and architectural
  security decisions

### Blood Request Enhancements — COMPLETE
- Migration run on Neon:
  - branches table: latitude, longitude columns added
  - blood_requests table: fulfillment_type, delivery_address, preferred_branch_id added
  - reservations table: branch_id added (tracks which branch each unit came from)
  - Branch coordinates seeded: Batangas, Lipa, Nasugbu, Tanauan
- constants/bloodRequestConstant.js — new file:
  - MAX_UNITS_PER_REQUEST = 10
  - MAX_UNITS_PER_ITEM = 10
  - WAIT_TIME_ESTIMATES — queue depth → label mapping
  - OPERATING_HOURS — 8AM–5PM PHT
- socketHandler.js — requestors now join user_${user_id} private room on connect
  - Uses ROLES constants instead of hardcoded role IDs
- bloodUnitModel.js — updated:
  - getInventoryAvailability() returns boolean + branch coords (not string)
  - getAvailableCountByBranch() added — stock count per branch with coordinates
  - getPendingRequestCountByBranch() added — for waiting time estimate
- bloodRequestModel.js — updated:
  - cancelRequest(requestId, userId) added — SQL-scoped to user_id AND status=Pending
  - getPendingCountByBranch(branchId) added
  - createReservation() accepts branch_id
  - All SELECT queries include new columns
- bloodRequestService.js — full rewrite:
  - validateRequestItems() — enforces unit cap using constants
  - getWaitingTimeEstimate() — dynamic queue + operating hours awareness
  - getFulfillmentOptions() — multi-branch plan with Haversine distance sorting
  - buildFulfillmentPlan() — per-item: single branch vs split recommendation
  - approveRequest() — multi-branch FEFO: primary branch first, fills from others
  - cancelRequest() — requestor self-cancel with proper BusinessError messages
  - All status changes emit notifyRequestStatusChange() fire-and-forget
- notificationService.js — notifyRequestStatusChange() added:
  - Writes DB notification for requestor
  - Emits to user_${user_id} socket room
  - Handles Approved, Rejected, Released status messages
- bloodRequestRoutes.js — new endpoints:
  - POST /fulfillment-options (Requestor)
  - GET /estimate/:branch_id (Requestor)
  - PATCH /:id/cancel (Requestor)
- bloodRequestController.js — new methods + fixed all catch blocks to use handleError:
  - getFulfillmentOptions
  - getWaitingTimeEstimate
  - cancelRequest
- bloodRequestValidator.js — updated:
  - validateItems() extracted as shared helper
  - validateFulfillmentOptions() added
  - Unit cap validation uses constants (not hardcoded)

### Frontend Notes & Planning — COMPLETE
- FRONTEND_NOTES.MD created — developer guide for web + mobile
- FRONTEND_CONTRACT.MD created — full API surface, request/response shapes
- FRONTEND_AI_RULES.MD created — how AI should work on frontend
- FRONTEND_SESSION_STATE.MD created — frontend build tracker (not started)

### Blood Unit Separation — COMPLETE
- migration.sql — source_unit_id column added to blood_collections (nullable FK → blood_units)
- constants/statuses.js — 'Separated' added to UNIT_STATUSES
- app/domain/bloodUnitRules.js — 'Separated' added to TERMINAL_STATUSES, assertSeparable() added
- validators/bloodUnitValidator.js — validateSeparate() added
- app/repositories/bloodCollectionModel.js — createDerivedCollections() added
- app/repositories/bloodUnitModel.js — markUnitSeparated() added, getUnitById() extended
  to include donation_id, donor_id, branch_id, drive_id
- app/services/bloodUnitService.js — separateUnit() added
- app/controllers/bloodUnitController.js — separateUnit() added
- app/routes/bloodUnitRoutes.js — POST /:id/separate (Admin + PRC Staff only)

### Cache Fixes — COMPLETE
- bloodUnitRoutes.js — GET /inventory now cached (cache:blood-units:inventory, 60s TTL)
- bloodUnitService.js — invalidateCache() called on both cache keys after
  updateUnitStatus() and separateUnit()
- bloodRequestService.js — inventory cache key added alongside existing
  availability invalidation in approveRequest(), releaseRequest(), rejectRequest()
- Cache key constants defined at top of both service files — never hardcoded inline

### bloodRequestService.js Split — COMPLETE
- app/services/fulfillmentService.js — new file: getDistanceKm(), buildFulfillmentPlan(),
  getFulfillmentOptions(), getWaitingTimeEstimate()
- app/services/bloodRequestService.js — lifecycle only: createRequest(), approveRequest(),
  releaseRequest(), rejectRequest(), cancelRequest(), updateStatus()
  validateRequestItems() removed — replaced with validateItems() from validator
- validators/bloodRequestValidator.js — validateItems() now exported (was internal only)
- app/controllers/bloodRequestController.js — fulfillmentService imported separately;
  getFulfillmentOptions and getWaitingTimeEstimate now call fulfillmentService directly

---

## Notification Types and Channels (reference)
| Type | Trigger | Channel | Recipients |
|---|---|---|---|
| blood_request_new | Requestor submits request | Socket.io + DB | Branch staff only |
| blood_request_status | Staff approves/rejects/releases | Socket.io + DB | The requestor |
| blood_drive_assigned | Staff adds participant | Email + DB | Assigned volunteer/phlebotomist |
| donor_post_extraction | Donation created | Email only | The donor |
| inventory_low | Daily cron | Email + DB | Branch staff + all admins |
| inventory_expiring | Daily cron | Email + DB | Branch staff + all admins |

## Socket.io Room Strategy
- Staff/Admin → join room: branch_${branch_id}
- Admin → also joins: admin_global
- Requestors → join room: user_${user_id} (private — for request status updates)

## Blood Request Unit Cap
- MAX_UNITS_PER_REQUEST = 10 (total across all items)
- MAX_UNITS_PER_ITEM = 10 (per line item)
- Defined in constants/bloodRequestConstant.js — change there only

## Blood Request Fulfillment Priority
1. Nearest branch that can fulfill ALL units → auto-select
2. No single branch sufficient → show requestor: split (nearest first) vs single farther branch
3. No branch has enough even combined → auto-split across available branches

## Branch Coordinates (seeded on Neon)
- Batangas: 13.765939, 121.065009
- Lipa: 13.949117, 121.175462
- Nasugbu: 14.074731, 120.632809
- Tanauan: 14.081115, 121.153060

## Inventory Thresholds (confirmed)
- LOW_STOCK_THRESHOLD = 5 units
- NEAR_EXPIRY_DAYS: Whole Blood 7d, PRBC 7d, Platelets 2d, FFP 30d

## Email Provider
- Development: Mailtrap (any EMAIL_FROM value works)
- Production: Resend (host: smtp.resend.com, port: 465, user: resend, pass: API key)
- Both via nodemailer SMTP — only .env values change between environments

## Scheduler
- Daily cron: '0 0 * * *' UTC = 8AM PHT
- Railway free tier caveat: service may sleep — scheduler won't fire if sleeping

## Donor Email
- Email REQUIRED at donor registration (donorValidator.js)
- donationService checks donor.email before creating donation
- BusinessError if no email: "Donor has no email on record. Please update
  the donor's profile before recording a donation."

## File Responsibility Contract (do not violate)
- constants/inventoryRulesConstant.js → fixed values only
- constants/bloodRequestConstant.js → fixed values only (MAX_UNITS, WAIT_TIME_ESTIMATES, OPERATING_HOURS)
- app/domain/inventoryRulesDomain.js → isLowStock(), isNearExpiry() only
- app/email/emailService.js → sendEmail() only
- app/email/emailTemplates.js → HTML builders only
- app/socket/socketHandler.js → initSocket(), emitToRoom(), getIO() only
- app/scheduler/inventoryScheduler.js → startScheduler() + cron registration only
- app/repositories/staffModel.js → getStaffByBranch(), getAllAdmins() only
- app/repositories/notificationModel.js → notifications table SQL only
- app/services/notificationService.js → orchestrates DB + email + socket
- app/services/inventoryCheckService.js → evaluation + triggers notificationService
- app/controllers/notificationController.js → 4 steps only
- app/routes/notificationRoutes.js → endpoints only

## Packages Added
```bash
npm install nodemailer node-cron socket.io cookie-parser cors
```

## Environment Variables (all)
```
# JWT
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
REFRESH_TOKEN_EXPIRES_IN=7d

# App
APP_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500

# Email
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

# Database
DATABASE_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# GlitchTip
GLITCHTIP_DSN=

# Environment
NODE_ENV=development
PORT=3000
```

## Post-UAT Improvements (do not prioritize now)
- Model-layer error normalization
- Pagination on getAllDrives
- getDrivesByBranch existence check for non-existent branch
- Donor login and self-service
- SMS notifications
- Refresh token family detection (reuse detection)


# Patch for SESSION_STATE.MD (backend root-level file)
# Apply to your actual SESSION_STATE.MD.

## ADD new entry to "Completed This Session (Full History)" — new subsection

### Self-Service Password Change + Admin/Staff Profile Photo — COMPLETE
- Migration run on Neon: new table `staff_profiles`
  (profile_id PK, user_id FK UNIQUE → users ON DELETE CASCADE, profile_img,
  created_at, updated_at) — mirrors volunteer_profiles pattern, scoped to
  Admin (role_id 1) and PRC Staff (role_id 2) only.
- validators/authValidator.js — NEW FILE — validateChangePassword()
  (current_password required, new_password required min 8 chars, must
  differ from current_password)
- app/services/authService.js — changePassword(userId, currentPassword,
  newPassword) added. Shared by ALL roles — verifies current password via
  bcrypt.compare, hashes new password, calls userModel.updatePassword().
- app/controllers/authController.js — changePassword controller added.
  Reads req.user.user_id from JWT, never from request body.
- app/routes/authRoutes.js — PATCH /me/password added (verifyToken only,
  no checkRole — every authenticated role can change their own password)
- app/repositories/userModel.js — added:
  - getUserCredentialsById(id) — returns {user_id, password} only, separate
    from getUserById() which intentionally excludes the password hash
  - updatePassword(id, hashedPassword) — caller must hash before calling
  - getStaffProfileByUserId(userId)
  - upsertStaffProfileImg(userId, profileImgUrl) — INSERT ... ON CONFLICT
    (user_id) DO UPDATE, safe to call repeatedly
- app/services/userService.js — updateOwnProfileImg(userId, fileBuffer)
  added. Uploads to Cloudinary (same 'profile_images' folder as
  volunteer/phlebotomist uploads), then upserts URL into staff_profiles.
- app/controllers/userController.js — updateMyProfileImg added. Reads
  req.user.user_id from JWT, req.file.buffer from multer.
- app/routes/userRoutes.js — PATCH /me/profile-img added (Admin + PRC Staff
  only, via upload.single('profile_img') middleware). Registered BEFORE
  /:id route to avoid Express route shadowing — same fix pattern as
  GET /api/volunteers/available vs /volunteers/:id/profile earlier this
  project.

IMPORTANT ARCHITECTURAL DECISION — password change placement:
Password change was deliberately NOT placed under /api/users (which is
Admin-only management of OTHER users' accounts — POST /api/users,
PATCH /api/users/:id, DELETE /api/users/:id are all Admin-only by design).
Self-service "change MY OWN password" doesn't fit that access model for
non-Admin roles. It now lives under /api/auth/me/password instead, next to
the existing GET /api/auth/me, since password verification/hashing logic
is identical regardless of role_id. This also means Volunteer, Phlebotomist,
and Requestor ALL gained password-change capability as a side effect, with
zero additional role-specific code — they simply call the same shared
endpoint. Profile photo upload, by contrast, legitimately stays split by
role (staff_profiles vs volunteer_profiles are different tables), so that
part correctly stays under /api/users and /api/volunteers respectively.

An earlier draft of this work mistakenly placed changeOwnPassword() inside
userService.js and a raw pool.query() call leaked directly into that
service — caught and corrected before being finalized. The corrected
version has zero SQL in userService.js; the missing repository function
(getUserCredentialsById) was added to userModel.js instead, where it
belongs per the layer-isolation rules in AI_RULES.MD.

## ADD to "File Responsibility Contract (do not violate)" section

- validators/authValidator.js → validateChangePassword() only (NEW)
- app/repositories/userModel.js → added getUserCredentialsById(),
  updatePassword(), getStaffProfileByUserId(), upsertStaffProfileImg() —
  still SQL queries only, no business logic
- app/services/userService.js → added updateOwnProfileImg() — Cloudinary
  call + repository call only, no SQL
- app/services/authService.js → added changePassword() — bcrypt +
  repository calls only, no business logic beyond credential verification

## ADD to "Known Limitations" or "Post-UAT Improvements" (whichever section you track these in)
- Profile photo replacement does not call deleteFromCloudinary() on the old
  image when a new one is uploaded — old images become orphaned in
  Cloudinary storage over time. Not a correctness bug, just unmanaged
  storage growth. Applies to both the new staff_profiles flow and the
  pre-existing volunteer_profiles flow (neither cleans up). Low priority,
  flagged for awareness — fix by calling deleteFromCloudinary(oldPublicId)
  before/after the new upload if pursuing this later.
- authService.js login() still does inline technical validation
  (`if (!email || !password) throw ...`) rather than using a validator
  function, even though authValidator.js now exists. Not a bug — just a
  stylistic inconsistency within the file. Optional cleanup only; do not
  treat as broken.

## ADD to "Environment Variables" section — no new env vars needed
(Confirms no .env changes were required for this work — staff_profiles
uses the existing DATABASE_URL connection, profile photo upload reuses
existing CLOUDINARY_* vars.)