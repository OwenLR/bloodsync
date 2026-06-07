/**
 * bloodUnitService.js — Blood unit status management.
 */

const bloodUnitModel = require('../repositories/bloodUnitModel');
const BusinessError  = require('../../utils/businessError');
const {
    assertNotTerminal,
    assertReasonProvided,
} = require('../domain/bloodUnitRules');

const updateUnitStatus = async (unitId, status, reason, updatedBy) => {
    const unit = await bloodUnitModel.getUnitById(unitId);
    if (!unit) {
        throw new BusinessError('Blood unit not found', 404);
    }

    // Domain rules throw plain Error — wrap them as BusinessError here
    try {
        assertNotTerminal(unit);
        assertReasonProvided(status, reason);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    const updated = await bloodUnitModel.updateUnitStatus(
        unitId,
        status,
        reason,
        updatedBy
    );

    return updated;
};

module.exports = { updateUnitStatus };