const screeningModel = require('../repositories/screeningModel');
const screeningService = require('../services/screeningService');
const response = require('../../utils/responseHelper');
const {
    validateCreateScreening,
    validateUpdateScreening
} = require('../../validators/screeningValidator');

const getAllScreenings = async (req, res) => {
    try {
        const screenings = await screeningModel.getAllScreenings();
        return response.success(res, screenings);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getScreeningById = async (req, res) => {
    try {
        const screening = await screeningModel
            .getScreeningById(req.params.id);
        if (!screening) {
            return response.notFound(res, 'Screening not found');
        }
        return response.success(res, screening);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getScreeningsByDonor = async (req, res) => {
    try {
        const screenings = await screeningModel
            .getScreeningsByDonor(req.params.donor_id);
        return response.success(res, screenings);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createScreening = async (req, res) => {
    try {
        const errors = validateCreateScreening(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const screening = await screeningService
            .createScreening(req.body, req.user.user_id);

        return response.created(
            res,
            screening,
            'Screening recorded successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateScreening = async (req, res) => {
    try {
        const errors = validateUpdateScreening(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const screening = await screeningService
            .updateScreening(req.params.id, req.body);

        return response.success(
            res,
            screening,
            'Screening updated successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllScreenings,
    getScreeningById,
    getScreeningsByDonor,
    createScreening,
    updateScreening
};