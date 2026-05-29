const pool = require('../../config/db');

const getAllDonors = async () => {
    const result = await pool.query(
        `SELECT
            d.donor_id,
            d.first_name,
            d.middle_name,
            d.last_name,
            d.suffix,
            d.birthdate,
            d.sex,
            d.blood_type,
            d.nationality,
            d.religion,
            d.education,
            d.occupation,
            d.contact,
            d.email,
            d.address_no,
            d.address_street,
            d.address_brgy,
            d.address_municipality,
            d.address_province,
            d.zip_code,
            d.national_id_type,
            d.national_id_number,
            d.emergency_contact_name,
            d.emergency_contact_phone,
            d.status,
            d.created_at,
            b.branch_name,
            u.first_name AS registered_by_first,
            u.last_name AS registered_by_last
         FROM donors d
         LEFT JOIN branches b ON d.branch_id = b.branch_id
         LEFT JOIN users u ON d.registered_by = u.user_id
         ORDER BY d.donor_id ASC`
    );
    return result.rows;
};

const getDonorById = async (id) => {
    const result = await pool.query(
        `SELECT
            d.donor_id,
            d.first_name,
            d.middle_name,
            d.last_name,
            d.suffix,
            d.birthdate,
            d.sex,
            d.blood_type,
            d.nationality,
            d.religion,
            d.education,
            d.occupation,
            d.contact,
            d.email,
            d.address_no,
            d.address_street,
            d.address_brgy,
            d.address_municipality,
            d.address_province,
            d.zip_code,
            d.national_id_type,
            d.national_id_number,
            d.emergency_contact_name,
            d.emergency_contact_phone,
            d.status,
            d.created_at,
            b.branch_name,
            u.first_name AS registered_by_first,
            u.last_name AS registered_by_last
         FROM donors d
         LEFT JOIN branches b ON d.branch_id = b.branch_id
         LEFT JOIN users u ON d.registered_by = u.user_id
         WHERE d.donor_id = $1`,
        [id]
    );
    return result.rows[0];
};

const searchDonors = async (keyword) => {
    const result = await pool.query(
        `SELECT
            donor_id,
            first_name,
            middle_name,
            last_name,
            suffix,
            blood_type,
            contact,
            email,
            status
         FROM donors
         WHERE
            LOWER(first_name) LIKE LOWER($1) OR
            LOWER(last_name) LIKE LOWER($1) OR
            LOWER(contact) LIKE LOWER($1) OR
            LOWER(email) LIKE LOWER($1)
         ORDER BY last_name ASC`,
        [`%${keyword}%`]
    );
    return result.rows;
};

const createDonor = async (data) => {
    const {
        first_name, middle_name, last_name, suffix,
        birthdate, sex, blood_type, nationality,
        religion, education, occupation,
        contact, email,
        address_no, address_street, address_brgy,
        address_municipality, address_province, zip_code,
        national_id_type, national_id_number,
        emergency_contact_name, emergency_contact_phone,
        branch_id, registered_by
    } = data;

    const result = await pool.query(
        `INSERT INTO donors (
            first_name, middle_name, last_name, suffix,
            birthdate, sex, blood_type, nationality,
            religion, education, occupation,
            contact, email,
            address_no, address_street, address_brgy,
            address_municipality, address_province, zip_code,
            national_id_type, national_id_number,
            emergency_contact_name, emergency_contact_phone,
            branch_id, registered_by
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24, $25
         ) RETURNING *`,
        [
            first_name, middle_name, last_name, suffix,
            birthdate, sex, blood_type, nationality,
            religion, education, occupation,
            contact, email,
            address_no, address_street, address_brgy,
            address_municipality, address_province, zip_code,
            national_id_type, national_id_number,
            emergency_contact_name, emergency_contact_phone,
            branch_id, registered_by
        ]
    );
    return result.rows[0];
};

const updateDonor = async (id, data) => {
    const {
        first_name, middle_name, last_name, suffix,
        birthdate, sex, blood_type, nationality,
        religion, education, occupation,
        contact, email,
        address_no, address_street, address_brgy,
        address_municipality, address_province, zip_code,
        national_id_type, national_id_number,
        emergency_contact_name, emergency_contact_phone,
        branch_id, status
    } = data;

    const result = await pool.query(
        `UPDATE donors SET
            first_name = COALESCE($1, first_name),
            middle_name = COALESCE($2, middle_name),
            last_name = COALESCE($3, last_name),
            suffix = COALESCE($4, suffix),
            birthdate = COALESCE($5, birthdate),
            sex = COALESCE($6, sex),
            blood_type = COALESCE($7, blood_type),
            nationality = COALESCE($8, nationality),
            religion = COALESCE($9, religion),
            education = COALESCE($10, education),
            occupation = COALESCE($11, occupation),
            contact = COALESCE($12, contact),
            email = COALESCE($13, email),
            address_no = COALESCE($14, address_no),
            address_street = COALESCE($15, address_street),
            address_brgy = COALESCE($16, address_brgy),
            address_municipality = COALESCE($17, address_municipality),
            address_province = COALESCE($18, address_province),
            zip_code = COALESCE($19, zip_code),
            national_id_type = COALESCE($20, national_id_type),
            national_id_number = COALESCE($21, national_id_number),
            emergency_contact_name = COALESCE($22, emergency_contact_name),
            emergency_contact_phone = COALESCE($23, emergency_contact_phone),
            branch_id = COALESCE($24, branch_id),
            status = COALESCE($25, status),
            updated_at = NOW()
         WHERE donor_id = $26
         RETURNING *`,
        [
            first_name, middle_name, last_name, suffix,
            birthdate, sex, blood_type, nationality,
            religion, education, occupation,
            contact, email,
            address_no, address_street, address_brgy,
            address_municipality, address_province, zip_code,
            national_id_type, national_id_number,
            emergency_contact_name, emergency_contact_phone,
            branch_id, status, id
        ]
    );
    return result.rows[0];
};

const deleteDonor = async (id) => {
    const result = await pool.query(
        'DELETE FROM donors WHERE donor_id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

module.exports = {
    getAllDonors,
    getDonorById,
    searchDonors,
    createDonor,
    updateDonor,
    deleteDonor
};