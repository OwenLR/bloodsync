# BloodSync File Index

## server.js
**Purpose:** Application entry point
**Why it exists:** Initializes Express, registers all middleware and routes, starts server
**Responsibilities:**
- Import and configure all middleware (helmet, hpp, xss, rate limiting, morgan)
- Register all route files
- Start HTTP server
- Handle uncaught exceptions and unhandled rejections
**Should NOT contain:**
- Business logic
- Database queries
- Route handler functions
- Validation logic

## config/db.js
**Purpose:** PostgreSQL connection pool
**Why it exists:** Single shared database connection for entire application
**Responsibilities:**
- Create pg Pool with Neon connection string
- Configure SSL settings
- Handle pool errors without crashing server
- Export pool for use in models
**Should NOT contain:**
- Query logic
- Business logic
- Any application code

## constants/roles.js
**Purpose:** Role ID constants
**Why it exists:** Prevents magic numbers in route files
**Responsibilities:**
- Export role name to role_id mapping
- Single source of truth for role IDs
**Should NOT contain:**
- Logic
- Role permissions
- Route definitions

## constants/bloodTypes.js
**Purpose:** Valid blood type values
**Why it exists:** Single source of truth for valid blood types used in validation
**Responsibilities:**
- Export array of valid blood type strings
**Should NOT contain:**
- Logic
- Validation functions

## constants/statuses.js
**Purpose:** Valid status values for collections, units, screening
**Why it exists:** Prevents hardcoded status strings scattered in code
**Responsibilities:**
- Export status arrays for each entity type
**Should NOT contain:**
- Logic
- Status transition rules

## middleware/authMiddleware.js
**Purpose:** JWT token verification
**Why it exists:** Protects routes from unauthenticated access
**Responsibilities:**
- Extract token from Authorization header
- Verify token using JWT_SECRET
- Attach decoded user info to req.user
- Return 401 if token missing or invalid
**Should NOT contain:**
- Role checking
- Business logic
- Database queries

## middleware/roleMiddleware.js
**Purpose:** Role-based access control
**Why it exists:** Restricts routes to specific roles
**Responsibilities:**
- Read role_id from req.user (set by authMiddleware)
- Check if role_id is in allowed roles array
- Return 403 if not allowed
**Should NOT contain:**
- Token verification
- Business logic
- Database queries

## utils/responseHelper.js
**Purpose:** Standardized API response formatting
**Why it exists:** Prevents repeated response formatting code in every controller
**Responsibilities:**
- success(res, data, message, statusCode)
- created(res, data, message)
- error(res, message, statusCode)
- notFound(res, message)
- badRequest(res, message)
- unauthorized(res, message)
- forbidden(res, message)
**Should NOT contain:**
- Business logic
- Database queries
- Validation logic

## utils/dateHelper.js
**Purpose:** Date calculation utilities
**Why it exists:** Centralizes date math used across multiple services
**Responsibilities:**
- calculateExpiryDate(days) → adds days to today
- isExpired(date) → checks if date has passed
- formatDate(date) → ISO format string
- daysBetween(date1, date2) → number of days
**Should NOT contain:**
- Business logic
- Database queries

## validators/userValidator.js
**Purpose:** Input validation for user endpoints
**Why it exists:** Keeps validation out of controllers
**Responsibilities:**
- validateCreateUser(data) → returns errors array
- validateUpdateUser(data) → returns errors array
**Should NOT contain:**
- Database checks (those stay in controller/service)
- Business logic
- Response formatting

## validators/donorValidator.js
**Purpose:** Input validation for donor endpoints
**Responsibilities:**
- validateCreateDonor(data) → returns errors array
- validateUpdateDonor(data) → returns errors array
**Should NOT contain:**
- Database checks
- Business logic

## validators/screeningValidator.js
**Purpose:** Input validation for screening endpoints
**Responsibilities:**
- validateCreateScreening(data) → returns errors array
- validateUpdateScreening(data) → returns errors array
**Should NOT contain:**
- Database checks
- Business logic

## validators/bloodCollectionValidator.js
**Purpose:** Input validation for blood collection endpoints
**Responsibilities:**
- validateCreateCollection(data) → returns errors array
- validateUpdateCollectionStatus(data) → returns errors array
**Should NOT contain:**
- Database checks
- Business logic

## app/models/roleModel.js
**Purpose:** Database queries for roles table
**Responsibilities:** getAllRoles, getRoleById, createRole, updateRole, deleteRole
**Should NOT contain:** Validation, business logic, response formatting

