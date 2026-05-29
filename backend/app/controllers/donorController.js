const donorModel = require('../models/donorModel');
const validator = require('validator');

const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const getAllDonors = async (req, res) => {
    try {
        const donors = await donorModel.getAllDonors();
        res.status(200).json({
            status: 'success',
            count: donors.length,
            data: donors
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getDonorById = async (req, res) => {
    try {
        const donor = await donorModel.getDonorById(req.params.id);
        if (!donor) {
            return res.status(404).json({
                status: 'error',
                message: 'Donor not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: donor
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const searchDonors = async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({
                status: 'error',
                message: 'keyword is required'
            });
        }
        const donors = await donorModel.searchDonors(keyword);
        res.status(200).json({
            status: 'success',
            count: donors.length,
            data: donors
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createDonor = async (req, res) => {
    try {
        const {
            first_name, last_name, birthdate,
            sex, blood_type, email, contact
        } = req.body;

        // Required fields
        if (!first_name || !last_name || !birthdate || !sex) {
            return res.status(400).json({
                status: 'error',
                message: 'first_name, last_name, birthdate and sex are required'
            });
        }

        // Validate email if provided
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        }

        // Validate blood type if provided
        if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`
            });
        }

        // Get registered_by from token
        const registered_by = req.user.user_id;

        const donor = await donorModel.createDonor({
            ...req.body,
            registered_by
        });

        res.status(201).json({
            status: 'success',
            message: 'Donor registered successfully',
            data: donor
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateDonor = async (req, res) => {
    try {
        const { email, blood_type } = req.body;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }

        // Validate email if provided
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        }

        // Validate blood type if provided
        if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`
            });
        }

        const donor = await donorModel.updateDonor(req.params.id, req.body);
        if (!donor) {
            return res.status(404).json({
                status: 'error',
                message: 'Donor not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Donor updated successfully',
            data: donor
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const deleteDonor = async (req, res) => {
    try {
        const donor = await donorModel.deleteDonor(req.params.id);
        if (!donor) {
            return res.status(404).json({
                status: 'error',
                message: 'Donor not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Donor deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
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