# AI Rules for BloodSync — New Chat Edition

## FIRST THING TO DO IN EVERY NEW CHAT
1. Read ALL uploaded memory files completely before responding
2. Confirm understanding of current project state
3. Ask what the developer wants to work on
4. Verify relevant existing files before writing any code
5. Never start implementing immediately without confirming context

## Context Preservation Rules
- Never assume what a file contains — ask for it or read it first
- Never assume a function signature — verify before calling it
- Never assume a column name exists — check DATABASE_SCHEMA.md or ask
- If a file was modified in a previous session and not re-uploaded, ask for the current version
- Past assistance does not authorize continuing without re-reading context

## Coding Rules
- Always use async/await (no .then().catch())
- Always wrap controller logic in try/catch
- Always use response.handleError(res, error) in catch blocks — never raw res.status().json()
- Always check if resource exists before updating/deleting
- Use COALESCE in UPDATE queries for PATCH operations
- Never expose password field in responses
- Always get user identity from req.user.user_id (JWT), never from request body
- Services throw BusinessError for known violations, plain Error for unexpected failures
- Domain functions throw plain Error — services wrap them as BusinessError

## Architecture Rules — STRICT
### Controller rule: exactly 4 steps
1. Extract request data
2. Call validator
3. Call service (or repository for simple reads)
4. Return response using responseHelper

### Layer isolation — NEVER violate
- Repositories: SQL queries ONLY — no business logic
- Controllers: 4 steps ONLY — no bcrypt, no jwt, no business logic
- Services: orchestration ONLY — no SQL, no res/req objects
- Domain: pure functions ONLY — no require('express'), no pool.query()
- Validators: technical input validation ONLY — no business rules, no DB queries
- Routes: endpoint definitions + middleware ONLY — no logic
- emailService: sendEmail() ONLY — no templates, no business logic
- emailTemplates: HTML builders ONLY — no sending, no DB
- socketHandler: Socket.io setup ONLY — no business logic, no DB queries
- inventoryScheduler: cron registration ONLY — calls inventoryCheckService
- inventoryCheckService: evaluation + alert triggering ONLY — no email/socket directly

## Database Rules
- Never add, remove, or rename columns without explicit developer approval
- Never change table relationships without approval
- Always present proposed schema changes and wait for confirmation
- Always use TIMESTAMPTZ for datetime columns (PHT requires timezone-aware storage)
- PHT comparisons: always use (NOW() AT TIME ZONE 'Asia/Manila') in SQL

## Refactoring Rules
- Read the existing file BEFORE writing a replacement
- Never rewrite what you haven't read
- Present proposed changes before implementing
- Never rename variables, functions, files, or columns without explicit approval

## Naming Rules — STRICT
- Files: camelCase (roleModel.js, bloodCollectionService.js, businessError.js)
- Database tables: snake_case
- Database columns: snake_case
- JavaScript variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Routes: kebab-case URLs (/api/blood-collections, /api/donor-interviews)
- NO PascalCase for files — caught and fixed: BusinessError.js → businessError.js

## Folder Rules
- middleware/ lives at backend/middleware/ — NOT app/middleware/ (does not exist)
- repositories/ is the folder name — files inside are still named *Model.js (intentional)
- app/email/ for emailService.js and emailTemplates.js
- app/socket/ for socketHandler.js
- app/scheduler/ for inventoryScheduler.js
- app/cache/ for cacheService.js
- No new folders for single files without developer approval

## Error Handling Rules
- Services: throw new BusinessError(message, statusCode) for known violations
- Services: throw new Error(message) for unexpected infrastructure failures only
- Domain: throw new Error(message) — services wrap as BusinessError
- Controllers: ALWAYS use response.handleError(res, error) in catch
- Never use string matching to classify errors in controllers

## Communication Rules
- Ask clarifying questions before implementing complex features
- Present options when multiple approaches exist
- Give brutally honest assessments when asked
- Flag potential problems before they happen
- Always explain what changed and why
- When asked to check files — actually check them, don't assume
- One question at a time when asking for clarification

## Things To Never Do
- Never use MongoDB packages (PostgreSQL only)
- Never create a separate requestors table
- Never use req.requestor — only req.user exists
- Never reference models/ folder path — it is now repositories/
- Never add cryoprecipitate to component_expiry_days
- Never store computed values like total_donations
- Never use app.use(xss()) — custom XSS middleware is used instead
- Never create separate blood_type table
- Never use unique_code on donors
- Never put business rules in validators
- Never put business rules in controllers
- Never put DB queries in services directly
- Never put DB queries in domain files
- Never write res.status().json() directly in controllers — use responseHelper
- Never create app/middleware/ folder — middleware belongs at backend/middleware/
- Never rename *Model.js files inside repositories/ — only the folder was renamed

## Pattern to Follow for New Features
1. SQL migration first (if new tables needed)
2. Constants (if new fixed values needed)
3. Domain (pure business rules)
4. Validator (technical input validation)
5. Repository (SQL queries)
6. Service (orchestration — uses domain + repository)
7. Controller (4 steps)
8. Routes (endpoints + middleware)
9. Update server.js if new route needed
10. Update existing services if new hooks needed (e.g. trigger notifications)