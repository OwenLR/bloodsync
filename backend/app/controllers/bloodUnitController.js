const bloodUnitModel   = require('../repositories/bloodUnitModel');
const bloodUnitService = require('../services/bloodUnitService');
const response         = require('../../utils/responseHelper');
const ROLES             = require('../../constants/roles');
const {
    validateUpdateUnitStatus,
    validateSeparate,
} = require('../../validators/bloodUnitValidator');

const getAllUnits = async (req, res) => {
    try {
        // PRC Staff cannot see other branches' units — Admin sees all
        if (req.user.role_id === ROLES.PRC_STAFF) {
            const units = await bloodUnitModel.getUnitsByBranchAll(req.user.branch_id);
            return response.success(res, units);
        }
        const units = await bloodUnitModel.getAllUnits();
        return response.success(res, units);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getUnitById = async (req, res) => {
    try {
        const unit = await bloodUnitModel.getUnitById(req.params.id);
        if (!unit) return response.notFound(res, 'Blood unit not found');
        return response.success(res, unit);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getUnitsByBranch = async (req, res) => {
    try {
        // PRC Staff can only view their own branch's inventory
        if (req.user.role_id === ROLES.PRC_STAFF &&
            Number(req.params.branch_id) !== req.user.branch_id) {
            return response.forbidden(res, 'You can only view your own branch inventory');
        }
        const units = await bloodUnitModel.getUnitsByBranchAll(req.params.branch_id);
        return response.success(res, units);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getInventoryByBloodType = async (req, res) => {
    try {
        const inventory = await bloodUnitModel.getInventoryByBloodType();
        return response.success(res, inventory);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getInventoryAvailability = async (req, res) => {
    try {
        const availability = await bloodUnitModel.getInventoryAvailability();
        return response.success(res, availability);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const updateUnitStatus = async (req, res) => {
    try {
        const errors = validateUpdateUnitStatus(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const updated = await bloodUnitService.updateUnitStatus(
            req.params.id,
            req.body.status,
            req.body.reason || null,
            req.user.user_id
        );
        return response.success(res, updated, `Blood unit marked as ${req.body.status}`);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const separateUnit = async (req, res) => {
    try {
        const errors = validateSeparate();
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const result = await bloodUnitService.separateUnit(
            req.params.id,
            req.user
        );

        return response.success(
            res,
            result,
            'Whole blood unit separated into 3 component collections'
        );
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllUnits,
    getUnitById,
    getUnitsByBranch,
    getInventoryByBloodType,
    getInventoryAvailability,
    updateUnitStatus,
    separateUnit,
};