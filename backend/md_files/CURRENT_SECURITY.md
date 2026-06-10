# BloodSync — Current Security Implementation

## Overview
This document covers all security features currently implemented in BloodSync,
including both explicit security mechanisms and architectural decisions made
intentionally to reduce attack surface or enforce data integrity.

---

## 1. Authentication

### JWT (JSON Web Tokens)
- All protected routes require a valid JWT verified by `authMiddleware.js`
- Token payload: `{ user_id, email, role_id, branch_id }`
- Access token expiry: **15 minutes** (`JWT_EXPIRES_IN=15m`)
- Secret stored in `.env` as `JWT_SECRET` — never hardcoded

### httpOnly Cookies
- Access token and refresh token are both delivered via **httpOnly cookies**
- `httpOnly: true` — JavaScript cannot read the token; immune to XSS token theft
- `secure: true` in production — cookies only sent over HTTPS
- `sameSite: strict` — cookies not sent on cross-site requests; CSRF protection
- Tokens are never returned in the response body — frontend cannot access them
  programmatically, only the browser sends them automatically

### Refresh Token System
- On login, two tokens are issued:
  - **Access token** — short-lived (15 min), stored in httpOnly cookie
  - **Refresh token** — long-lived (7 days), stored in httpOnly cookie
- Refresh token is stored **hashed** (SHA-256) in the `refresh_tokens` table —
  raw token never touches the database
- Token **rotation** on every refresh — old token deleted, new one issued;
  a stolen refresh token can only be used once before it is invalidated
- On logout, the refresh token is **deleted from the database immediately** —
  the token is truly dead, not just expired; eliminates the "valid token after
  logout" gap present in pure JWT systems
- `is_active` / `status` re-checked on every refresh — deactivated accounts
  cannot silently stay logged in via refresh token
- Separate `JWT_REFRESH_SECRET` — a compromised access token secret does not
  also compromise refresh tokens

### Password Hashing
- All passwords hashed with **bcrypt** before storage
- Plain-text passwords never stored or logged
- `bcrypt.compare()` used for login verification — timing-safe comparison

---

## 2. Authorization

### Role-Based Access Control (RBAC)
- Every protected route passes through `roleMiddleware.js` (`checkRole`)
- `role_id` is read from the verified JWT payload — never from the request body
- Six roles enforced: Admin (1), PRC Staff (2), Donor (3, non-login),
  Requestor (4), Volunteer (5), Phlebotomist (6)
- 403 returned immediately if `role_id` is not in the allowed roles array for
  that route

### Branch Ownership Enforcement
- PRC Staff can only create, update, cancel, and manage blood drives for their
  **own branch** (`branch_id` from JWT)
- Enforced in `bloodDriveService.js` via `assertBranchOwnership()` — not just
  at the route level
- Admin bypasses this restriction by design

### Blood Drive Field Operation Gate
- Volunteers and Phlebotomists can only perform field operations (register donors,
  conduct interviews, screenings, donations, collections) if they are **assigned
  to an active blood drive at the current PHT time**
- Enforced by `bloodDriveMiddleware.js` — sets `req.drive_id` or rejects with 403
- Admin and PRC Staff bypass this gate and receive `req.drive_id = null`

### Cross-Drive Isolation
- Field roles cannot act on records that belong to a different drive than their
  own assignment
- Enforced independently in `screeningService`, `donationService`, and
  `bloodCollectionService` — business rule belongs in the service layer, not
  just middleware
- Prevents a volunteer assigned to Drive A from modifying Drive B records

### Identity Field Locking
- Volunteer and Phlebotomist identity fields (`first_name`, `last_name`,
  `birthdate`, `sex`) are **rejected server-side** if sent in a profile update
- Enforced in `volunteerProfileValidator.js` — not a frontend-only restriction
- Ensures identity cannot be changed even with a valid authenticated token

---

## 3. Input Security

