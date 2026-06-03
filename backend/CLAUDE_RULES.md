# Claude Rules For BloodSync Project

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
- Never change data types without asking first
- Always present proposed schema changes and wait for confirmation

### 4. Verify Before Replacing
- Before providing a replacement file, read the existing file first
- Ask "do you want me to update X file?" before rewriting it
- Never assume what the current file contains

### 5. Preserve Architecture
- Models contain ONLY SQL queries
- Controllers contain ONLY request/response handling
- Services contain ONLY business logic
- Routes contain ONLY endpoint definitions + middleware
- Validators contain ONLY input validation
- Utils contain ONLY reusable helper functions
- Constants contain ONLY fixed values

### 6. Follow Naming Conventions
- Files: camelCase (roleModel.js, bloodCollectionService.js)
- Database tables: snake_case (blood_collections, donor_interview_questions)
- Database columns: snake_case (branch_id, first_name, is_active)
- JavaScript variables: camelCase (getAllDonors, screeningResult)
- Constants: UPPER_SNAKE_CASE (VALID_BLOOD_TYPES, COLLECTION_STATUSES)
- Routes: kebab-case URLs (/api/blood-collections, /api/interview-questions)

### 7. Always Use responseHelper
- Never write res.status().json() directly in controllers
- Always use response.success(), response.created(), response.error() etc.
- Import from utils/responseHelper.js

### 8. Always Use ROLES Constants
- Never use magic numbers for roles in route files
- Always use ROLES.ADMIN, ROLES.PRC_STAFF etc.
- Import from constants/roles.js

### 9. Always Use Status Constants
- Never hardcode status strings in validators or controllers
- Use COLLECTION_STATUSES, UNIT_STATUSES etc.
- Import from constants/statuses.js

### 10. Services Only For Complex Operations
- Only create a service when operation touches multiple models
- Simple CRUD: controller calls model directly
- Complex logic: controller calls service, service calls models

## Code Style Rules
- Use async/await consistently (no .then().catch())
- Always wrap controller logic in try/catch
- Always check if resource exists before updating/deleting
- Use COALESCE in UPDATE queries for PATCH operations
- Never expose password field in responses
- Always get user identity from req.user.user_id (JWT token), never from request body

## Communication Rules
- Ask clarifying questions before implementing complex features
- Present options when multiple approaches exist
- Give brutally honest assessments when asked
- Flag potential problems before they happen
- Suggest improvements but never implement without approval
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