const donorInterviewModel = require('../repositories/donorInterviewModel');
const donorModel = require('../repositories/donorModel');
const response = require('../../utils/responseHelper');
const { validateCreateInterview } = require('../../validators/donorInterviewValidator');

const getAllInterviews = async (req, res) => {
    try {
        const interviews = await donorInterviewModel.getAllInterviews();
        return response.success(res, interviews);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getInterviewById = async (req, res) => {
    try {
        const interview = await donorInterviewModel.getInterviewById(req.params.id);
        if (!interview) return response.notFound(res, 'Interview not found');
        return response.success(res, interview);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getInterviewsByDonor = async (req, res) => {
    try {
        const interviews = await donorInterviewModel.getInterviewsByDonor(req.params.donor_id);
        return response.success(res, interviews);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createInterview = async (req, res) => {
    try {
        const errors = validateCreateInterview(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        // Existence check stays in controller — simple DB lookup, no business logic
        const donor = await donorModel.getDonorById(req.body.donor_id);
        if (!donor) return response.notFound(res, 'Donor not found');

        const interview = await donorInterviewModel.createInterview({
            donor_id: req.body.donor_id,
            branch_id: req.body.branch_id,
            conducted_by: req.user.user_id,
        });

        return response.created(res, interview, 'Interview session created successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllInterviews,
    getInterviewById,
    getInterviewsByDonor,
    createInterview,
};