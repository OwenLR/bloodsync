const interviewQuestionModel = require('../repositories/interviewQuestionModel');
const response = require('../../utils/responseHelper');

const getAllQuestions = async (req, res) => {
    try {
        const questions = await interviewQuestionModel
            .getAllQuestions();
        return response.success(res, questions);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getQuestionsByGender = async (req, res) => {
    try {
        const sex = req.params.sex.charAt(0).toUpperCase()
            + req.params.sex.slice(1).toLowerCase();

        if (!['Male', 'Female'].includes(sex)) {
            return response.badRequest(
                res,
                'sex must be Male or Female'
            );
        }

        const questions = await interviewQuestionModel
            .getQuestionsByGender(sex);
        return response.success(res, questions);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getQuestionById = async (req, res) => {
    try {
        const question = await interviewQuestionModel
            .getQuestionById(req.params.id);
        if (!question) {
            return response.notFound(res, 'Question not found');
        }
        return response.success(res, question);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateQuestion = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return response.badRequest(
                res,
                'At least one field required to update'
            );
        }

        const question = await interviewQuestionModel
            .updateQuestion(req.params.id, req.body);
        if (!question) {
            return response.notFound(res, 'Question not found');
        }
        return response.success(
            res,
            question,
            'Question updated successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllQuestions,
    getQuestionsByGender,
    getQuestionById,
    updateQuestion
};