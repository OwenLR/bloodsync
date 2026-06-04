const pool = require('../../config/db');

const getAnswersByInterview = async (interview_id) => {
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
         WHERE a.interview_id = $1
         ORDER BY q.sort_order ASC`,
        [interview_id]
    );
    return result.rows;
};

const submitAnswers = async (answers) => {
    const insertedAnswers = [];
    for (const ans of answers) {
        const result = await pool.query(
            `INSERT INTO donor_interview_answers
                (interview_id, donor_id, question_id, answer)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [ans.interview_id, ans.donor_id,
             ans.question_id, ans.answer]
        );
        insertedAnswers.push(result.rows[0]);
    }
    return insertedAnswers;
};

module.exports = {
    getAnswersByInterview,
    submitAnswers,
};