### XSS Protection
- Custom XSS middleware in `server.js` sanitizes all string fields in `req.body`
  using the `xss` package before they reach any route handler
- HTML escape function (`esc()`) applied to all user-supplied data interpolated
  into HTML responses in `bloodDriveController.confirmParticipation` —
  escapes `&`, `<`, `>`, `"`, `'` to prevent quote breakout and script injection

### HTTP Parameter Pollution (HPP)
- `hpp` middleware applied globally — prevents attackers from sending duplicate
  query parameters to bypass validation or cause unexpected behavior

### Security Headers (Helmet)
- `helmet` middleware applied globally — sets secure HTTP headers including:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection`
  - `Strict-Transport-Security` (in production)
  - Removes `X-Powered-By` header (Express fingerprinting)

### File Upload Validation
- `uploadMiddleware.js` enforces:
  - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/jpg`,
    `application/pdf` only
  - **File size limit**: 5MB maximum
  - Files stored in memory (Multer `memoryStorage`) — never written to disk
    on the server; uploaded directly to Cloudinary

---

## 4. Rate Limiting

### Distributed Sliding Window Rate Limiting (Upstash Redis)
- Rate limiting state stored in **Upstash Redis** — works correctly across
  multiple Railway instances (not in-memory, not per-process)
- Two limiters applied globally:

| Limiter | Limit | Window | Applied To |
|---|---|---|---|
| `apiRateLimiter` | 100 requests | 15 minutes per IP | All `/api/*` routes |
| `loginRateLimiter` | 5 requests | 15 minutes per IP | `/api/auth/login`, `/api/requestors/login` |

