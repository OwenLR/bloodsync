# BloodSync Architecture

## System Architecture
Mobile App (React Native)  ─────┐
↓
Website (HTML/CSS/JS)  ─────→  Node.js API (Railway)
↓
Admin Panel  ───────────→  Neon PostgreSQL
(always online, independent)

## API Architecture Pattern
Request
↓
Route (defines endpoint + middleware)
↓
Middleware (verifyToken + checkRole)
↓
Controller (validates input + calls service or model + returns response)
↓
Service (business logic + coordinates multiple models) [complex only]
↓
Model (database queries ONLY)
↓
Database (Neon PostgreSQL)

## Folder Structure
backend/
├── app/
│   ├── models/          → database queries ONLY
│   ├── controllers/     → request/response ONLY
│   ├── routes/          → endpoints ONLY
│   └── services/        → business logic ONLY (complex features)
├── config/
│   └── db.js            → database connection ONLY
├── constants/
│   ├── roles.js         → role IDs
│   ├── bloodTypes.js    → valid blood types
│   └── statuses.js      → valid status values
├── middleware/
│   ├── authMiddleware.js → token verification ONLY
│   └── roleMiddleware.js → role checking ONLY
├── utils/
│   ├── responseHelper.js → standard API responses
│   └── dateHelper.js     → date calculations
├── validators/
│   ├── userValidator.js
│   ├── donorValidator.js
│   ├── screeningValidator.js
│   └── bloodCollectionValidator.js
├── .env
├── .gitignore
├── package.json
└── server.js

## Authentication
- JWT tokens (jsonwebtoken)
- Password hashing (bcrypt)
- Token expires in 8 hours (JWT_EXPIRES_IN=8h)
- Token contains: user_id, email, role_id, branch_id
- Token stored client-side (localStorage web, AsyncStorage mobile)

## Role Based Access Control
- Roles stored in database roles table
- role_id embedded in JWT token
- checkRole middleware reads role_id from token
- Role IDs defined in constants/roles.js

## Hosting Architecture
Code → GitHub → Railway (auto-deploy)
Database → Neon PostgreSQL (independent, always online)
Domain → Hostinger → pointed to Railway
Files → Cloudinary (future, for document uploads)

## Key Architecture Decisions

### Why Node.js over PHP
- PHP collapses entire page on error
- PHP not designed for JSON APIs
- Mobile app needs JSON responses
- Node.js designed for real-time communication
- Same language (JS) across backend and mobile

### Why PostgreSQL over MongoDB
- Blood data is deeply relational
- Foreign key enforcement critical for health data
- Complex JOIN queries needed for reports
- MariaDB schema migrates almost 1:1

### Why Neon (separate DB) over Railway DB
- Database stays online even if API crashes
- Mobile app + web both connect to same DB
- No migration needed from local to production
- Same connection string in dev and prod

### Why Two Blood Tables
- blood_collections = temporary holding (pending testing)
- blood_units = main inventory (safe, releasable)
- Requestors only see blood_units
- Clear audit trail between collection and release

### Services Layer
- Only added for complex features touching multiple models
- Simple CRUD controllers call models directly
- Services used for: screening, interview answers, blood collection, donation

### Why No Separate Blood Type Table
- Only 8 blood types, universally fixed
- No extra attributes needed
- Validated in code via constants/bloodTypes.js
- Over-normalization avoided

### Requestor System
- Requestors register and login themselves
- hospital_id = where the patient needs blood
- Request requires hospital document upload
- Multiple blood types per request allowed (new feature)
- Auto-assign nearest expiry blood unit on confirmation