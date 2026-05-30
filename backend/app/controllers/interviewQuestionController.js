const interviewQuestionModel = require('../models/interviewQuestionModel');

const getAllQuestions = async (req, res) => {
    try {
        const questions = await interviewQuestionModel.getAllQuestions();
        res.status(200).json({
            status: 'success',
            count: questions.length,
            data: questions
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getQuestionsByGender = async (req, res) => {
    try {
        const sex = req.params.sex.charAt(0).toUpperCase() 
          + req.params.sex.slice(1).toLowerCase();
        if (!['Male', 'Female'].includes(sex)) {
            return res.status(400).json({
                status: 'error',
                message: 'sex must be Male or Female'
            });
        }
        const questions = await interviewQuestionModel.getQuestionsByGender(sex);
        res.status(200).json({
            status: 'success',
            count: questions.length,
            data: questions
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getQuestionById = async (req, res) => {
    try {
        const question = await interviewQuestionModel.getQuestionById(req.params.id);
        if (!question) {
            return res.status(404).json({
                status: 'error',
                message: 'Question not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: question
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateQuestion = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }
        const question = await interviewQuestionModel.updateQuestion(
            req.params.id,
            req.body
        );
        if (!question) {
            return res.status(404).json({
                status: 'error',
                message: 'Question not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Question updated successfully',
            data: question
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllQuestions,
    getQuestionsByGender,
    getQuestionById,
    updateQuestion
};