- Rate limit headers returned on every response (`X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- `app.set('trust proxy', 1)` configured — correct IP extraction behind
  Railway's reverse proxy
- 429 returned with descriptive message on limit exceeded

---

## 5. Data Integrity & Race Condition Protection

### SELECT FOR UPDATE on Blood Request Approval
- Blood request approval uses a **PostgreSQL row-level lock** (`SELECT FOR UPDATE`
  inside a transaction)
- Prevents two staff members from simultaneously approving the same request and
  double-assigning blood units
- If the second approval attempt finds `status = Approved`, it fails cleanly
  via domain rule validation before any units are reserved

### FEFO Blood Unit Assignment
- Blood units are auto-assigned using **First Expired, First Out** ordering
- Nearest expiry date assigned first — reduces wastage risk
- Enforced in `bloodRequestService.approveRequest()` via
  `bloodUnitModel.getAvailableUnitsForAssignment()`

### PHT Timezone Safety
- All datetimes stored as `TIMESTAMPTZ` — timezone-aware
- All Philippine time comparisons use `(NOW() AT TIME ZONE 'Asia/Manila')`
  explicitly in SQL — Railway server runs UTC; explicit conversion prevents
  off-by-8-hour bugs in drive active window checks

---

## 6. Error Tracking & Observability

### GlitchTip Error Tracking
- `instrument.js` initializes GlitchTip (Sentry-compatible) as the **first
  require** in `server.js` — captures errors before any other code runs
- `Sentry.setupExpressErrorHandler(app)` registered after all routes —
  captures unhandled Express errors
- `tracesSampleRate: 0.2` — 20% transaction sampling; sufficient for thesis
  UAT without excessive overhead
- `autoSessionTracking: false` — GlitchTip does not support Sentry sessions;
  disabled to prevent noise
- `NODE_ENV` passed as environment tag — dev and production errors separated
- Unhandled promise rejections and uncaught exceptions also logged via
  `process.on('unhandledRejection')` and `process.on('uncaughtException')`

### Structured Error Responses
- `BusinessError` class — typed errors with `statusCode` property; services
  throw these for known violations (400/401/403/404)
- `responseHelper.handleError()` — unified catch handler in all controllers;
  `BusinessError` → uses `error.statusCode`; plain `Error` → 500 + GlitchTip
  capture; raw `res.status().json()` never used in controllers directly
- Raw PostgreSQL errors never exposed to the client — always wrapped or
  caught as 500

---

## 7. Tokenized Email Confirmation

### Blood Drive Assignment Confirmation
- When a volunteer/phlebotomist is assigned to a blood drive, a
  **cryptographically random 64-character hex token** (`crypto.randomBytes(32)`)
  is generated and stored in `blood_drive_participants.confirmation_token`
- Token is included in confirm/decline links sent via assignment email
- Clicking the link hits `GET /api/blood-drives/confirm?token=xxx&action=confirm`
  — **no login required**; the token itself is the authentication
- Token is **single-use** — cleared from the database immediately after use;
  cannot be reused
- Token stored as plaintext (unlike refresh tokens) — it is short-lived by
  nature (only valid until the drive ends or is cancelled) and single-use

---

## 8. Security by Design (Architectural Decisions)

These are not traditional security features but architectural choices made
intentionally to reduce attack surface or enforce data integrity.

### Unified Users Table
- No separate `requestors` table — requestors are `role_id = 4` in `users`
- Eliminates a dual authentication flow that would have doubled the attack
  surface and created inconsistent token handling

### No RLS on Neon (Deliberate Rejection)
- Row-Level Security was evaluated and **deliberately rejected**
- Reason: Neon uses PgBouncer in transaction mode, which is incompatible with
  `SET` session variables required by RLS policies
- Branch and role scoping is enforced at the application layer instead
  (service layer + middleware)

### Audit Trail on Blood Request Status Changes
- `request_status_logs` table records every status transition with
  `changed_by_type` and `changed_by_id`
- `changed_by_id` has no FK constraint intentionally — `changed_by_type`
  disambiguates whether it references a staff user or requestor; a FK would
  require a single table reference
- Provides a tamper-evident audit trail for all request lifecycle events

### Donor Email Required Server-Side
- Donor email is required at donation time, enforced in `donationService`
- `BusinessError` thrown if donor has no email on record — cannot be bypassed
  by the frontend omitting the field

### Same-Day Deferral Blocking
- A donor who is deferred cannot re-attempt donation on the same day
- Enforced in the service layer — not just a UI restriction

### Active Deferral Blocking
- An active deferral blocks donation regardless of other eligibility checks
- Checked before hemoglobin and other medical validations

### Medical Flow Enforcement
- Strict sequential flow: Interview → Screening → Donation → Collection
- Each step checks the previous step's result before proceeding
- Cannot skip steps or reorder them — enforced in services, not just routes

---

## 9. Infrastructure Security

### Environment Variables
- All secrets in `.env` — never hardcoded: `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `DATABASE_URL`, `CLOUDINARY_*`, `UPSTASH_*`, `GLITCHTIP_DSN`, `EMAIL_*`
- Separate secrets for access tokens and refresh tokens

### HTTPS
- Railway deployment enforces HTTPS automatically
- `secure: true` on cookies in production ensures tokens never sent over HTTP

### External Services
- **Cloudinary** — file storage; files never stored on the server filesystem
- **Upstash Redis** — rate limiting and caching; TLS enforced by Upstash
- **Neon PostgreSQL** — SSL enforced on all connections
- **GlitchTip** — error tracking; DSN stored in environment variable

---

## Known Limitations (Documented for Transparency)

| Limitation | Status | Notes |
|---|---|---|
| No token blacklist for access tokens | Accepted | Access tokens expire in 15 min; refresh token deletion on logout covers the main gap |
| `getDrivesByBranch` returns empty array for non-existent branch | Post-defense | Minor inconsistency; no security impact |
| No pagination on `getAllDrives` | Post-defense | Not a security issue; performance concern for large datasets |
| No model-layer error normalization | Post-defense | Raw DB errors caught at controller level via `handleError()` |