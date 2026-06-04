const donationModel = require('../repositories/donationModel');
const donationService = require('../services/donationService');
const response = require('../../utils/responseHelper');

const getAllDonations = async (req, res) => {
    try {
        const donations = await donationModel.getAllDonations();
        return response.success(res, donations);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getDonationById = async (req, res) => {
    try {
        const donation = await donationModel
            .getDonationById(req.params.id);
        if (!donation) {
            return response.notFound(res, 'Donation not found');
        }
        return response.success(res, donation);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getDonationsByDonor = async (req, res) => {
    try {
        const donations = await donationModel
            .getDonationsByDonor(req.params.donor_id);
        return response.success(res, donations);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createDonation = async (req, res) => {
    try {
        const { donor_id, screening_id } = req.body;

        if (!donor_id || !screening_id) {
            return response.badRequest(
                res,
                'donor_id and screening_id are required'
            );
        }

        const donation = await donationService
            .createDonation(req.body, req.user.user_id);

        return response.created(
            res,
            donation,
            'Donation recorded successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateDonation = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return response.badRequest(
                res,
                'At least one field required to update'
            );
        }

        const donation = await donationModel.updateDonation(
            req.params.id,
            req.body
        );
        if (!donation) {
            return response.notFound(res, 'Donation not found');
        }
        return response.success(
            res,
            donation,
            'Donation updated successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllDonations,
    getDonationById,
    getDonationsByDonor,
    createDonation,
    updateDonation
};