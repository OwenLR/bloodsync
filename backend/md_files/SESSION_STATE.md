# BloodSync Session State

## Current Objective
Architecture conversion — transitioning from MVC+Service to Layered Architecture with Domain layer.

## Current Progress

### Completed
Phase 1 — Foundation ✅
Phase 2 — Donor + Screening ✅ (with major architectural fix)
Phase 3 — Blood Collection ✅
Phase 4 — Blood Request Flow ✅
Architecture Cleanup Round 1 ✅ (responseHelper, dateHelper, constants, validators, services)
Infrastructure Setup ✅ (GlitchTip, Cloudinary, Upstash Redis/Rate Limiting)
Donor Interview Separation ✅ (interview → answers → screening flow — Option B)
Registration System ✅ (Requestor/Volunteer/Phlebotomist unified in users table)
Requestor Merge ✅ (requestors merged into users table, role_id=4)
Security Fixes ✅ (trust proxy, SELECT FOR UPDATE race condition, deferralModel bug fix)
Validator Audit ✅ (all validators updated with proper validation)
Medical Rules ✅ (hemoglobin thresholds, extraction time, QNS logic)
Flow Enforcement ✅ (interview → screening → donation → collection chain enforced)
Duplicate Donor Detection ✅ (national ID check, returns existing record)

### In Progress — Architecture Conversion
⬜ Step 1: Rename app/models/ → app/repositories/ (global find-replace in VS Code)
⬜ Step 2: Create app/domain/ folder
⬜ Step 3: Create app/cache/ folder
⬜ Step 4: Create domain files (donorEligibility.js, donationRules.js, bloodRequestRules.js, bloodUnitRules.js)
⬜ Step 5: Create new services (authService.js, userService.js, donorService.js, bloodUnitService.js)
⬜ Step 6: Update existing services to use domain
⬜ Step 7: Create new validators (branchValidator, hospitalValidator, interviewQuestionValidator, bloodUnitValidator)
⬜ Step 8: Slim all controllers to 4 steps
⬜ Step 9: Move cacheMiddleware.js → app/cache/cacheService.js
⬜ Step 10: Update all require paths

### Pending Features (Required for Thesis 2)
⬜ Blood drive management
⬜ Real-time notifications (Socket.io)
⬜ Reports
⬜ Frontend (HTML + CSS + Vanilla JS)
⬜ Railway deployment

## Current Working State
- Server starts clean
- All core flows tested in Postman and working
- Architecture conversion started but NOT complete
- developer confirmed app/models/ → app/repositories/ rename
- developer confirmed app/domain/ and app/cache/ folders to be created

## Controllers Audit Results
Clean (only require path updates needed):
- bloodCollectionController.js
- bloodRequestController.js
- screeningController.js
- deferralController.js
- donorInterviewController.js
- interviewAnswerController.js
- roleController.js

Need slimming (business logic to extract):
- authController.js → password compare, token generation → authService.js
- userController.js → bcrypt.hash, email check → userService.js
- registrationController.js → bcrypt.hash, inline validation → registrationService.js
- donorController.js → national ID check calls model directly → donorService.js
- bloodUnitController.js → status validation, transition check → bloodUnitService.js
- branchController.js → inline validation → branchValidator.js
- hospitalController.js → inline validation → hospitalValidator.js
- interviewQuestionController.js → sex validation inline → interviewQuestionValidator.js
- donationController.js → wrong validation (checks donor_id which is now auto-filled)

## Next Recommended Steps (New Chat)
1. Confirm models/ → repositories/ rename done + global find-replace done
2. Confirm app/domain/ and app/cache/ folders created
3. Start writing domain files
4. Write new services
5. Slim controllers
6. Move cache
7. Test server starts clean
8. Then: Blood drive management feature
9. Then: Notifications
10. Then: Reports
11. Then: Frontend
12. Then: Railway deployment

## Server Configuration
- Local: http://localhost:3000
- Environment: .env with all required vars
- Run command: npm run dev (nodemon)
- Node version: v24.11.1
- OS: Windows

## Environment Variables Required
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=8h
PORT=3000
NODE_ENV=development
GLITCHTIP_DSN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

## Installed Packages
```json
{
  "@sentry/node": "installed",
  "@sentry/profiling-node": "installed",
  "@upstash/redis": "installed",
  "@upstash/ratelimit": "installed",
  "bcrypt": "installed",
  "cloudinary": "installed",
  "dotenv": "installed",
  "express": "installed",
  "helmet": "installed",
  "hpp": "installed",
  "jsonwebtoken": "installed",
  "morgan": "installed",
  "multer": "installed",
  "nodemailer": "installed",
  "nodemon": "installed (dev)",
  "pg": "installed",
  "validator": "installed",
  "xss": "installed"
}
```

## Known Issues / Technical Debt
- interviewAnswerValidator uses object method style (interviewAnswerValidator.validateSubmit()) — inconsistent with other validators but functional
- SSL rejectUnauthorized: false in db.js — acceptable for dev, review for production
- express-rate-limit still installed but replaced by Upstash — can be uninstalled
- @logtail/node still installed (Better Stack abandoned) — should be uninstalled

## THINGS THAT LOOK WRONG BUT ARE INTENTIONAL
1. app/repositories/ files named *Model.js — historical naming, not changing file names, only folder
2. profileModel.js covers both volunteers AND phlebotomists — intentional shared table
3. No separate requestors table — merged into users table intentionally
4. No unique_code on donors — donor_id serves as identifier
5. No Cryoprecipitate in component_expiry_days — removed intentionally
6. No total_donations column on donors — computed from donations table
7. No last_donation_date column on donors — queried from donations table
8. interviewAnswerValidator object method style — not a bug
9. changed_by_id in request_status_logs has no FK constraint — intentional (references either users or requestors by type)
10. donor_id and branch_id not sent by frontend for donations — auto-filled from screening by service
11. interview_id in donor_interview_answers and donor_deferrals (NOT screening_id) — architectural fix, intentional
12. screening references interview_id — flow enforcement, intentional
13. Cache invalidation called after COMMIT in approveRequest — intentional (only invalidate on success)