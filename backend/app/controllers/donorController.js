const donorModel = require('../repositories/donorModel');
const donorService = require('../services/donorService');
const response = require('../../utils/responseHelper');
const {
    validateCreateDonor,
    validateUpdateDonor,
} = require('../../validators/donorValidator');
const { validateUpdateDonorContact } = require('../../validators/donorContactValidator');

const getAllDonors = async (req, res) => {
    try {
        const donors = await donorModel.getAllDonors();
        return response.success(res, donors);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getDonorById = async (req, res) => {
    try {
        const donor = await donorModel.getDonorById(req.params.id);
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(res, donor);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const searchDonors = async (req, res) => {
    try {
        const keyword = req.query.q || req.query.keyword;
        if (!keyword) return response.badRequest(res, 'keyword is required');
        const donors = await donorModel.searchDonors(keyword);
        return response.success(res, donors);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const createDonor = async (req, res) => {
    try {
        const errors = validateCreateDonor(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const { donor, isExisting } = await donorService.createDonor(
            req.body,
            req.user.user_id
        );

        if (isExisting) {
            return response.success(
                res,
                donor,
                'Donor already registered with this ID. Returning existing record.'
            );
        }

        return response.created(res, donor, 'Donor registered successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const updateDonor = async (req, res) => {
    try {
        const errors = validateUpdateDonor(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const donor = await donorModel.updateDonor(req.params.id, req.body);
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(res, donor, 'Donor updated successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

// PATCH /api/donors/:id/contact — Volunteer + Phlebotomist self-service
// Narrow scope: email/contact only, enforced by validateUpdateDonorContact.
// Reuses donorModel.updateDonor() — same COALESCE update used by the full
// Admin/PRC Staff update, just called with a pre-validated, restricted body.
const updateDonorContact = async (req, res) => {
    try {
        const errors = validateUpdateDonorContact(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const donor = await donorModel.updateDonor(req.params.id, req.body);
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(res, donor, 'Donor contact information updated successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const deleteDonor = async (req, res) => {
    try {
        const donor = await donorModel.deleteDonor(req.params.id);
        if (!donor) return response.notFound(res, 'Donor not found');
        return response.success(res, donor, 'Donor deleted successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllDonors,
    getDonorById,
    searchDonors,
    createDonor,
    updateDonor,
    updateDonorContact,
    deleteDonor,
};