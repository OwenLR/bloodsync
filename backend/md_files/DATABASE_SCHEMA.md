# BloodSync Database Schema

## Database
- Platform: Neon PostgreSQL
- Version: PostgreSQL 17
- SSL: required (rejectUnauthorized: false — acceptable for dev)
- Connection: pg Pool via DATABASE_URL

## Tables (In Dependency Order)

### roles
```sql
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Data: Admin(1), PRC Staff(2), Donor(3), Requestor(4), Volunteer(5), Phlebotomist(6)

### branches
```sql
CREATE TABLE branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Data: Lipa(1), Nasugbu(2), Tanauan(3), Batangas City Main(4)

### hospitals
```sql
CREATE TABLE hospitals (
    hospital_id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Data: 71 hospitals from Batangas province

### users
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(role_id),
    branch_id INT REFERENCES branches(branch_id),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    login_attempts SMALLINT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: ALL user types in this table — Admin, PRC Staff, Requestor, Volunteer, Phlebotomist. No separate requestor table.
Status values: Active, Inactive, Pending, Declined

### volunteer_profiles
```sql
CREATE TABLE volunteer_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    birthdate DATE,
    sex VARCHAR(10),
    contact VARCHAR(20),
    address_street VARCHAR(100),
    address_brgy VARCHAR(100),
    address_municipality VARCHAR(100),
    address_province VARCHAR(100) DEFAULT 'Batangas',
    zip_code VARCHAR(10),
    nationality VARCHAR(50) DEFAULT 'Filipino',
    education VARCHAR(50),
    occupation VARCHAR(100),
    id_type VARCHAR(50),
    id_number VARCHAR(50),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    profile_img VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
Note: Used for both Volunteers (role_id=5) and Phlebotomists (role_id=6). File named profileModel.js (renamed from staffProfileModel.js by developer).

### donors
```sql
CREATE TABLE donors (
    donor_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    suffix VARCHAR(10),
    birthdate DATE NOT NULL,
    sex VARCHAR(10) NOT NULL,
    blood_type VARCHAR(5),
    nationality VARCHAR(50) DEFAULT 'Filipino',
    religion VARCHAR(50),
    education VARCHAR(50),
    occupation VARCHAR(100),
    contact VARCHAR(20),
    email VARCHAR(100),
    address_no VARCHAR(30),
    address_street VARCHAR(100),
    address_brgy VARCHAR(100),
    address_municipality VARCHAR(100),
    address_province VARCHAR(100) DEFAULT 'Batangas',
    zip_code VARCHAR(10),
    national_id_type VARCHAR(50),
    national_id_number VARCHAR(50),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    branch_id INT REFERENCES branches(branch_id),
    status VARCHAR(20) DEFAULT 'Active',
    registered_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### donor_interview_questions
```sql
CREATE TABLE donor_interview_questions (
    question_id SERIAL PRIMARY KEY,
    question_number VARCHAR(10) NOT NULL UNIQUE,
    question_text TEXT NOT NULL,
    sex_filter VARCHAR(10) NOT NULL DEFAULT 'Both',
    defer_if VARCHAR(5) NOT NULL,
    deferral_reason VARCHAR(255),
    deferral_type VARCHAR(20),
    deferral_duration VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);
