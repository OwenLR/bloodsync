# BloodSync Database Schema

## Database
- Platform: Neon PostgreSQL
- Version: PostgreSQL 17
- Database name: bloodsync (or as configured in Neon)

## Tables Created (In Order)

### Foundation Tables

#### roles
```sql
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Data: Admin(1), PRC Staff(2), Donor(3), Requestor(4), Volunteer(5), Phlebotomist(6)

#### branches
```sql
CREATE TABLE branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Data: Lipa(1), Nasugbu(2), Tanauan(3), Batangas City Main(4)

#### hospitals
```sql
CREATE TABLE hospitals (
    hospital_id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```
Data: 71 hospitals from Batangas province inserted

#### users
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
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Donor Tables

#### donors
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

#### donor_interview_questions
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
Data: 34 questions inserted

### Screening Tables

#### screening
```sql
CREATE TABLE screening (
    screening_id SERIAL PRIMARY KEY,
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

#### donor_interview_answers
```sql
CREATE TABLE donor_interview_answers (
    answer_id SERIAL PRIMARY KEY,
    screening_id INT NOT NULL REFERENCES screening(screening_id),
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    question_id INT NOT NULL REFERENCES donor_interview_questions(question_id),
    answer VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### donor_deferrals
```sql
CREATE TABLE donor_deferrals (
    deferral_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    screening_id INT REFERENCES screening(screening_id),
    question_id INT REFERENCES donor_interview_questions(question_id),
    deferral_reason VARCHAR(255),
    deferral_type VARCHAR(20),
    deferral_until DATE,
    deferred_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Blood Collection Tables

#### donations
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

#### component_expiry_days
```sql
CREATE TABLE component_expiry_days (
    expiry_id SERIAL PRIMARY KEY,
    component VARCHAR(100) NOT NULL UNIQUE,
    expiry_days INT NOT NULL,
    updated_by INT REFERENCES users(user_id),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
Data:
- Whole Blood: 35 days
- Packed Red Blood Cells: 35 days
- Fresh Frozen Plasma: 365 days
- Platelets: 5 days
(Note: Cryoprecipitate was removed by developer)

#### blood_collections
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

#### blood_units
```sql
CREATE TABLE blood_units (
    unit_id SERIAL PRIMARY KEY,
    collection_id INT NOT NULL
        REFERENCES blood_collections(collection_id),
    donation_id INT NOT NULL
        REFERENCES donations(donation_id),
    donor_id INT NOT NULL
        REFERENCES donors(donor_id),
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

### Blood Request Tables (TO BE CREATED)

#### requestors (PENDING)
#### blood_requests (PENDING)
#### request_items (PENDING)
#### request_status_logs (PENDING)
#### reservations (PENDING)

## Role IDs (Fixed, Never Change)
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

## Key Relationships
users → roles (role_id)
users → branches (branch_id)
donors → branches (branch_id)
donors → users (registered_by)
screening → donors (donor_id)
screening → branches (branch_id)
screening → users (screened_by)
donor_interview_answers → screening (screening_id)
donor_interview_answers → donors (donor_id)
donor_interview_answers → donor_interview_questions (question_id)
donor_deferrals → donors (donor_id)
donor_deferrals → screening (screening_id)
donor_deferrals → donor_interview_questions (question_id)
donations → donors (donor_id)
donations → screening (screening_id)
donations → branches (branch_id)
blood_collections → donations (donation_id)
blood_collections → donors (donor_id)
blood_collections → branches (branch_id)
blood_units → blood_collections (collection_id)
blood_units → donations (donation_id)
blood_units → donors (donor_id)
blood_units → branches (branch_id)