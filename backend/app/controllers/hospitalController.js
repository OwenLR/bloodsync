const hospitalModel = require('../repositories/hospitalModel');
const response = require('../../utils/responseHelper');

const getAllHospitals = async (req, res) => {
    try {
        const hospitals = await hospitalModel.getAllHospitals();
        return response.success(res, hospitals);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getHospitalById = async (req, res) => {
    try {
        const hospital = await hospitalModel
            .getHospitalById(req.params.id);
        if (!hospital) {
            return response.notFound(res, 'Hospital not found');
        }
        return response.success(res, hospital);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createHospital = async (req, res) => {
    try {
        const { hospital_name, location } = req.body;
        if (!hospital_name || !location) {
            return response.badRequest(
                res,
                'hospital_name and location are required'
            );
        }
        const hospital = await hospitalModel.createHospital(
            hospital_name,
            location
        );
        return response.created(
            res,
            hospital,
            'Hospital created successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateHospital = async (req, res) => {
    try {
        const { hospital_name, location } = req.body;
        if (!hospital_name && !location) {
            return response.badRequest(
                res,
                'At least one field required to update'
            );
        }
        const hospital = await hospitalModel.updateHospital(
            req.params.id,
            hospital_name,
            location
        );
        if (!hospital) {
            return response.notFound(res, 'Hospital not found');
        }
        return response.success(
            res,
            hospital,
            'Hospital updated successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const deleteHospital = async (req, res) => {
    try {
        const hospital = await hospitalModel
            .deleteHospital(req.params.id);
        if (!hospital) {
            return response.notFound(res, 'Hospital not found');
        }
        return response.success(
            res,
            hospital,
            'Hospital deleted successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllHospitals,
    getHospitalById,
    createHospital,
    updateHospital,
    deleteHospital
};