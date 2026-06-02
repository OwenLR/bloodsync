const interviewAnswerModel = require('../models/interviewAnswerModel');
const deferralModel = require('../models/deferralModel');
const screeningModel = require('../models/screeningModel');
const interviewQuestionModel = require('../models/interviewQuestionModel');

const submitAnswers = async (data, user_id) => {
    const { screening_id, donor_id, answers } = data;

    // Format answers
    const formattedAnswers = answers.map(ans => ({
        screening_id,
        donor_id,
        question_id: ans.question_id,
        answer: ans.answer.toUpperCase()
    }));

    // Submit all answers
    const submitted = await interviewAnswerModel
        .submitAnswers(formattedAnswers);

    // Check which answers trigger deferral
    const deferrals = [];

    for (const ans of submitted) {
        const question = await interviewQuestionModel
            .getQuestionById(ans.question_id);

        if (question && ans.answer === question.defer_if) {
            // This answer triggers a deferral
            const deferral = await deferralModel.createDeferral({
                donor_id,
                screening_id,
                question_id: ans.question_id,
                deferral_reason: question.deferral_reason,
                deferral_type: question.deferral_type,
                deferred_by: user_id
            });
            deferrals.push(deferral);
        }
    }

    // If any deferrals found
    // update screening result to Deferred
    if (deferrals.length > 0) {
        await screeningModel.updateScreening(screening_id, {
            screening_result: 'Deferred'
        });
    }

    return {
        answers_submitted: submitted.length,
        deferrals_created: deferrals.length,
        screening_result: deferrals.length > 0
            ? 'Deferred'
            : 'Eligible',
        deferrals
    };
};

module.exports = {
    submitAnswers
};