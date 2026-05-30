const pool = require('../../config/db');

const getDeferralsByDonor = async (donor_id) => {
    const result = await pool.query(
        `SELECT
            d.deferral_id,
            d.deferral_reason,
            d.deferral_type,
            d.deferral_until,
            d.created_at,
            q.question_number,
            q.question_text,
            u.first_name AS deferred_by_first,
            u.last_name AS deferred_by_last
         FROM donor_deferrals d
         LEFT JOIN donor_interview_questions q
            ON d.question_id = q.question_id
         LEFT JOIN users u ON d.deferred_by = u.user_id
         WHERE d.donor_id = $1
         ORDER BY d.created_at DESC`,
        [donor_id]
    );
    return result.rows;
};

const getDeferralsByScreening = async (screening_id) => {
    const result = await pool.query(
        `SELECT
            d.deferral_id,
            d.deferral_reason,
            d.deferral_type,
            d.deferral_until,
            d.created_at,
            q.question_number,
            q.question_text
         FROM donor_deferrals d
         LEFT JOIN donor_interview_questions q
            ON d.question_id = q.question_id
         WHERE d.screening_id = $1
         ORDER BY d.created_at DESC`,
        [screening_id]
    );
    return result.rows;
};

const createDeferral = async (data) => {
    const {
        donor_id, screening_id, question_id,
        deferral_reason, deferral_type,
        deferral_until, deferred_by
    } = data;

    const result = await pool.query(
        `INSERT INTO donor_deferrals (
            donor_id, screening_id, question_id,
            deferral_reason, deferral_type,
            deferral_until, deferred_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            donor_id, screening_id, question_id,
            deferral_reason, deferral_type,
            deferral_until, deferred_by
        ]
    );
    return result.rows[0];
};

const createMultipleDeferrals = async (deferrals) => {
    const created = [];
    for (const d of deferrals) {
        const result = await pool.query(
            `INSERT INTO donor_deferrals (
                donor_id, screening_id, question_id,
                deferral_reason, deferral_type, deferred_by
             ) VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                d.donor_id, d.screening_id, d.question_id,
                d.deferral_reason, d.deferral_type, d.deferred_by
            ]
        );
        created.push(result.rows[0]);
    }
    return created;
};

const checkActiveDeferral = async (donor_id) => {
    const result = await pool.query(
        `SELECT * FROM donor_deferrals
         WHERE donor_id = $1
         AND deferral_type = 'permanent'
         OR (
            donor_id = $1
            AND deferral_type = 'temporary'
            AND deferral_until > NOW()
         )
         ORDER BY created_at DESC
         LIMIT 1`,
        [donor_id]
    );
    return result.rows[0];
};

module.exports = {
    getDeferralsByDonor,
    getDeferralsByScreening,
    createDeferral,
    createMultipleDeferrals,
    checkActiveDeferral
};