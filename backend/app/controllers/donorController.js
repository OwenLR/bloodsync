const donorModel = require('../models/donorModel');
const response = require('../../utils/responseHelper');
const {
    validateCreateDonor,
    validateUpdateDonor
} = require('../../validators/donorValidator');

const getAllDonors = async (req, res) => {
    try {
        const donors = await donorModel.getAllDonors();
        return response.success(res, donors);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getDonorById = async (req, res) => {
    try {
        const donor = await donorModel.getDonorById(req.params.id);
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(res, donor);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const searchDonors = async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return response.badRequest(res, 'keyword is required');
        }
        const donors = await donorModel.searchDonors(keyword);
        return response.success(res, donors);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createDonor = async (req, res) => {
    try {
        const errors = validateCreateDonor(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        // Duplicate check via national ID
        if (req.body.national_id_type && req.body.national_id_number) {
            const existing = await donorModel.getDonorByNationalId(
                req.body.national_id_type,
                req.body.national_id_number
            );
            if (existing) {
                // Option B — return existing donor instead of hard reject
                return response.success(
                    res,
                    existing,
                    'Donor already registered with this ID. Returning existing record.'
                );
            }
        }

        const donor = await donorModel.createDonor({
            ...req.body,
            registered_by: req.user.user_id
        });

        return response.created(res, donor, 'Donor registered successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateDonor = async (req, res) => {
    try {
        const errors = validateUpdateDonor(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const donor = await donorModel.updateDonor(
            req.params.id,
            req.body
        );
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(
            res,
            donor,
            'Donor updated successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const deleteDonor = async (req, res) => {
    try {
        const donor = await donorModel.deleteDonor(req.params.id);
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(
            res,
            donor,
            'Donor deleted successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllDonors,
    getDonorById,
    searchDonors,
    createDonor,
    updateDonor,
    deleteDonor
};