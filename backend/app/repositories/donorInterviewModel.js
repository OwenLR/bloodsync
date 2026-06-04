const pool = require('../../config/db');

const getAllInterviews = async () => {
    const result = await pool.query(
        `SELECT
            di.interview_id,
            di.interview_result,
            di.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name AS conducted_by_first,
            u.last_name AS conducted_by_last
         FROM donor_interviews di
         JOIN donors d ON di.donor_id = d.donor_id
         LEFT JOIN branches b ON di.branch_id = b.branch_id
         LEFT JOIN users u ON di.conducted_by = u.user_id
         ORDER BY di.created_at DESC`
    );
    return result.rows;
};

const getInterviewById = async (id) => {
    const result = await pool.query(
        `SELECT
            di.interview_id,
            di.interview_result,
            di.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            b.branch_id,
            u.first_name AS conducted_by_first,
            u.last_name AS conducted_by_last
         FROM donor_interviews di
         JOIN donors d ON di.donor_id = d.donor_id
         LEFT JOIN branches b ON di.branch_id = b.branch_id
         LEFT JOIN users u ON di.conducted_by = u.user_id
         WHERE di.interview_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getInterviewsByDonor = async (donor_id) => {
    const result = await pool.query(
        `SELECT
            di.interview_id,
            di.interview_result,
            di.created_at,
            b.branch_name,
            u.first_name AS conducted_by_first,
            u.last_name AS conducted_by_last
         FROM donor_interviews di
         LEFT JOIN branches b ON di.branch_id = b.branch_id
         LEFT JOIN users u ON di.conducted_by = u.user_id
         WHERE di.donor_id = $1
         ORDER BY di.created_at DESC`,
        [donor_id]
    );
    return result.rows;
};

const createInterview = async (data) => {
    const { donor_id, branch_id, conducted_by } = data;
    const result = await pool.query(
        `INSERT INTO donor_interviews
            (donor_id, branch_id, conducted_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [donor_id, branch_id, conducted_by]
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
    createInterview,
    updateInterviewResult,
};