const donorInterviewModel = require('../repositories/donorInterviewModel');
const donorModel          = require('../repositories/donorModel');
const response            = require('../../utils/responseHelper');
const BusinessError       = require('../../utils/businessError');
const { validateCreateInterview } = require('../../validators/donorInterviewValidator');

const getAllInterviews = async (req, res) => {
    try {
        const interviews = await donorInterviewModel.getAllInterviews(req.drive_id);
        return response.success(res, interviews);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getInterviewById = async (req, res) => {
    try {
        const interview = await donorInterviewModel.getInterviewById(
            req.params.id,
            req.drive_id
        );
        if (!interview) return response.notFound(res, 'Interview not found');
        return response.success(res, interview);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getInterviewsByDonor = async (req, res) => {
    try {
        const interviews = await donorInterviewModel.getInterviewsByDonor(
            req.params.donor_id,
            req.drive_id
        );
        return response.success(res, interviews);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const createInterview = async (req, res) => {
    try {
        const errors = validateCreateInterview(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const donor = await donorModel.getDonorById(req.body.donor_id);
        if (!donor) return response.notFound(res, 'Donor not found');

        const existingInterview = await donorInterviewModel.getInterviewByDonorAndDrive(
            req.body.donor_id,
            req.drive_id
        );

        if (existingInterview) {
            if (existingInterview.interview_result === null) {
                return response.success(
                    res,
                    existingInterview,
                    'Existing interview session resumed'
                );
            }
            throw new BusinessError('Interview already exists for this donor', 409);
        }

        // branch_id is NEVER trusted from the client — resolved server-side:
        // - Volunteer/Phlebotomist: the active drive's own branch_id
        //   (req.drive_branch_id, set by bloodDriveMiddleware). These roles
        //   never carry a branch_id on their own user record.
        // - Admin/PRC Staff (walk-in, no drive): their own JWT branch_id.
        const branch_id = req.drive_branch_id || req.user.branch_id;

        if (!branch_id) {
            return response.badRequest(
                res,
                'Could not resolve a branch for this interview — no active drive branch found, and no branch is set on your account.'
            );
        }

        const interview = await donorInterviewModel.createInterview({
            donor_id:     req.body.donor_id,
            branch_id,
            conducted_by: req.user.user_id,
            // drive_id attached by bloodDriveMiddleware for Volunteer/Phlebotomist.
            // null for Admin/Staff walk-in operations.
            drive_id:     req.drive_id || null,
        });

        return response.created(res, interview, 'Interview session created successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllInterviews,
    getInterviewById,
    getInterviewsByDonor,
    createInterview,
};