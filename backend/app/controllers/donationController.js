const donationModel = require('../models/donationModel');
const screeningModel = require('../models/screeningModel');
const deferralModel = require('../models/deferralModel');

const getAllDonations = async (req, res) => {
    try {
        const donations = await donationModel.getAllDonations();
        res.status(200).json({
            status: 'success',
            count: donations.length,
            data: donations
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getDonationById = async (req, res) => {
    try {
        const donation = await donationModel.getDonationById(req.params.id);
        if (!donation) {
            return res.status(404).json({
                status: 'error',
                message: 'Donation not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: donation
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getDonationsByDonor = async (req, res) => {
    try {
        const donations = await donationModel
            .getDonationsByDonor(req.params.donor_id);
        res.status(200).json({
            status: 'success',
            count: donations.length,
            data: donations
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createDonation = async (req, res) => {
    try {
        const { donor_id, screening_id } = req.body;

        // Required fields
        if (!donor_id || !screening_id) {
            return res.status(400).json({
                status: 'error',
                message: 'donor_id and screening_id are required'
            });
        }

        // Check screening exists and is Eligible
        const screening = await screeningModel
            .getScreeningById(screening_id);

        if (!screening) {
            return res.status(404).json({
                status: 'error',
                message: 'Screening record not found'
            });
        }

        if (screening.screening_result !== 'Eligible') {
            return res.status(400).json({
                status: 'error',
                message: `Cannot create donation.
                          Donor screening result
                          is ${screening.screening_result}`
            });
        }

        // Check donor has no active deferral
        const activeDeferral = await deferralModel
            .checkActiveDeferral(donor_id);

        if (activeDeferral) {
            return res.status(400).json({
                status: 'error',
                message: 'Donor has an active deferral',
                deferral: activeDeferral
            });
        }

        // Get extracted_by from token
        const extracted_by = req.user.user_id;

        const donation = await donationModel.createDonation({
            ...req.body,
            extracted_by
        });

        res.status(201).json({
            status: 'success',
            message: 'Donation recorded successfully',
            data: donation
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateDonation = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }

        const donation = await donationModel
            .updateDonation(req.params.id, req.body);

        if (!donation) {
            return res.status(404).json({
                status: 'error',
                message: 'Donation not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Donation updated successfully',
            data: donation
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllDonations,
    getDonationById,
    getDonationsByDonor,
    createDonation,
    updateDonation
};