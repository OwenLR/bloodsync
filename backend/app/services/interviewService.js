const interviewAnswerModel = require('../repositories/interviewAnswerModel');
const deferralModel = require('../repositories/deferralModel');
const donorInterviewModel = require('../repositories/donorInterviewModel');
const interviewQuestionModel = require('../repositories/interviewQuestionModel');
const donorModel = require('../repositories/donorModel');

const submitAnswers = async (data, user_id) => {
    const { interview_id, donor_id, answers } = data;

    // Check interview session exists
    const interview = await donorInterviewModel.getInterviewById(interview_id);
    if (!interview) throw new Error('Interview session not found');

    // Check donor exists
    const donor = await donorModel.getDonorById(donor_id);
    if (!donor) throw new Error('Donor not found');

    // Check interview belongs to this donor
    if (interview.donor_id !== donor_id) {
        throw new Error('Interview session does not belong to this donor');
    }

    // Check interview not already completed
    if (interview.interview_result) {
        throw new Error('Interview answers already submitted for this session');
    }

    // Check donor was not deferred today
    const sameDayDeferral = await deferralModel.checkSameDayDeferral(donor_id);
    if (sameDayDeferral) {
        throw new Error(
            `Donor was deferred today and cannot attempt again until the next donation event. ` +
            `Deferral recorded at: ${new Date(sameDayDeferral.created_at).toLocaleString()}`
        );
    }

    // Format answers
    const formattedAnswers = answers.map(ans => ({
        interview_id,
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
                interview_id,
                question_id: ans.question_id,
                deferral_reason: question.deferral_reason,
                deferral_type: question.deferral_type,
                deferred_by: user_id
            });
            deferrals.push(deferral);
        }
    }

    // Set interview result based on deferrals
    const interview_result = deferrals.length > 0 ? 'Failed' : 'Passed';
    await donorInterviewModel.updateInterviewResult(interview_id, interview_result);

    return {
        answers_submitted: submitted.length,
        deferrals_created: deferrals.length,
        interview_result,
        deferrals
    };
};

module.exports = { submitAnswers };