const hospitalModel = require('../models/hospitalModel');

const getAllHospitals = async (req, res) => {
    try {
        const hospitals = await hospitalModel.getAllHospitals();
        res.status(200).json({
            status: 'success',
            data: hospitals
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getHospitalById = async (req, res) => {
    try {
        const hospital = await hospitalModel.getHospitalById(req.params.id);
        if (!hospital) {
            return res.status(404).json({
                status: 'error',
                message: 'Hospital not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: hospital
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createHospital = async (req, res) => {
    try {
        const { hospital_name, location } = req.body;
        if (!hospital_name || !location) {
            return res.status(400).json({
                status: 'error',
                message: 'hospital_name and location are required'
            });
        }
        const hospital = await hospitalModel.createHospital(hospital_name, location);
        res.status(201).json({
            status: 'success',
            message: 'Hospital created successfully',
            data: hospital
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateHospital = async (req, res) => {
    try {
        const { hospital_name, location } = req.body;
        if (!hospital_name && !location) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }
        const hospital = await hospitalModel.updateHospital(
            req.params.id,
            hospital_name,
            location
        );
        if (!hospital) {
            return res.status(404).json({
                status: 'error',
                message: 'Hospital not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Hospital updated successfully',
            data: hospital
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const deleteHospital = async (req, res) => {
    try {
        const hospital = await hospitalModel.deleteHospital(req.params.id);
        if (!hospital) {
            return res.status(404).json({
                status: 'error',
                message: 'Hospital not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Hospital deleted successfully',
            data: hospital
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllHospitals,
    getHospitalById,
    createHospital,
    updateHospital,
    deleteHospital
};