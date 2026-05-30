const interviewAnswerModel = require('../models/interviewAnswerModel');
const deferralModel = require('../models/deferralModel');
const screeningModel = require('../models/screeningModel');

const getAnswersByScreening = async (req, res) => {
    try {
        const answers = await interviewAnswerModel
            .getAnswersByScreening(req.params.screening_id);
        res.status(200).json({
            status: 'success',
            count: answers.length,
            data: answers
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const submitAnswers = async (req, res) => {
    try {
        const { screening_id, donor_id, answers } = req.body;

        // Validate required fields
        if (!screening_id || !donor_id || !answers || !Array.isArray(answers)) {
            return res.status(400).json({
                status: 'error',
                message: 'screening_id, donor_id and answers array are required'
            });
        }

        // Validate each answer
        for (const ans of answers) {
            if (!ans.question_id || !ans.answer) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Each answer must have question_id and answer'
                });
            }
            if (!['YES', 'NO'].includes(ans.answer.toUpperCase())) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Each answer must be YES or NO'
                });
            }
        }

        // Format answers for insertion
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
        const deferralTriggers = await interviewAnswerModel
            .checkForDeferrals(screening_id);

        let deferrals = [];
        let finalResult = 'Eligible';

        if (deferralTriggers.length > 0) {
            // Create deferral records automatically
            const deferralData = deferralTriggers.map(trigger => ({
                donor_id,
                screening_id,
                question_id: trigger.question_id,
                deferral_reason: trigger.deferral_reason,
                deferral_type: trigger.deferral_type,
                deferred_by: req.user.user_id
            }));

            deferrals = await deferralModel
                .createMultipleDeferrals(deferralData);

            // Update screening result to Deferred
            await screeningModel.updateScreening(screening_id, {
                screening_result: 'Deferred'
            });

            finalResult = 'Deferred';
        }

        res.status(201).json({
            status: 'success',
            message: `Interview completed. Donor is ${finalResult}.`,
            screening_result: finalResult,
            answers_submitted: submitted.length,
            deferrals_created: deferrals.length,
            deferrals: deferrals.length > 0 ? deferrals : undefined
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAnswersByScreening,
    submitAnswers
};