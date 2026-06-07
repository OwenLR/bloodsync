# AI Rules For BloodSync Project

## Critical Rules

### 1. Never Assume — Always Ask
- If a table name is unclear, ask before using it
- If a column name is not confirmed, ask before using it
- If a file path is uncertain, ask before referencing it
- If a relationship is ambiguous, ask before implementing it

### 2. Never Rename Without Approval
- All variable names, function names, table names, column names are fixed
- Never rename anything without explicit developer approval
- Even if a name seems inconsistent, keep it unless told otherwise

### 3. Never Modify Database Schema Without Approval
- Never add, remove, or rename columns without asking first
- Never change table relationships without asking first
- Always present proposed schema changes and wait for confirmation

### 4. Read Before Writing
- Before providing a replacement file, read the existing file first
- Ask what the developer wants to update before rewriting
- Never assume what the current file contains

### 5. Preserve Architecture
- Repositories (app/repositories/): SQL queries ONLY
- Controllers: ONLY 4 steps — extract, validate, call service, return response
- Services: ONLY orchestration — call domain + call repositories + coordinate
- Domain (app/domain/): ONLY pure business rules — no DB, no HTTP, no framework
- Routes: ONLY endpoint definitions + middleware
- Validators: ONLY technical input validation (format, required, type)
- Domain: business validation (eligibility, rules, policies)
- Utils: ONLY reusable helper functions
- Constants: ONLY fixed values
- Cache (app/cache/): ONLY cache logic

### 6. Follow Naming Conventions
- Files: camelCase (roleModel.js, bloodCollectionService.js)
- Database tables: snake_case (blood_collections, donor_interview_questions)
- Database columns: snake_case (branch_id, first_name, is_active)
- JavaScript variables: camelCase (getAllDonors, screeningResult)
- Constants: UPPER_SNAKE_CASE (VALID_BLOOD_TYPES, COLLECTION_STATUSES)
- Routes: kebab-case URLs (/api/blood-collections, /api/donor-interviews)

### 7. Always Use responseHelper
- Never write res.status().json() directly in controllers
- Always use response.success(), response.created(), response.error() etc.

### 8. Always Use ROLES Constants
- Never use magic numbers for roles in route files
- Always use ROLES.ADMIN, ROLES.PRC_STAFF etc.

### 9. Services Only For Complex Operations
- Only create a service when operation involves business logic or multiple repositories
- Simple reads: controller can call repository directly
- Complex logic: controller calls service, service calls domain + repositories

### 10. Domain Layer Rules
- Domain functions are pure JavaScript — no require('express'), no pool.query()
- Take plain data as input, return results or throw Error
- Can be tested without any framework or database

### 11. Repository Path Convention
- All repository requires use: require('../repositories/...') or require('../../repositories/...')
- The folder was renamed from models/ to repositories/ — never use models/ path

## Code Style Rules
- Use async/await consistently (no .then().catch())
- Always wrap controller logic in try/catch
- Always check if resource exists before updating/deleting
- Use COALESCE in UPDATE queries for PATCH operations
- Never expose password field in responses
- Always get user identity from req.user.user_id (JWT token), never from request body

## Architecture Conversion Rules (ACTIVE)
The system is mid-conversion from MVC+Service to Layered Architecture.
- New domain files go in app/domain/
- Cache logic goes in app/cache/ (moving from middleware/)
- New services being created: authService, userService, donorService, bloodUnitService
- New validators being created: branchValidator, hospitalValidator, interviewQuestionValidator, bloodUnitValidator
- Controllers being slimmed to 4 steps only

## Communication Rules
- Ask clarifying questions before implementing complex features
- Present options when multiple approaches exist
- Give brutally honest assessments when asked
- Flag potential problems before they happen
- Always explain what changed and why when providing updated files

## What To Do When Starting A New Chat
1. Read all provided memory files completely
2. Confirm understanding of current project state
3. Ask what the developer wants to work on
4. Verify relevant existing files before writing new code
5. Never start implementing immediately without confirming context

## Things To Never Do
- Never use MongoDB-related packages (this is PostgreSQL)
- Never use PHP patterns or syntax
- Never create duplicate notification tables
- Never store session_token in database (use JWT)
- Never store computed values like total_donations (query instead)
- Never add cryoprecipitate to component_expiry_days (removed intentionally)
- Never use app.use(xss()) — use custom XSS middleware instead
- Never use xss-clean package (deprecated)
- Never create separate blood_type table (over-normalization)
- Never use unique_code on donors table (removed intentionally)
- Never create a separate requestors table (merged into users table)
- Never use req.requestor — only req.user exists now
- Never reference models/ folder path — it is now repositories/
- Never put business rules in validators (validators = technical validation only)
- Never put business rules in controllers (controllers = 4 steps only)
- Never put database queries in services (services call repositories)
- Never put database queries in domain (domain is pure functions)