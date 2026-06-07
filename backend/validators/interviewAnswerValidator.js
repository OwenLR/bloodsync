/**
 * interviewAnswerValidator.js — Technical input validation for
 * interview answer submission.
 *
 * Note: uses object method style intentionally — kept consistent
 * with original to avoid breaking the controller call site.
 */

const interviewAnswerValidator = {
    /**
     * Validate the answer submission payload.
     * Answers reference interview_id (NOT screening_id — architectural fix).
     *
     * @param {{ interview_id, donor_id, answers }} data
     * @returns {string[]} Array of error messages
     */
    validateSubmit({ interview_id, donor_id, answers }) {
        const errors = [];

        if (!interview_id || isNaN(interview_id)) {
            errors.push('interview_id is required and must be a number');
        }
        if (!donor_id || isNaN(donor_id)) {
            errors.push('donor_id is required and must be a number');
        }
        if (!Array.isArray(answers) || answers.length === 0) {
            errors.push('answers must be a non-empty array');
        } else {
            answers.forEach((item, index) => {
                if (!item.question_id || isNaN(item.question_id)) {
                    errors.push(
                        `answers[${index}].question_id is required and must be a number`
                    );
                }
                if (!item.answer ||
                    !['YES', 'NO'].includes(item.answer.toUpperCase())) {
                    errors.push(
                        `answers[${index}].answer must be 'YES' or 'NO'`
                    );
                }
            });
        }

        return errors;
    },
};

module.exports = interviewAnswerValidator;