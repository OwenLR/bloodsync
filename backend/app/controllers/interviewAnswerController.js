const interviewAnswerModel = require('../repositories/interviewAnswerModel');
const interviewService = require('../services/interviewService');
const response = require('../../utils/responseHelper');

const getAnswersByInterview = async (req, res) => {
    try {
        const answers = await interviewAnswerModel
            .getAnswersByInterview(req.params.interview_id);
        return response.success(res, answers);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const submitAnswers = async (req, res) => {
    try {
        const { interview_id, donor_id, answers } = req.body;

        if (!interview_id || !donor_id ||
            !answers || !Array.isArray(answers)) {
            return response.badRequest(
                res,
                'interview_id, donor_id and answers array are required'
            );
        }

        for (const ans of answers) {
            if (!ans.question_id || !ans.answer) {
                return response.badRequest(
                    res,
                    'Each answer must have question_id and answer'
                );
            }
            if (!['YES', 'NO'].includes(ans.answer.toUpperCase())) {
                return response.badRequest(
                    res,
                    'Each answer must be YES or NO'
                );
            }
        }

        const result = await interviewService
            .submitAnswers(req.body, req.user.user_id);

        return response.created(
            res,
            result,
            `Interview completed. Result: ${result.interview_result}`
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAnswersByInterview,
    submitAnswers
};