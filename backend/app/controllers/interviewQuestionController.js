const interviewQuestionModel = require('../repositories/interviewQuestionModel');
const response = require('../../utils/responseHelper');
const {
    validateSexParam,
    validateUpdateQuestion,
} = require('../../validators/interviewQuestionValidator');

const getAllQuestions = async (req, res) => {
    try {
        const questions = await interviewQuestionModel.getAllQuestions();
        return response.success(res, questions);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getQuestionsByGender = async (req, res) => {
    try {
        const { sex, errors } = validateSexParam(req.params.sex);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const questions = await interviewQuestionModel.getQuestionsByGender(sex);
        return response.success(res, questions);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getQuestionById = async (req, res) => {
    try {
        const question = await interviewQuestionModel.getQuestionById(req.params.id);
        if (!question) return response.notFound(res, 'Question not found');
        return response.success(res, question);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateQuestion = async (req, res) => {
    try {
        const errors = validateUpdateQuestion(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const question = await interviewQuestionModel.updateQuestion(
            req.params.id,
            req.body
        );
        if (!question) return response.notFound(res, 'Question not found');
        return response.success(res, question, 'Question updated successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllQuestions,
    getQuestionsByGender,
    getQuestionById,
    updateQuestion,
};