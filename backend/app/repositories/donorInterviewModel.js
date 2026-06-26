/**
 * donorInterviewModel.js — SQL queries for donor_interviews table.
 * drive_id added to all queries — nullable for walk-in (non-drive) interviews.
 */

const pool = require('../../config/db');

const getAllInterviews = async (drive_id = null) => {
    const baseQuery = `SELECT
            di.interview_id,
            di.interview_result,
            di.drive_id,
            di.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name  AS conducted_by_first,
            u.last_name   AS conducted_by_last,
            bd.name       AS drive_name
         FROM donor_interviews di
         JOIN donors d         ON di.donor_id    = d.donor_id
         LEFT JOIN branches b  ON di.branch_id   = b.branch_id
         LEFT JOIN users u     ON di.conducted_by = u.user_id
         LEFT JOIN blood_drives bd ON di.drive_id = bd.drive_id`;

    if (drive_id === null) {
        const result = await pool.query(`${baseQuery}
         ORDER BY di.created_at DESC`);
        return result.rows;
    }

    const result = await pool.query(`${baseQuery}
         WHERE di.drive_id = $1
         ORDER BY di.created_at DESC`,
        [drive_id]
    );
    return result.rows;
};

const getInterviewById = async (id, drive_id = null) => {
    const baseQuery = `SELECT
            di.interview_id,
            di.interview_result,
            di.donor_id,
            di.branch_id,
            di.conducted_by,
            di.drive_id,
            di.created_at,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name  AS conducted_by_first,
            u.last_name   AS conducted_by_last,
            bd.name       AS drive_name
         FROM donor_interviews di
         JOIN donors d         ON di.donor_id    = d.donor_id
         LEFT JOIN branches b  ON di.branch_id   = b.branch_id
         LEFT JOIN users u     ON di.conducted_by = u.user_id
         LEFT JOIN blood_drives bd ON di.drive_id = bd.drive_id
         WHERE di.interview_id = $1`;

    if (drive_id === null) {
        const result = await pool.query(baseQuery, [id]);
        return result.rows[0];
    }

    const result = await pool.query(`${baseQuery}
         AND di.drive_id = $2`, [id, drive_id]);
    return result.rows[0];
};

const getInterviewsByDonor = async (donor_id, drive_id = null) => {
    const baseQuery = `SELECT
            di.interview_id,
            di.interview_result,
            di.drive_id,
            di.created_at,
            b.branch_name,
            u.first_name  AS conducted_by_first,
            u.last_name   AS conducted_by_last,
            bd.name       AS drive_name
         FROM donor_interviews di
         LEFT JOIN branches b  ON di.branch_id   = b.branch_id
         LEFT JOIN users u     ON di.conducted_by = u.user_id
         LEFT JOIN blood_drives bd ON di.drive_id = bd.drive_id
         WHERE di.donor_id = $1`;

    if (drive_id === null) {
        const result = await pool.query(`${baseQuery}
         ORDER BY di.created_at DESC`, [donor_id]);
        return result.rows;
    }

    const result = await pool.query(`${baseQuery}
         AND di.drive_id = $2
         ORDER BY di.created_at DESC`,
        [donor_id, drive_id]
    );
    return result.rows;
};

const getInterviewByDonorAndDrive = async (donor_id, drive_id = null) => {
    const baseQuery = `SELECT
            di.interview_id,
            di.interview_result,
            di.drive_id,
            di.created_at,
            di.donor_id,
            di.branch_id,
            di.conducted_by,
            b.branch_name,
            u.first_name  AS conducted_by_first,
            u.last_name   AS conducted_by_last,
            bd.name       AS drive_name
         FROM donor_interviews di
         LEFT JOIN branches b  ON di.branch_id   = b.branch_id
         LEFT JOIN users u     ON di.conducted_by = u.user_id
         LEFT JOIN blood_drives bd ON di.drive_id = bd.drive_id
         WHERE di.donor_id = $1`;

    if (drive_id === null) {
        const result = await pool.query(`${baseQuery}
         AND di.drive_id IS NULL
         ORDER BY di.created_at DESC
         LIMIT 1`, [donor_id]);
        return result.rows[0];
    }

    const result = await pool.query(`${baseQuery}
         AND di.drive_id = $2
         ORDER BY di.created_at DESC
         LIMIT 1`, [donor_id, drive_id]);
    return result.rows[0];
};

/**
 * Create a new interview session.
 * drive_id is nullable — null means walk-in (Admin/Staff outside a drive).
 * When called from a blood drive context, drive_id is passed from req.drive_id
 * which is set by bloodDriveMiddleware.
 */
const createInterview = async (data) => {
    const { donor_id, branch_id, conducted_by, drive_id } = data;
    const result = await pool.query(
        `INSERT INTO donor_interviews
            (donor_id, branch_id, conducted_by, drive_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [donor_id, branch_id, conducted_by, drive_id || null]
    );
    return result.rows[0];
};

const updateInterviewResult = async (interview_id, interview_result) => {
    const result = await pool.query(
        `UPDATE donor_interviews
         SET interview_result = $1
         WHERE interview_id = $2
         RETURNING *`,
        [interview_result, interview_id]
    );
    return result.rows[0];
};

module.exports = {
    getAllInterviews,
    getInterviewById,
    getInterviewsByDonor,
    getInterviewByDonorAndDrive,
    createInterview,
    updateInterviewResult,
};