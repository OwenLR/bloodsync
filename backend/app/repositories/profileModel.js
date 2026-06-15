const pool = require('../../config/db');

const getProfileByUserId = async (userId) => {
    const result = await pool.query(
        `SELECT vp.*, u.first_name, u.last_name, u.email,
                u.status, u.is_active, r.role_name, r.role_id
         FROM volunteer_profiles vp
         JOIN users u ON vp.user_id = u.user_id
         JOIN roles r ON u.role_id = r.role_id
         WHERE vp.user_id = $1`,
        [userId]
    );
    return result.rows[0];
};

const getAllProfiles = async (status = null) => {
    const result = await pool.query(
        `SELECT vp.*, u.first_name, u.last_name, u.email,
                u.status, u.is_active, r.role_name, r.role_id
         FROM volunteer_profiles vp
         JOIN users u ON vp.user_id = u.user_id
         JOIN roles r ON u.role_id = r.role_id
         WHERE ($1::VARCHAR IS NULL OR u.status = $1)
         ORDER BY vp.created_at DESC`,
        [status]
    );
    return result.rows;
};

const createProfile = async (userId, data) => {
    const {
        birthdate, sex, contact,
        address_street, address_brgy, address_municipality,
        address_province, zip_code, nationality,
        education, occupation,
        id_type, id_number,
        emergency_contact_name, emergency_contact_phone,
        profile_img
    } = data;

    const result = await pool.query(
        `INSERT INTO volunteer_profiles (
            user_id, birthdate, sex, contact,
            address_street, address_brgy, address_municipality,
            address_province, zip_code, nationality,
            education, occupation,
            id_type, id_number,
            emergency_contact_name, emergency_contact_phone,
            profile_img
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17
         ) RETURNING *`,
        [
            userId, birthdate, sex, contact,
            address_street, address_brgy, address_municipality,
            address_province, zip_code, nationality,
            education, occupation,
            id_type, id_number,
            emergency_contact_name, emergency_contact_phone,
            profile_img
        ]
    );
    return result.rows[0];
};

const updateProfile = async (userId, data) => {
    const {
        birthdate, sex, contact,
        address_street, address_brgy, address_municipality,
        address_province, zip_code, nationality,
        education, occupation,
        id_type, id_number,
        emergency_contact_name, emergency_contact_phone,
        profile_img
    } = data;

    const result = await pool.query(
        `UPDATE volunteer_profiles SET
            birthdate                = COALESCE($1,  birthdate),
            sex                      = COALESCE($2,  sex),
            contact                  = COALESCE($3,  contact),
            address_street           = COALESCE($4,  address_street),
            address_brgy             = COALESCE($5,  address_brgy),
            address_municipality     = COALESCE($6,  address_municipality),
            address_province         = COALESCE($7,  address_province),
            zip_code                 = COALESCE($8,  zip_code),
            nationality              = COALESCE($9,  nationality),
            education                = COALESCE($10, education),
            occupation               = COALESCE($11, occupation),
            id_type                  = COALESCE($12, id_type),
            id_number                = COALESCE($13, id_number),
            emergency_contact_name   = COALESCE($14, emergency_contact_name),
            emergency_contact_phone  = COALESCE($15, emergency_contact_phone),
            profile_img              = COALESCE($16, profile_img),
            updated_at               = NOW()
         WHERE user_id = $17
         RETURNING *`,
        [
            birthdate, sex, contact,
            address_street, address_brgy, address_municipality,
            address_province, zip_code, nationality,
            education, occupation,
            id_type, id_number,
            emergency_contact_name, emergency_contact_phone,
            profile_img, userId
        ]
    );
    return result.rows[0];
};

const getAvailableVolunteers = async (roleId = null, municipality = null) => {
    const result = await pool.query(
        `SELECT vp.user_id, vp.contact, vp.address_municipality, vp.address_province,
                vp.profile_img,
                u.first_name, u.last_name, u.email,
                r.role_id, r.role_name
         FROM volunteer_profiles vp
         JOIN users u ON vp.user_id = u.user_id
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.is_active = true
           AND u.status = 'Active'
           AND r.role_id IN (5, 6)
           AND ($1::INT IS NULL OR r.role_id = $1)
           AND ($2::VARCHAR IS NULL OR LOWER(vp.address_municipality) = LOWER($2))
         ORDER BY u.last_name ASC, u.first_name ASC`,
        [roleId || null, municipality || null]
    );
    return result.rows;
};

    const deleteProfileByUserId = async (userId) => {
        await pool.query(
            'DELETE FROM volunteer_profiles WHERE user_id = $1',
            [userId]
        );
    };

module.exports = {
    getProfileByUserId,
    getAllProfiles,
    getAvailableVolunteers,
    createProfile,
    updateProfile,
    deleteProfileByUserId,
};