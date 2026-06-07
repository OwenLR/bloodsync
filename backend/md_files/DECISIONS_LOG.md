# BloodSync Decisions Log

## 2025 — Foundation Decisions

### Decision: Node.js over PHP
Reason: PHP collapses entire page on error, not designed for JSON APIs, mobile app needs JSON
Alternative: Keep PHP
Consequence: Cleaner API, same language across backend and mobile (JS)

### Decision: PostgreSQL over MongoDB
Reason: Blood data is deeply relational, FK enforcement critical for health data
Alternative: MongoDB
Consequence: Complex JOIN queries supported, MariaDB schema migrates cleanly

### Decision: Neon PostgreSQL over Railway DB
Reason: DB stays online even if API crashes, no migration between dev/prod
Consequence: Same connection string everywhere, independent scaling

### Decision: JWT over sessions
Reason: Stateless, works for both web and mobile
Alternative: Express sessions
Consequence: Token stored client-side, 8hr expiry, no server-side session storage

### Decision: Two blood tables (blood_collections + blood_units)
Reason: blood_collections = temporary holding, blood_units = main inventory
Alternative: Single table with status flag
Consequence: Clear audit trail, requestors only see blood_units, clean separation

### Decision: No separate blood_types table
Reason: Only 8 blood types, universally fixed, over-normalization avoided
Alternative: Reference table
Consequence: Validated via constants/bloodTypes.js

---

## Registration System Decisions

### Decision: Requestors merged into users table
Reason: Separate requestors table created two token structures, two auth middlewares, verifyAnyToken hack
Alternative: Keep separate requestors table
Consequence: One consistent JWT payload, checkRole works uniformly, simpler auth

### Decision: Volunteer/Phlebotomist share volunteer_profiles table
Reason: Fields identical for both roles, role_id in users table distinguishes them
Alternative: Separate tables per role
Consequence: Less tables, simpler queries, file named profileModel.js

### Decision: Volunteer/Phlebotomist status = Pending until Admin approves
Reason: Medical system — cannot allow random people claiming to be phlebotomists
Alternative: Immediate activation
Consequence: Admin approval required, is_active=false blocks login until approved

### Decision: Declined users can re-register with same email
Reason: Allow correction of declined applications
Implementation: Old user + profile deleted atomically in transaction, fresh record created
Consequence: Old declined record is NOT kept for audit (developer confirmed acceptable)

---

## Architecture Decisions

### Decision: Option B for interview/screening separation
Reason: Medical procedure correctness — interview happens before physical screening
Alternative: Option A (keep screening_id in answers, just change flow)
Consequence: New donor_interviews table, interview_id replaces screening_id in answers and deferrals, major schema refactor

### Decision: Layered Architecture with Domain layer
Reason: Controllers were fat (100+ lines), business rules scattered across controllers and services
Alternative: Stay with MVC+Service
Consequence: app/domain/ for pure business rules, controllers limited to 4 steps

### Decision: Rename models/ to repositories/
Reason: Files are functionally repositories (SQL only), naming was misleading
Alternative: Keep models/ name
Consequence: All require paths updated via global find-replace in VS Code

### Decision: Keep file names as *Model.js inside repositories/ folder
Reason: Developer preference — only folder renamed, not individual files
Alternative: Rename files to *Repository.js
Consequence: Slight inconsistency (folder=repositories, files=*Model.js) — documented as intentional

---

## Security Decisions

### Decision: GlitchTip over Sentry
Reason: Sentry US/EU data residency concerns, GlitchTip is Sentry-compatible and can be self-hosted
Alternative: Sentry, Better Stack
Consequence: Same @sentry/node SDK, just different DSN URL

### Decision: Upstash Redis for rate limiting (replaces express-rate-limit)
Reason: Distributed rate limiting, sliding window algorithm, more accurate
Alternative: Keep express-rate-limit
Consequence: Rate limits persist across Railway restarts, per-IP with trust proxy=1

### Decision: app.set('trust proxy', 1)
Reason: Railway sits behind a proxy — without this, Railway's proxy IP gets rate limited not client IP
Consequence: Rate limiting now correctly per-client-IP

### Decision: SELECT FOR UPDATE in approveRequest
Reason: Race condition — two staff could simultaneously approve same request
Alternative: Application-level lock
Consequence: DB-level lock, BEGIN/COMMIT transaction, second approval sees status=Approved and fails

### Decision: Cloudinary for file storage (not Railway filesystem)
Reason: Railway filesystem is ephemeral — files wiped on redeploy
Alternative: Local filesystem
Consequence: Multer memory storage, files go directly to Cloudinary, permanent URLs stored in DB

---

## Medical Rules Decisions

### Decision: Hemoglobin thresholds in constants/medicalRules.js
Reason: Clinical thresholds are constants, should be in one place
Values: Male min 13.0, Female min 12.5, both max 20.0 g/dL
Source: PRC blood bank medical standards

### Decision: Extraction time > 15 min = QNS (not rejection)
Reason: Collection still recorded for history, just flagged as QNS
Alternative: Reject automatically
Consequence: is_qns=true, cannot be marked Safe, but record preserved

### Decision: FEFO (First Expiry First Out) for blood unit assignment
Reason: Medical standard — nearest expiry assigned first to minimize waste
Implementation: ORDER BY expiration_date ASC LIMIT n in getAvailableUnitsForAssignment

### Decision: Same-day deferral blocks re-attempt
Reason: Medical policy — deferred donors cannot try again same day
Implementation: checkSameDayDeferral() checks DATE(created_at) = CURRENT_DATE

---

## Rejected Approaches

### Rejected: RLS (Row Level Security) on Neon
Reason: Neon uses PgBouncer transaction mode — SET session variables don't persist between pool connections. Also neondb_owner role bypasses RLS silently.
Alternative kept: Application-layer branch_id filtering
Future: Can be implemented with dedicated limited role + direct connection URL

### Rejected: Better Stack for logging
Reason: Better Stack merged Logs into Telemetry, UI restructured, setup became confusing
Alternative used: Railway built-in logs (stdout/stderr) + GlitchTip for errors

### Rejected: Separate requestors table
Reason: Created two auth flows, two token structures, verifyAnyToken middleware hack
Alternative used: Requestors merged into users table with role_id=4

### Rejected: Option A (keep screening_id in interview answers)
Reason: Medically incorrect — interview should not reference a screening that doesn't exist yet
Alternative used: Option B — new donor_interviews table, interview_id in answers/deferrals

### Rejected: Cryoprecipitate in component_expiry_days
Reason: Developer intentionally removed it
Status: Do not add back

### Rejected: DTO layer
Reason: Adds complexity, minimal benefit for Node.js/Express at this scale
Future: May add if system grows significantly

### Rejected: Full event system now
Reason: No Socket.io infrastructure yet, UAT timing pressure
Future: Needed for notifications feature