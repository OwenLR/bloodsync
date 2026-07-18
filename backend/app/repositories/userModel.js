const pool = require('../../config/db');

const getAllUsers = async (status = null) => {
    const result = await pool.query(
        `SELECT 
            u.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.status,
            u.is_active,
            u.last_login,
            u.created_at,
            r.role_name,
            r.role_id,
            b.branch_name,
            b.branch_id
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         LEFT JOIN branches b ON u.branch_id = b.branch_id
         WHERE ($1::VARCHAR IS NULL OR u.status = $1)
         ORDER BY u.user_id ASC`,
        [status]
    );
    return result.rows;
};

const getUserById = async (id) => {
    const result = await pool.query(
        `SELECT 
            u.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.status,
            u.is_active,
            u.last_login,
            u.created_at,
            r.role_name,
            r.role_id,
            b.branch_name,
            b.branch_id
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         LEFT JOIN branches b ON u.branch_id = b.branch_id
         WHERE u.user_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getUserByEmail = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );
    return result.rows[0];
};

const createUser = async (first_name, last_name, email, password, role_id, branch_id) => {
    const result = await pool.query(
        `INSERT INTO users 
            (first_name, last_name, email, password, role_id, branch_id, status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 'Active', true) 
         RETURNING user_id, first_name, last_name, email, role_id, branch_id, status, created_at`,
        [first_name, last_name, email, password, role_id, branch_id]
    );
    return result.rows[0];
};

// Used by volunteer/phlebotomist self-registration
// status = Pending, is_active = false by default from DB
const createPendingUser = async (first_name, last_name, email, password, role_id) => {
    const result = await pool.query(
        `INSERT INTO users
            (first_name, last_name, email, password, role_id, status, is_active)
         VALUES ($1, $2, $3, $4, $5, 'Pending', false)
         RETURNING user_id, first_name, last_name, email, role_id, status, is_active, created_at`,
        [first_name, last_name, email, password, role_id]
    );
    return result.rows[0];
};

const updateUser = async (id, fields) => {
    const { first_name, last_name, email, role_id, branch_id, status, is_active } = fields;
    const result = await pool.query(
        `UPDATE users SET
            first_name = COALESCE($1, first_name),
            last_name  = COALESCE($2, last_name),
            email      = COALESCE($3, email),
            role_id    = COALESCE($4, role_id),
            branch_id  = COALESCE($5, branch_id),
            status     = COALESCE($6, status),
            is_active  = COALESCE($7, is_active)
         WHERE user_id = $8
         RETURNING user_id, first_name, last_name, email, role_id, branch_id, status, is_active`,
        [first_name, last_name, email, role_id, branch_id, status, is_active, id]
    );
    return result.rows[0];
};

const updateLastLogin = async (id) => {
    await pool.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [id]
    );
};

// Used by userService.changeOwnPassword — needs the password hash to verify
// current_password, which getUserById intentionally excludes from its SELECT.
const getUserCredentialsById = async (id) => {
    const result = await pool.query(
        'SELECT user_id, password FROM users WHERE user_id = $1',
        [id]
    );
    return result.rows[0];
};

// Used by PATCH /api/users/me/password — self-service password change
// Caller (userService) handles bcrypt hashing before calling this
const updatePassword = async (id, hashedPassword) => {
    const result = await pool.query(
        `UPDATE users SET password = $1 WHERE user_id = $2
         RETURNING user_id`,
        [hashedPassword, id]
    );
    return result.rows[0];
};

const deleteUser = async (id) => {
    const result = await pool.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

// ─── staff_profiles (Admin + PRC Staff profile_img — see volunteer_profiles
//     for the equivalent table covering Volunteer/Phlebotomist roles) ───────

const getStaffProfileByUserId = async (userId) => {
    const result = await pool.query(
        'SELECT profile_id, user_id, profile_img FROM staff_profiles WHERE user_id = $1',
        [userId]
    );
    return result.rows[0];
};

// Upsert — staff_profiles row may not exist yet for a given user
const upsertStaffProfileImg = async (userId, profileImgUrl) => {
    const result = await pool.query(
        `INSERT INTO staff_profiles (user_id, profile_img)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET profile_img = $2, updated_at = NOW()
         RETURNING profile_id, user_id, profile_img`,
        [userId, profileImgUrl]
    );
    return result.rows[0];
};

module.exports = {
    getAllUsers,
    getUserById,
    getUserByEmail,
    getUserCredentialsById,
    createUser,
    createPendingUser,
    updateUser,
    updateLastLogin,
    updatePassword,
    deleteUser,
    getStaffProfileByUserId,
    upsertStaffProfileImg,
};