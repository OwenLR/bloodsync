/**
 * bloodUnitService.js — Blood unit status management.
 */

const pool               = require('../../config/db');
const bloodUnitModel     = require('../repositories/bloodUnitModel');
const bloodCollectionModel = require('../repositories/bloodCollectionModel');
const BusinessError      = require('../../utils/businessError');
const ROLES              = require('../../constants/roles');
const {
    assertNotTerminal,
    assertReasonProvided,
    assertSeparable,
} = require('../domain/bloodUnitRules');

// Components produced from 1 whole blood unit
const SEPARATION_COMPONENTS = [
    'Packed Red Blood Cells',
    'Fresh Frozen Plasma',
    'Platelets',
];

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

/**
 * Separate a whole blood unit into 3 component collections.
 *
 * Steps:
 * 1. Fetch unit — 404 if not found
 * 2. Assert component is Whole Blood and status is Available
 * 3. Assert branch ownership for PRC Staff
 * 4. Fetch expiry days for the 3 components
 * 5. In a transaction: mark unit Separated + insert 3 derived collections
 *
 * @param {number} unitId
 * @param {{ user_id: number, role_id: number, branch_id: number }} staffUser
 * @returns {Promise<{ separated_unit: object, derived_collections: object[] }>}
 */
const separateUnit = async (unitId, staffUser) => {
    const unit = await bloodUnitModel.getUnitById(unitId);
    if (!unit) {
        throw new BusinessError('Blood unit not found', 404);
    }

    try {
        assertSeparable(unit);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    // PRC Staff can only process units from their own branch
    if (staffUser.role_id === ROLES.PRC_STAFF) {
        if (unit.branch_id !== staffUser.branch_id) {
            throw new BusinessError(
                'You can only separate units from your own branch',
                403
            );
        }
    }

    // Fetch expiry days for each component from component_expiry_days table
    const componentData = [];
    for (const component of SEPARATION_COMPONENTS) {
        const row = await bloodCollectionModel.getExpiryDays(component);
        if (!row) {
            throw new BusinessError(
                `Expiry days not configured for component: ${component}`,
                500
            );
        }
        componentData.push({ component, expiry_days: row.expiry_days });
    }

    // Run as a transaction — both steps must succeed or both roll back
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const separatedUnit = await bloodUnitModel.markUnitSeparated(
            client,
            unitId,
            staffUser.user_id
        );

        const derivedCollections = await bloodCollectionModel.createDerivedCollections(
            client,
            unit,
            componentData,
            staffUser.user_id
        );

        await client.query('COMMIT');

        return { separated_unit: separatedUnit, derived_collections: derivedCollections };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { updateUnitStatus, separateUnit };