## app/models/branchModel.js
**Purpose:** Database queries for branches table
**Responsibilities:** getAllBranches, getBranchById, createBranch, updateBranch, deleteBranch
**Should NOT contain:** Validation, business logic, response formatting

## app/models/hospitalModel.js
**Purpose:** Database queries for hospitals table
**Responsibilities:** getAllHospitals, getHospitalById, createHospital, updateHospital, deleteHospital
**Should NOT contain:** Validation, business logic, response formatting

## app/models/userModel.js
**Purpose:** Database queries for users table
**Responsibilities:** getAllUsers, getUserById, getUserByEmail, createUser, updateUser, updateLastLogin, deleteUser
**Should NOT contain:** Password hashing, token generation, business logic

## app/models/donorModel.js
**Purpose:** Database queries for donors table
**Responsibilities:** getAllDonors, getDonorById, searchDonors, createDonor, updateDonor, deleteDonor
**Should NOT contain:** Business logic, validation

## app/models/interviewQuestionModel.js
**Purpose:** Database queries for donor_interview_questions table
**Responsibilities:** getAllQuestions, getQuestionsByGender, getQuestionById, updateQuestion
**Should NOT contain:** Business logic

## app/models/screeningModel.js
**Purpose:** Database queries for screening table
**Responsibilities:** getAllScreenings, getScreeningById, getScreeningsByDonor, createScreening, updateScreening
**Should NOT contain:** Business logic, donor checks

## app/models/interviewAnswerModel.js
**Purpose:** Database queries for donor_interview_answers table
**Responsibilities:** getAnswersByScreening, submitAnswers
**Should NOT contain:** Deferral logic, screening updates (those are in interviewService)

## app/models/deferralModel.js
**Purpose:** Database queries for donor_deferrals table
**Responsibilities:** getDeferralsByDonor, getDeferralsByScreening, createDeferral, createMultipleDeferrals, checkActiveDeferral
**Should NOT contain:** Business logic

## app/models/donationModel.js
**Purpose:** Database queries for donations table
**Responsibilities:** getAllDonations, getDonationById, getDonationsByDonor, createDonation, updateDonation
**Should NOT contain:** Screening checks, deferral checks (those are in donationService)

## app/models/bloodCollectionModel.js
**Purpose:** Database queries for blood_collections table
**Responsibilities:** getAllCollections, getCollectionById, getCollectionsByBranch, createCollection, updateCollectionStatus, getExpiryDays
**Should NOT contain:** Blood unit creation (that is in bloodCollectionService)

## app/models/bloodUnitModel.js
**Purpose:** Database queries for blood_units table
**Responsibilities:** getAllUnits, getUnitById, getUnitsByBranch, getInventoryByBloodType, getInventoryAvailability, createUnit, updateUnitStatus
**Should NOT contain:** Business logic

## app/services/screeningService.js
**Purpose:** Business logic for screening operations
**Why it exists:** Screening touches donors + screening models
**Responsibilities:** createScreening (with donor check), updateScreening
**Should NOT contain:** Response formatting, input validation

## app/services/interviewService.js
**Purpose:** Business logic for interview answer submission
**Why it exists:** Submitting answers touches answers + deferrals + screening models + questions
**Responsibilities:** submitAnswers (with auto deferral detection and screening result update)
**Should NOT contain:** Response formatting, input validation

## app/services/bloodCollectionService.js
**Purpose:** Business logic for blood collection operations
**Why it exists:** Collection status change touches collections + blood units models
**Responsibilities:** createCollection, markAsSafe (auto creates blood unit), markAsRejected
**Should NOT contain:** Response formatting, input validation

## app/services/donationService.js
**Purpose:** Business logic for donation creation
**Why it exists:** Creating donation requires checking screening + deferral status
**Responsibilities:** createDonation (with screening eligibility check and deferral check)
**Should NOT contain:** Response formatting, input validation

## app/controllers/ (all controllers)
**Purpose:** Handle HTTP request and response cycle
**Responsibilities:**
- Call validator, check errors
- Call service or model
- Return response via responseHelper
**Should NOT contain:**
- SQL queries
- Business logic
- Direct model calls when service exists for that operation

## app/routes/ (all route files)
**Purpose:** Define API endpoints and apply middleware
**Responsibilities:**
- Define HTTP method and path
- Apply verifyToken middleware
- Apply checkRole middleware with ROLES constants
- Call controller function
**Should NOT contain:**
- Logic
- Validation
- Direct database calls