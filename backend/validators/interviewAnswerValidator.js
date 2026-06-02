const interviewAnswerValidator = {
  // donor_interview_answers has no donation_id column — only screening_id, donor_id
  validateSubmit({ screening_id, donor_id, answers }) {
    const errors = [];

    if (!screening_id || isNaN(screening_id)) {
      errors.push('screening_id is required and must be a number');
    }
    if (!donor_id || isNaN(donor_id)) {
      errors.push('donor_id is required and must be a number');
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      errors.push('answers must be a non-empty array');
    } else {
      answers.forEach((item, index) => {
        if (!item.question_id || isNaN(item.question_id)) {
          errors.push(`answers[${index}].question_id is required and must be a number`);
        }
        if (!['YES', 'NO'].includes(item.answer)) {
          errors.push(`answers[${index}].answer must be 'YES' or 'NO'`);
        }
      });
    }

    return errors;
  },
};

module.exports = interviewAnswerValidator;