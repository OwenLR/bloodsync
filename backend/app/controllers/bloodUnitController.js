const bloodUnitModel = require('../repositories/bloodUnitModel');
const response = require('../../utils/responseHelper');
const { UNIT_STATUSES } = require('../../constants/statuses');

const getAllUnits = async (req, res) => {
    try {
        const units = await bloodUnitModel.getAllUnits();
        return response.success(res, units);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getUnitById = async (req, res) => {
    try {
        const unit = await bloodUnitModel.getUnitById(req.params.id);
        if (!unit) {
            return response.notFound(res, 'Blood unit not found');
        }
        return response.success(res, unit);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getUnitsByBranch = async (req, res) => {
    try {
        const units = await bloodUnitModel
            .getUnitsByBranch(req.params.branch_id);
        return response.success(res, units);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getInventoryByBloodType = async (req, res) => {
    try {
        const inventory = await bloodUnitModel
            .getInventoryByBloodType();
        return response.success(res, inventory);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getInventoryAvailability = async (req, res) => {
    try {
        const availability = await bloodUnitModel
            .getInventoryAvailability();
        return response.success(res, availability);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateUnitStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!status) {
            return response.badRequest(res, 'status is required');
        }

        if (!UNIT_STATUSES.includes(status)) {
            return response.badRequest(
                res,
                `Invalid status. Must be one of: ${UNIT_STATUSES.join(', ')}`
            );
        }

        if (['Disposed', 'Withdrawn'].includes(status) && !reason) {
            return response.badRequest(
                res,
                `reason is required when marking unit as ${status}`
            );
        }

        const unit = await bloodUnitModel.getUnitById(req.params.id);
        if (!unit) {
            return response.notFound(res, 'Blood unit not found');
        }

        if (['Released', 'Disposed', 'Withdrawn']
            .includes(unit.status)) {
            return response.badRequest(
                res,
                `Cannot update. Unit is already ${unit.status}`
            );
        }

        const updated = await bloodUnitModel.updateUnitStatus(
            req.params.id,
            status,
            reason,
            req.user.user_id
        );

        return response.success(
            res,
            updated,
            `Blood unit marked as ${status}`
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllUnits,
    getUnitById,
    getUnitsByBranch,
    getInventoryByBloodType,
    getInventoryAvailability,
    updateUnitStatus
};