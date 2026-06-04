const interviewAnswerModel = require('../models/interviewAnswerModel');
const deferralModel = require('../models/deferralModel');
const screeningModel = require('../models/screeningModel');
const interviewQuestionModel = require('../models/interviewQuestionModel');
const donorModel = require('../models/donorModel');

const submitAnswers = async (data, user_id) => {
    const { screening_id, donor_id, answers } = data;

    // Bug 2.1 fix — check screening exists
    const screening = await screeningModel.getScreeningById(screening_id);
    if (!screening) throw new Error('Screening not found');

    // Bug 2.1 fix — check donor exists
    const donor = await donorModel.getDonorById(donor_id);
    if (!donor) throw new Error('Donor not found');

    // Bug 2.1 fix — check screening belongs to this donor
    if (screening.donor_id !== donor_id) {
        throw new Error('Screening does not belong to this donor');
    }

    // Bug 2.2 fix — check if answers already submitted for this screening
    const existing = await interviewAnswerModel.getAnswersByScreening(screening_id);
    if (existing.length > 0) {
        throw new Error('Interview answers already submitted for this screening');
    }

    // Format answers
    const formattedAnswers = answers.map(ans => ({
        screening_id,
        donor_id,
        question_id: ans.question_id,
        answer: ans.answer.toUpperCase()
    }));

    // Submit all answers
    const submitted = await interviewAnswerModel.submitAnswers(formattedAnswers);

    // Check which answers trigger deferral
    const deferrals = [];

    for (const ans of submitted) {
        const question = await interviewQuestionModel.getQuestionById(ans.question_id);

        if (question && ans.answer === question.defer_if) {
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

    // If any deferrals found, update screening result to Deferred
    if (deferrals.length > 0) {
        await screeningModel.updateScreening(screening_id, {
            screening_result: 'Deferred'
        });
    }

    return {
        answers_submitted: submitted.length,
        deferrals_created: deferrals.length,
        screening_result: deferrals.length > 0 ? 'Deferred' : 'Eligible',
        deferrals
    };
};

module.exports = { submitAnswers };