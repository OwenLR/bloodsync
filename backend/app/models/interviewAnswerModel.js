const pool = require('../../config/db');

const getAnswersByScreening = async (screening_id) => {
    const result = await pool.query(
        `SELECT
            a.answer_id,
            a.answer,
            a.created_at,
            q.question_number,
            q.question_text,
            q.sex_filter,
            q.defer_if,
            q.deferral_reason,
            q.deferral_type
         FROM donor_interview_answers a
         JOIN donor_interview_questions q
            ON a.question_id = q.question_id
         WHERE a.screening_id = $1
         ORDER BY q.sort_order ASC`,
        [screening_id]
    );
    return result.rows;
};

const submitAnswers = async (answers) => {
    // answers = array of { screening_id, donor_id, question_id, answer }
    const insertedAnswers = [];

    for (const ans of answers) {
        const result = await pool.query(
            `INSERT INTO donor_interview_answers
                (screening_id, donor_id, question_id, answer)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [ans.screening_id, ans.donor_id, ans.question_id, ans.answer]
        );
        insertedAnswers.push(result.rows[0]);
    }

    return insertedAnswers;
};

const checkForDeferrals = async (screening_id) => {
    // Find answers that trigger deferral
    const result = await pool.query(
        `SELECT
            a.answer_id,
            a.donor_id,
            a.screening_id,
            a.question_id,
            a.answer,
            q.defer_if,
            q.deferral_reason,
            q.deferral_type,
            q.deferral_duration,
            q.question_text
         FROM donor_interview_answers a
         JOIN donor_interview_questions q
            ON a.question_id = q.question_id
         WHERE a.screening_id = $1
         AND a.answer = q.defer_if`,
        [screening_id]
    );
    return result.rows;
};

module.exports = {
    getAnswersByScreening,
    submitAnswers,
    checkForDeferrals
};