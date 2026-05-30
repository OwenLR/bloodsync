const screeningModel = require('../models/screeningModel');
const donorModel = require('../models/donorModel');

const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_RESULTS = ['Eligible', 'Deferred'];
const VALID_HEMO_STATUS = ['Allowed', 'Not Allowed'];

const getAllScreenings = async (req, res) => {
    try {
        const screenings = await screeningModel.getAllScreenings();
        res.status(200).json({
            status: 'success',
            count: screenings.length,
            data: screenings
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getScreeningById = async (req, res) => {
    try {
        const screening = await screeningModel.getScreeningById(req.params.id);
        if (!screening) {
            return res.status(404).json({
                status: 'error',
                message: 'Screening not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: screening
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getScreeningsByDonor = async (req, res) => {
    try {
        const donor = await donorModel.getDonorById(req.params.donor_id);
        if (!donor) {
            return res.status(404).json({
                status: 'error',
                message: 'Donor not found'
            });
        }
        const screenings = await screeningModel
            .getScreeningsByDonor(req.params.donor_id);
        res.status(200).json({
            status: 'success',
            count: screenings.length,
            data: screenings
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createScreening = async (req, res) => {
    try {
        const {
            donor_id, hemoglobin,
            blood_type_confirmed,
            hemoglobin_status,
            screening_result
        } = req.body;

        // Required fields
        if (!donor_id || !hemoglobin || !screening_result) {
            return res.status(400).json({
                status: 'error',
                message: 'donor_id, hemoglobin and screening_result are required'
            });
        }

        // Validate blood type if provided
        if (blood_type_confirmed &&
            !VALID_BLOOD_TYPES.includes(blood_type_confirmed)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`
            });
        }

        // Validate screening result
        if (!VALID_RESULTS.includes(screening_result)) {
            return res.status(400).json({
                status: 'error',
                message: 'screening_result must be Eligible or Deferred'
            });
        }

        // Validate hemoglobin status if provided
        if (hemoglobin_status &&
            !VALID_HEMO_STATUS.includes(hemoglobin_status)) {
            return res.status(400).json({
                status: 'error',
                message: 'hemoglobin_status must be Allowed or Not Allowed'
            });
        }

        // Check donor exists
        const donor = await donorModel.getDonorById(donor_id);
        if (!donor) {
            return res.status(404).json({
                status: 'error',
                message: 'Donor not found'
            });
        }

        // Get screened_by from token
        const screened_by = req.user.user_id;

        const screening = await screeningModel.createScreening({
            ...req.body,
            screened_by
        });

        // If blood type confirmed during screening
        // update donor profile blood type
        if (blood_type_confirmed) {
            await donorModel.updateDonor(donor_id, {
                blood_type: blood_type_confirmed
            });
        }

        res.status(201).json({
            status: 'success',
            message: 'Screening recorded successfully',
            data: screening
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateScreening = async (req, res) => {
    try {
        const { blood_type_confirmed, screening_result, hemoglobin_status } = req.body;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }

        if (blood_type_confirmed &&
            !VALID_BLOOD_TYPES.includes(blood_type_confirmed)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`
            });
        }

        if (screening_result &&
            !VALID_RESULTS.includes(screening_result)) {
            return res.status(400).json({
                status: 'error',
                message: 'screening_result must be Eligible or Deferred'
            });
        }

        if (hemoglobin_status &&
            !VALID_HEMO_STATUS.includes(hemoglobin_status)) {
            return res.status(400).json({
                status: 'error',
                message: 'hemoglobin_status must be Allowed or Not Allowed'
            });
        }

        const screening = await screeningModel.updateScreening(
            req.params.id,
            req.body
        );

        if (!screening) {
            return res.status(404).json({
                status: 'error',
                message: 'Screening not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Screening updated successfully',
            data: screening
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllScreenings,
    getScreeningById,
    getScreeningsByDonor,
    createScreening,
    updateScreening
};