```
Data: 34 questions seeded. defer_if values are 'YES' or 'NO' (uppercase).

### donor_interviews
```sql
CREATE TABLE donor_interviews (
    interview_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    branch_id INT REFERENCES branches(branch_id),
    conducted_by INT REFERENCES users(user_id),
    interview_result VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```
interview_result values: NULL (not yet submitted), 'Passed', 'Failed'

### donor_interview_answers
```sql
CREATE TABLE donor_interview_answers (
    answer_id SERIAL PRIMARY KEY,
    interview_id INT NOT NULL REFERENCES donor_interviews(interview_id),
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    question_id INT NOT NULL REFERENCES donor_interview_questions(question_id),
    answer VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: References interview_id NOT screening_id. This was a major architectural fix.

### donor_deferrals
```sql
CREATE TABLE donor_deferrals (
    deferral_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    interview_id INT REFERENCES donor_interviews(interview_id),
    question_id INT REFERENCES donor_interview_questions(question_id),
    deferral_reason VARCHAR(255),
    deferral_type VARCHAR(20),
    deferral_until DATE,
    deferred_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: References interview_id NOT screening_id. Fixed from original schema.

### screening
```sql
CREATE TABLE screening (
    screening_id SERIAL PRIMARY KEY,
    interview_id INT NOT NULL REFERENCES donor_interviews(interview_id),
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    branch_id INT REFERENCES branches(branch_id),
    screened_by INT REFERENCES users(user_id),
    weight DECIMAL(5,2),
    blood_pressure VARCHAR(20),
    pulse_rate INT,
    temperature DECIMAL(4,1),
    hemoglobin DECIMAL(4,2),
    blood_type_confirmed VARCHAR(5),
    hemoglobin_status VARCHAR(20),
    screening_result VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: Now references interview_id. Screening can only be created after interview Passed.
donor_id and branch_id are auto-filled from interview record by screeningService.

### component_expiry_days
```sql
CREATE TABLE component_expiry_days (
    expiry_id SERIAL PRIMARY KEY,
    component VARCHAR(100) NOT NULL UNIQUE,
    expiry_days INT NOT NULL,
    updated_by INT REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
Data: Whole Blood(35), Packed Red Blood Cells(35), Fresh Frozen Plasma(365), Platelets(5)
Note: Cryoprecipitate intentionally removed. Do not add it back.

### donations
```sql
CREATE TABLE donations (
    donation_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    screening_id INT NOT NULL REFERENCES screening(screening_id),
    branch_id INT REFERENCES branches(branch_id),
    extracted_by INT REFERENCES users(user_id),
    extraction_date TIMESTAMP DEFAULT NOW(),
    blood_volume_ml INT DEFAULT 450,
    extraction_time_minutes INT,
    reaction_notes TEXT,
    is_qns BOOLEAN DEFAULT false,
    qns_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: donor_id and branch_id are auto-filled from screening record by donationService. Frontend only sends screening_id.

### blood_collections
```sql
CREATE TABLE blood_collections (
    collection_id SERIAL PRIMARY KEY,
    donation_id INT NOT NULL REFERENCES donations(donation_id),
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    branch_id INT REFERENCES branches(branch_id),
    collected_by INT REFERENCES users(user_id),
    blood_type VARCHAR(5),
    component VARCHAR(50) DEFAULT 'Whole Blood',
    volume_ml INT DEFAULT 450,
    barcode VARCHAR(100) UNIQUE,
    collection_date TIMESTAMP DEFAULT NOW(),
    expiration_date DATE,
    extraction_time_minutes INT,
    status VARCHAR(50) DEFAULT 'Pending',
    is_qns BOOLEAN DEFAULT false,
    qns_reason VARCHAR(255),
    approved_by INT REFERENCES users(user_id),
    approved_at TIMESTAMP,
    rejected_by INT REFERENCES users(user_id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: extraction_time_minutes added. If > 15 minutes, is_qns auto-set to true by bloodCollectionService.

### blood_units
```sql
CREATE TABLE blood_units (
    unit_id SERIAL PRIMARY KEY,
    collection_id INT NOT NULL REFERENCES blood_collections(collection_id),
    donation_id INT NOT NULL REFERENCES donations(donation_id),
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    branch_id INT REFERENCES branches(branch_id),
    blood_type VARCHAR(5) NOT NULL,
    component VARCHAR(50) NOT NULL DEFAULT 'Whole Blood',
    volume_ml INT DEFAULT 450,
    barcode VARCHAR(100) UNIQUE,
    collection_date TIMESTAMP,
    expiration_date DATE,
    status VARCHAR(50) DEFAULT 'Available',
    disposal_reason TEXT,
    withdrawal_reason TEXT,
    processed_by INT REFERENCES users(user_id),
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```
Auto-created when blood_collection marked Safe. Never created manually.

### blood_requests
```sql
CREATE TABLE blood_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    hospital_id INT NOT NULL REFERENCES hospitals(hospital_id),
    branch_id INT NOT NULL REFERENCES branches(branch_id),
    patient_name VARCHAR(100) NOT NULL,
    patient_age INT,
    diagnosis TEXT,
    urgency_level VARCHAR(10) NOT NULL DEFAULT 'Routine',
    request_form_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    denial_reason TEXT,
    reviewed_by INT REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
Note: user_id references users table — requestors are in users table with role_id=4.
urgency_level values: 'Routine', 'STAT'

### request_items
```sql
CREATE TABLE request_items (
    item_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES blood_requests(request_id),
    blood_type VARCHAR(5) NOT NULL,
    component VARCHAR(50) NOT NULL DEFAULT 'Whole Blood',
    units_requested INT NOT NULL DEFAULT 1,
    units_fulfilled INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### request_status_logs
```sql
CREATE TABLE request_status_logs (
    log_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES blood_requests(request_id),
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_type VARCHAR(20) NOT NULL,
    changed_by_id INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Note: changed_by_type is 'staff' or 'requestor'. changed_by_id references users.user_id for both — no FK constraint intentional since type determines context.

### reservations
```sql
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES blood_requests(request_id),
    item_id INT NOT NULL REFERENCES request_items(item_id),
    unit_id INT NOT NULL REFERENCES blood_units(unit_id),
    status VARCHAR(50) DEFAULT 'Reserved',
    reserved_by INT REFERENCES users(user_id),
    reserved_at TIMESTAMP DEFAULT NOW(),
    released_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Role IDs (Fixed — Never Change)
1 = Admin
2 = PRC Staff
3 = Donor
4 = Requestor
5 = Volunteer
6 = Phlebotomist

## Valid Blood Types
A+, A-, B+, B-, AB+, AB-, O+, O-

## Valid Statuses

### Collection Statuses
Pending, Safe, Rejected, Disposed, Withdrawn

### Unit Statuses
Available, Reserved, Released, Disposed, Withdrawn, Expired

### Screening Results
Eligible, Deferred

### Hemoglobin Statuses
Allowed, Not Allowed

### Request Statuses
Pending, Approved, Released, Rejected

### Reservation Statuses
Reserved, Released, Cancelled

### Urgency Levels
Routine, STAT

### User Statuses
Active, Inactive, Pending, Declined

### Interview Results
Passed, Failed

### Changed By Types
staff, requestor