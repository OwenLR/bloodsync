# BloodSync Architecture

## System Architecture
Web Frontend (HTML/CSS/JS) ──────┐
↓
Mobile App (React Native) ──→  Node.js API (Railway)
↓
Admin Panel ────────────────→  Neon PostgreSQL

## Current Architecture Pattern
Hybrid Layered Architecture — transitioning from MVC+Service to full Layered Architecture with Domain layer.

### Actual Layer Structure (Current State — Mid-Conversion)
Request
↓
Route (defines endpoint + middleware)
↓
Middleware (verifyToken + checkRole)
↓
Controller (validates input + calls service + returns response)
↓
Service (orchestrates workflow + calls domain + calls repositories)
↓
Domain (pure business rules — NEW, being added)
↓
Repository/Model (database queries ONLY)
↓
Database (Neon PostgreSQL)

## Folder Structure (Post-Conversion — In Progress)
backend/
├── app/
│   ├── repositories/        ← renamed from models/ — SQL queries ONLY
│   ├── controllers/         ← request/response ONLY — 4 steps max
│   ├── routes/              ← endpoints ONLY
│   ├── services/            ← orchestration ONLY — delegates to domain
│   ├── domain/              ← NEW — pure business rules, no framework deps
│   └── cache/               ← moved from middleware/ — cache logic
├── config/
│   ├── db.js                ← PostgreSQL connection pool
│   ├── cloudinary.js        ← Cloudinary configuration
│   └── redis.js             ← Upstash Redis configuration
├── constants/
│   ├── roles.js             ← role ID constants
│   ├── bloodTypes.js        ← valid blood type values
│   ├── statuses.js          ← valid status values
│   └── medicalRules.js      ← hemoglobin thresholds, extraction limits
├── middleware/
│   ├── authMiddleware.js    ← JWT token verification (staff)
│   ├── roleMiddleware.js    ← role-based access control
│   └── uploadMiddleware.js  ← multer memory storage
├── utils/
│   ├── responseHelper.js    ← standardized API responses + GlitchTip capture
│   ├── dateHelper.js        ← date calculation utilities
│   └── uploadHelper.js      ← Cloudinary upload/delete functions
├── validators/              ← technical input validation ONLY
├── instrument.js            ← GlitchTip/Sentry init (must be first require)
└── server.js

## IMPORTANT: models/ vs repositories/
The folder was named `models/` originally but the files inside are functionally repositories — they contain only SQL queries, no business logic, no entity behavior. As part of the architecture conversion, this folder is being renamed to `repositories/`. All require paths are being updated accordingly.

## Layer Responsibilities

### Controller (4 steps only)
1. Extract request data
2. Call validator
3. Call service (or repository for simple reads)
4. Return response

### Service
- Orchestrates workflows
- Calls domain functions for business decisions
- Calls repositories for data access
- Manages transactions when needed

### Domain (NEW — being added)
- Pure business rules
- No framework dependencies
- No database access
- Functions that take data, return results or throw errors
- Examples: hemoglobin eligibility check, deferral rules, status transition rules

### Repository (app/repositories/)
- SQL queries only
- No business logic
- No validation
- Returns raw data to services

## Authentication
- JWT tokens (jsonwebtoken)
- Password hashing (bcrypt)
- Token expires in 8 hours (JWT_EXPIRES_IN=8h)
- Staff token payload: { user_id, email, role_id, branch_id }
- NO separate requestor token — requestors are in users table with role_id = 4
- Token stored client-side (localStorage web, AsyncStorage mobile)

## Role Based Access Control
- All roles in users table — no separate requestor table
- role_id embedded in JWT token
- checkRole middleware reads role_id from token
- Role IDs: 1=Admin, 2=PRC Staff, 3=Donor, 4=Requestor, 5=Volunteer, 6=Phlebotomist

## Error Tracking
- GlitchTip (Sentry-compatible, self-hostable)
- instrument.js loaded as first require in server.js
- responseHelper.error() automatically captures 500 errors via Sentry.captureMessage()
- setupExpressErrorHandler registered after all routes

## Caching (3 Layers)
- Layer 1: Browser caching via Cache-Control headers (hospitals, branches — 300s)
- Layer 2: Application caching via Upstash Redis (blood availability — 60s)
- Layer 3: CDN caching — planned post-deployment
- Cache invalidated when blood unit status changes (markAsSafe, approveRequest, releaseRequest, rejectRequest)

## Rate Limiting
- Upstash Redis sliding window (replaces express-rate-limit)
- General API: 100 requests per 15 minutes per IP
- Login endpoints: 5 requests per 15 minutes per IP
- app.set('trust proxy', 1) set for Railway proxy
- Requestor account lockout: 5 failed attempts = locked 15 minutes

## File Storage
- Cloudinary for all file uploads
- Multer memory storage (files never touch disk)
- Folders: profile_images/, request_forms/
- URLs stored in database columns (profile_img, request_form_path)