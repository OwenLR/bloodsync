# BloodSync File Index

## server.js
Purpose: Application entry point
Responsibilities: Import instrument.js first, configure middleware, register routes, start server, GlitchTip error handler
Should NOT contain: Business logic, database queries, route handler functions

## instrument.js
Purpose: GlitchTip (Sentry-compatible) error tracking initialization
Why it exists: Must be required before ALL other modules to auto-instrument Express
Responsibilities: Sentry.init() with GlitchTip DSN, autoSessionTracking: false
Should NOT contain: Any application logic

## config/db.js
Purpose: PostgreSQL connection pool
Responsibilities: Create pg Pool, SSL config, pool error handling
Should NOT contain: Query logic, business logic

## config/cloudinary.js
Purpose: Cloudinary SDK configuration
Responsibilities: Configure cloudinary.v2 with env vars
Should NOT contain: Upload logic (that is in utils/uploadHelper.js)

## config/redis.js
Purpose: Upstash Redis client
Responsibilities: Create Redis instance with REST URL and token
Should NOT contain: Cache logic (that is in app/cache/)

## constants/roles.js
Purpose: Role ID constants
Responsibilities: Export ROLES object mapping role names to IDs

## constants/bloodTypes.js
Purpose: Valid blood type values array

## constants/statuses.js
Purpose: All valid status arrays for all entities
Exports: COLLECTION_STATUSES, UNIT_STATUSES, SCREENING_RESULTS, HEMOGLOBIN_STATUSES, DONOR_STATUSES, REQUEST_STATUSES, RESERVATION_STATUSES, URGENCY_LEVELS, CHANGED_BY_TYPES, USER_STATUSES

## constants/medicalRules.js
Purpose: Medical business rule thresholds
Responsibilities: HEMOGLOBIN (Male/Female min/max), EXTRACTION max duration
Why it exists: Clinical thresholds should be in one place, readable by any developer
Should NOT contain: Validation logic or functions

## middleware/authMiddleware.js
Purpose: JWT token verification for staff
Responsibilities: Extract Bearer token, verify JWT, attach decoded to req.user
Should NOT contain: Role checking, business logic

## middleware/roleMiddleware.js
Purpose: Role-based access control
Responsibilities: Read role_id from req.user, check against allowed roles array

## middleware/uploadMiddleware.js
Purpose: Multer file upload handling
Responsibilities: Memory storage, file type filter (JPEG/PNG/PDF), 5MB size limit

## utils/responseHelper.js
Purpose: Standardized API response formatting
Responsibilities: success, created, error (captures to GlitchTip on 500), notFound, badRequest, unauthorized, forbidden
Note: error() only sends to GlitchTip when statusCode === 500

## utils/dateHelper.js
Purpose: Date calculation utilities
Responsibilities: calculateExpiryDate, isExpired, formatDate, daysBetween

## utils/uploadHelper.js
Purpose: Cloudinary upload/delete operations
Responsibilities: uploadToCloudinary(buffer, folder), deleteFromCloudinary(publicId)
Folders used: 'profile_images', 'request_forms'

## app/cache/ (NEW — being created)
Purpose: Application caching logic
Will contain: cacheService.js (moved from middleware/cacheMiddleware.js)
Should NOT contain: Business logic

## app/domain/ (NEW — being created)
Purpose: Pure business rules independent of framework
Will contain:
- donorEligibility.js — hemoglobin check, deferral rules, age check, same-day deferral
- donationRules.js — extraction time, QNS rules
- bloodRequestRules.js — status transition rules
- bloodUnitRules.js — unit status transition rules
Should NOT contain: Database access, HTTP handling, framework dependencies

## app/repositories/ (renamed from app/models/)
Purpose: Database queries ONLY
Note: Although named repositories/, these files are the renamed models/ folder.
All files contain only SQL queries — they fulfill repository responsibilities.

### app/repositories/roleModel.js
Responsibilities: getAllRoles, getRoleById, createRole, updateRole, deleteRole

### app/repositories/branchModel.js
Responsibilities: getAllBranches, getBranchById, createBranch, updateBranch, deleteBranch

### app/repositories/hospitalModel.js
Responsibilities: getAllHospitals, getHospitalById, createHospital, updateHospital, deleteHospital

### app/repositories/userModel.js
Responsibilities: getAllUsers(status?), getUserById, getUserByEmail, createUser, createPendingUser, updateUser, updateLastLogin, deleteUser

### app/repositories/profileModel.js
Purpose: SQL queries for volunteer_profiles table
Used for both Volunteers (role_id=5) and Phlebotomists (role_id=6)
Responsibilities: getProfileByUserId, getAllProfiles(status?), createProfile, updateProfile, deleteProfileByUserId
Note: File was renamed from staffProfileModel.js → volunteerProfileModel.js → profileModel.js by developer preference

### app/repositories/donorModel.js
Responsibilities: getAllDonors, getDonorById, getDonorByNationalId, searchDonors, createDonor, updateDonor, deleteDonor

### app/repositories/donorInterviewModel.js
Responsibilities: getAllInterviews, getInterviewById, getInterviewsByDonor, createInterview, updateInterviewResult

