const bloodUnitModel = require('../models/bloodUnitModel');

const VALID_STATUSES = [
    'Available',
    'Reserved',
    'Released',
    'Disposed',
    'Withdrawn',
    'Expired'
];

const getAllUnits = async (req, res) => {
    try {
        const units = await bloodUnitModel.getAllUnits();
        res.status(200).json({
            status: 'success',
            count: units.length,
            data: units
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getUnitById = async (req, res) => {
    try {
        const unit = await bloodUnitModel.getUnitById(req.params.id);
        if (!unit) {
            return res.status(404).json({
                status: 'error',
                message: 'Blood unit not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: unit
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getUnitsByBranch = async (req, res) => {
    try {
        const units = await bloodUnitModel
            .getUnitsByBranch(req.params.branch_id);
        res.status(200).json({
            status: 'success',
            count: units.length,
            data: units
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getInventoryByBloodType = async (req, res) => {
    try {
        const inventory = await bloodUnitModel.getInventoryByBloodType();
        res.status(200).json({
            status: 'success',
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getInventoryAvailability = async (req, res) => {
    try {
        const availability = await bloodUnitModel
            .getInventoryAvailability();
        res.status(200).json({
            status: 'success',
            data: availability
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateUnitStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({
                status: 'error',
                message: 'status is required'
            });
        }

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            });
        }

        // Reason required for disposal or withdrawal
        if (['Disposed', 'Withdrawn'].includes(status) && !reason) {
            return res.status(400).json({
                status: 'error',
                message: `reason is required when marking unit as ${status}`
            });
        }

        const unit = await bloodUnitModel.getUnitById(req.params.id);
        if (!unit) {
            return res.status(404).json({
                status: 'error',
                message: 'Blood unit not found'
            });
        }

        // Cannot update already released or disposed unit
        if (['Released', 'Disposed', 'Withdrawn'].includes(unit.status)) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot update. Unit is already ${unit.status}`
            });
        }

        const updated = await bloodUnitModel
            .updateUnitStatus(
                req.params.id,
                status,
                reason,
                req.user.user_id
            );

        res.status(200).json({
            status: 'success',
            message: `Blood unit marked as ${status}`,
            data: updated
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
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