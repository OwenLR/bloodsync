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

// FIXED this session: previously only profile_img/latitude/longitude had
// `|| null` fallbacks — every other field (address_*, nationality,
// education, occupation, id_type, id_number, emergency_contact_name) was
// passed to pool.query() as-is. When the frontend doesn't send one of
// these (which it currently doesn't — see registrationValidator.js's
// validateRegistration, which never required them), node-postgres throws
// "Undefined values are not allowed" as a client-side binding error before
// the query even reaches the DB — a hard 500-shaped crash, not a clean 400.
// All optional fields now default to null explicitly, same pattern the
// three fixed fields already used.
//
// id_number specifically: forced to null regardless of what's passed in.
// The Government/National ID input has been removed from the
// Volunteer/Phlebotomist registration form for now (see
// fieldRegistrationUI.js/fieldRole.html for the removal note) — pending a
// decision on how this field is actually verified/used. Re-enable by
// removing the `null &&` short-circuit below once that's decided.
const createProfile = async (userId, data) => {
    const {
        birthdate, sex, contact,
        address_street, address_brgy, address_municipality,
        address_province, zip_code, nationality,
        education, occupation,
        id_type, /* id_number intentionally ignored — see comment above */
        emergency_contact_name, emergency_contact_phone,
        profile_img,
        latitude, longitude,
    } = data;

    const result = await pool.query(
        `INSERT INTO volunteer_profiles (
            user_id, birthdate, sex, contact,
            address_street, address_brgy, address_municipality,
            address_province, zip_code, nationality,
            education, occupation,
            id_type, id_number,
            emergency_contact_name, emergency_contact_phone,
            profile_img,
            latitude, longitude
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19
         ) RETURNING *`,
        [
            userId,
            birthdate || null,
            sex || null,
            contact || null,
            address_street || null,
            address_brgy || null,
            address_municipality || null,
            address_province || null,
            zip_code || null,
            nationality || null,
            education || null,
            occupation || null,
            id_type || null,
            null, // id_number — forced null, see comment above
            emergency_contact_name || null,
            emergency_contact_phone || null,
            profile_img || null,
            latitude || null,
            longitude || null,
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
        profile_img,
        latitude, longitude,
    } = data;

    // NOTE: updateProfile() already uses COALESCE($n, column) throughout,
    // so undefined values here just mean "don't change this column" —
    // this function was never affected by the createProfile bug above.
    // id_number left untouched (not forced null) since this is the existing
    // self-profile-edit path (PATCH /api/volunteers/me/profile), unrelated
    // to the registration-form removal.
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
            latitude                 = COALESCE($17, latitude),
            longitude                = COALESCE($18, longitude),
            updated_at               = NOW()
         WHERE user_id = $19
         RETURNING *`,
        [
            birthdate, sex, contact,
            address_street, address_brgy, address_municipality,
            address_province, zip_code, nationality,
            education, occupation,
            id_type, id_number,
            emergency_contact_name, emergency_contact_phone,
            profile_img, latitude, longitude,
            userId,
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

const getVolunteersWithCoords = async (roleId = null, excludeUserIds = []) => {
    const result = await pool.query(
        `SELECT
            vp.user_id,
            vp.latitude,
            vp.longitude,
            vp.contact,
            vp.address_municipality,
            vp.address_province,
            vp.profile_img,
            u.first_name,
            u.last_name,
            u.email,
            r.role_id,
            r.role_name
         FROM volunteer_profiles vp
         JOIN users u ON vp.user_id = u.user_id
         JOIN roles r ON u.role_id  = r.role_id
         WHERE u.is_active  = true
           AND u.status     = 'Active'
           AND r.role_id    IN (5, 6)
           AND vp.latitude  IS NOT NULL
           AND vp.longitude IS NOT NULL
           AND ($1::INT IS NULL OR r.role_id = $1)
           AND (
               array_length($2::int[], 1) IS NULL
               OR vp.user_id != ALL($2::int[])
           )
         ORDER BY u.last_name ASC, u.first_name ASC`,
        [roleId || null, excludeUserIds]
    );
    return result.rows;
};

module.exports = {
    getProfileByUserId,
    getAllProfiles,
    getAvailableVolunteers,
    getVolunteersWithCoords,
    createProfile,
    updateProfile,
    deleteProfileByUserId,
};