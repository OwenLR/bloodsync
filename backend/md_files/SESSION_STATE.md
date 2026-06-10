# BloodSync Session State

## Current Development Goal
Reports feature — next major backend feature before frontend and deployment.

## Pending Features
- Reports
- Frontend (HTML + CSS + Vanilla JS)
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

---

## Notification Types and Channels (reference)
| Type | Trigger | Channel | Recipients |
|---|---|---|---|
| blood_request_new | Requestor submits request | Socket.io + DB | Branch staff only |
| blood_drive_assigned | Staff adds participant | Email + DB | Assigned volunteer/phlebotomist |
| donor_post_extraction | Donation created | Email only | The donor |
| inventory_low | Daily cron | Email + DB | Branch staff + all admins |
| inventory_expiring | Daily cron | Email + DB | Branch staff + all admins |

## Inventory Thresholds (confirmed)
- LOW_STOCK_THRESHOLD = 5 units
- NEAR_EXPIRY_DAYS: Whole Blood 7d, PRBC 7d, Platelets 2d, FFP 30d

## Socket.io Room Strategy
- Staff/Admin → join room: branch_${branch_id}
- Admin → also joins: admin_global
- Requestors: no socket room

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

## Packages Added This Session
```bash
npm install nodemailer node-cron socket.io cookie-parser
```

## Environment Variables Added This Session
```
JWT_EXPIRES_IN=15m                  # changed from 8h
JWT_REFRESH_SECRET=                 # new — separate secret for refresh tokens
REFRESH_TOKEN_EXPIRES_IN=7d         # new
APP_URL=http://localhost:3000        # new — used for confirmation email links
EMAIL_HOST=                         # new
EMAIL_PORT=                         # new
EMAIL_USER=                         # new
EMAIL_PASS=                         # new
EMAIL_FROM=                         # new (any value works for Mailtrap)
```

## Post-Defense Improvements (do not prioritize now)
- Model-layer error normalization
- Pagination on getAllDrives
- getDrivesByBranch existence check for non-existent branch
- Mobile app (React Native)
- Donor login and self-service
- SMS notifications
- Refresh token family detection (reuse detection)