### app/repositories/interviewQuestionModel.js
Responsibilities: getAllQuestions, getQuestionsByGender, getQuestionById, updateQuestion

### app/repositories/interviewAnswerModel.js
Responsibilities: getAnswersByInterview(interview_id), submitAnswers
Note: Uses interview_id NOT screening_id — changed from original design

### app/repositories/deferralModel.js
Responsibilities: getDeferralsByDonor, getDeferralsByInterview, createDeferral, createMultipleDeferrals, checkActiveDeferral, checkSameDayDeferral
Note: Uses interview_id NOT screening_id

### app/repositories/screeningModel.js
Responsibilities: getAllScreenings, getScreeningById, getScreeningsByDonor, getScreeningByInterviewId, createScreening, updateScreening
Note: Now includes interview_id in all queries and createScreening

### app/repositories/donationModel.js
Responsibilities: getAllDonations, getDonationById, getDonationsByDonor, createDonation, updateDonation

### app/repositories/bloodCollectionModel.js
Responsibilities: getAllCollections, getCollectionById, getCollectionsByBranch, createCollection, updateCollectionStatus, getExpiryDays

### app/repositories/bloodUnitModel.js
Responsibilities: getAllUnits, getUnitById, getUnitsByBranch, getInventoryByBloodType, getInventoryAvailability, createUnit, updateUnitStatus, getAvailableUnitsForAssignment

### app/repositories/bloodRequestModel.js
Responsibilities: getAllRequests, getRequestById, getRequestsByUser, createRequest, updateRequestStatus, createRequestItems, getItemsByRequest, updateItemFulfilled, createStatusLog, getStatusLogsByRequest, createReservation, getReservationsByRequest, updateReservationStatus

## app/services/
### app/services/authService.js (TO BE CREATED)
Purpose: Login business logic
Will handle: password comparison, is_active check, token generation, updateLastLogin

### app/services/userService.js (TO BE CREATED)
Purpose: User creation business logic
Will handle: email duplicate check, password hashing, createUser

### app/services/donorService.js (TO BE CREATED)
Purpose: Donor creation business logic
Will handle: national ID duplicate check, createDonor

### app/services/bloodUnitService.js (TO BE CREATED)
Purpose: Blood unit status management
Will handle: status validation, transition rules, existence check

### app/services/registrationService.js
Purpose: Volunteer/Phlebotomist registration with transaction
Responsibilities: register (create user + profile atomically), approveRegistration, declineRegistration
Note: Handles re-registration for Declined users

### app/services/interviewService.js
Purpose: Interview answer submission with auto-deferral
Responsibilities: submitAnswers (checks same-day deferral, submits answers, auto-creates deferrals, sets interview_result)

### app/services/screeningService.js
Purpose: Screening creation with interview pass check
Responsibilities: createScreening (verifies interview Passed, auto-fills donor_id/branch_id), updateScreening

### app/services/donationService.js
Purpose: Donation creation with full eligibility chain
Responsibilities: createDonation (verifies screening Eligible, hemoglobin check, deferral check, auto-fills from screening)

### app/services/bloodCollectionService.js
Purpose: Blood collection lifecycle
Responsibilities: createCollection (extraction time QNS check), markAsSafe (auto-creates blood_unit, blocks QNS), markAsRejected, updateStatus

### app/services/bloodRequestService.js
Purpose: Blood request lifecycle with auto-assignment
Responsibilities: createRequest, approveRequest (SELECT FOR UPDATE race condition fix, FEFO auto-assign), releaseRequest, rejectRequest, updateStatus

## validators/
### validators/userValidator.js
Exports: validateCreateUser, validateUpdateUser
Note: validateCreateUser restricts role_id to [1,2] — Admin/PRC Staff only

### validators/donorValidator.js
Exports: validateCreateDonor, validateUpdateDonor
Validates: sex (Male/Female), birthdate format/future, email format, blood type, contact (numbers only 7-15 digits)

### validators/registrationValidator.js
Exports: validateRegistration
Validates: required fields, email format, password min 8, sex, contact, birthdate, zip_code, id_number, emergency_contact_phone

### validators/donorInterviewValidator.js
Exports: validateCreateInterview
Validates: donor_id required/positive integer, branch_id required/positive integer

### validators/screeningValidator.js
Exports: validateCreateScreening, validateUpdateScreening
Note: interview_id required in createScreening
Validates: weight/hemoglobin positive numbers, pulse_rate positive integer, blood_pressure format (120/80)

### validators/bloodCollectionValidator.js
Exports: validateCreateCollection, validateUpdateCollectionStatus
Validates: blood_type, component against valid list, volume_ml positive integer

### validators/bloodRequestValidator.js
Exports: validateCreateRequest, validateUpdateRequestStatus
Note: validateCreateRequestor and validateLoginRequestor REMOVED (dead code — requestors now in users table)

### validators/interviewAnswerValidator.js
Exports: interviewAnswerValidator.validateSubmit (object method style)
Note: Uses object method style — called as interviewAnswerValidator.validateSubmit() in controller

### validators/branchValidator.js (TO BE CREATED)
### validators/hospitalValidator.js (TO BE CREATED)
### validators/interviewQuestionValidator.js (TO BE CREATED)
### validators/bloodUnitValidator.js (TO BE CREATED)