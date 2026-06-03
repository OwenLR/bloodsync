const pool = require('../../config/db');

const getAllRequestors = async () => {
    const result = await pool.query(
        `SELECT r.requestor_id, r.first_name, r.last_name, r.email,
                r.contact, r.hospital_id, h.hospital_name,
                r.profile_img, r.status, r.is_active,
                r.last_login, r.created_at
         FROM requestors r
         LEFT JOIN hospitals h ON r.hospital_id = h.hospital_id
         ORDER BY r.created_at DESC`
    );
    return result.rows;
};

const getRequestorById = async (id) => {
    const result = await pool.query(
        `SELECT r.requestor_id, r.first_name, r.last_name, r.email,
                r.contact, r.hospital_id, h.hospital_name,
                r.profile_img, r.status, r.is_active,
                r.last_login, r.login_attempts, r.locked_until,
                r.created_at
         FROM requestors r
         LEFT JOIN hospitals h ON r.hospital_id = h.hospital_id
         WHERE r.requestor_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getRequestorByEmail = async (email) => {
    const result = await pool.query(
        `SELECT * FROM requestors WHERE email = $1`,
        [email]
    );
    return result.rows[0];
};

const createRequestor = async (data) => {
    const {
        first_name, last_name, email, password,
        contact, hospital_id
    } = data;

    const result = await pool.query(
        `INSERT INTO requestors
            (first_name, last_name, email, password, contact, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING requestor_id, first_name, last_name, email,
                   contact, hospital_id, status, created_at`,
        [first_name, last_name, email, password, contact, hospital_id]
    );
    return result.rows[0];
};

const updateRequestor = async (id, data) => {
    const {
        first_name, last_name, contact,
        hospital_id, profile_img, status
    } = data;

    const result = await pool.query(
        `UPDATE requestors SET
            first_name   = COALESCE($1, first_name),
            last_name    = COALESCE($2, last_name),
            contact      = COALESCE($3, contact),
            hospital_id  = COALESCE($4, hospital_id),
            profile_img  = COALESCE($5, profile_img),
            status       = COALESCE($6, status)
         WHERE requestor_id = $7
         RETURNING requestor_id, first_name, last_name, email,
                   contact, hospital_id, profile_img, status, created_at`,
        [first_name, last_name, contact, hospital_id, profile_img, status, id]
    );
    return result.rows[0];
};

const updateLastLogin = async (id) => {
    await pool.query(
        `UPDATE requestors SET last_login = NOW() WHERE requestor_id = $1`,
        [id]
    );
};

const incrementLoginAttempts = async (id) => {
    await pool.query(
        `UPDATE requestors SET login_attempts = login_attempts + 1 WHERE requestor_id = $1`,
        [id]
    );
};

const lockRequestor = async (id, lockedUntil) => {
    await pool.query(
        `UPDATE requestors SET locked_until = $1 WHERE requestor_id = $2`,
        [lockedUntil, id]
    );
};

const resetLoginAttempts = async (id) => {
    await pool.query(
        `UPDATE requestors
         SET login_attempts = 0, locked_until = NULL
         WHERE requestor_id = $1`,
        [id]
    );
};

module.exports = {
    getAllRequestors,
    getRequestorById,
    getRequestorByEmail,
    createRequestor,
    updateRequestor,
    updateLastLogin,
    incrementLoginAttempts,
    lockRequestor,
    resetLoginAttempts,
};