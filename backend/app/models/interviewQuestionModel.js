const pool = require('../../config/db');

const getAllQuestions = async () => {
    const result = await pool.query(
        `SELECT * FROM donor_interview_questions
         WHERE is_active = true
         ORDER BY sort_order ASC`
    );
    return result.rows;
};

const getQuestionsByGender = async (sex) => {
    const result = await pool.query(
        `SELECT * FROM donor_interview_questions
         WHERE is_active = true
         AND (sex_filter = 'Both' 
         OR LOWER(sex_filter) = LOWER($1))
         ORDER BY sort_order ASC`,
        [sex]
    );
    return result.rows;
};

const getQuestionById = async (id) => {
    const result = await pool.query(
        'SELECT * FROM donor_interview_questions WHERE question_id = $1',
        [id]
    );
    return result.rows[0];
};

const updateQuestion = async (id, data) => {
    const { question_text, is_active, deferral_reason, deferral_type, deferral_duration } = data;
    const result = await pool.query(
        `UPDATE donor_interview_questions SET
            question_text = COALESCE($1, question_text),
            is_active = COALESCE($2, is_active),
            deferral_reason = COALESCE($3, deferral_reason),
            deferral_type = COALESCE($4, deferral_type),
            deferral_duration = COALESCE($5, deferral_duration)
         WHERE question_id = $6
         RETURNING *`,
        [question_text, is_active, deferral_reason, deferral_type, deferral_duration, id]
    );
    return result.rows[0];
};

module.exports = {
    getAllQuestions,
    getQuestionsByGender,
    getQuestionById,
    updateQuestion
};