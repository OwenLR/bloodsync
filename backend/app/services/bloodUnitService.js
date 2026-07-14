const pool               = require('../../config/db');
const bloodUnitModel     = require('../repositories/bloodUnitModel');
const bloodCollectionModel = require('../repositories/bloodCollectionModel');
const BusinessError      = require('../../utils/businessError');
const ROLES              = require('../../constants/roles');
const { invalidateCache } = require('../cache/cacheService');
const { SEPARATION_VOLUME_ML } = require('../../constants/inventoryRulesConstant');
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

    // Status change (Disposed/Withdrawn) removes the unit from the
    // Available pool — availability + inventory caches are now stale.
    // Same invalidation bloodCollectionService.markAsSafe() already does
    // when a unit is first created.
    await invalidateCache('cache:blood-units:availability');
    await invalidateCache('cache:blood-units:inventory');

    return updated;
};

/**
 * Separate a whole blood unit into 3 component collections.
 * Each component gets a fixed volume_ml from SEPARATION_VOLUME_ML — see
 * constants/inventoryRulesConstant.js for the values and why they're fixed
 * rather than computed from the source unit's own volume_ml.
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

    // Fetch expiry days + fixed split volume for each component
    const componentData = [];
    for (const component of SEPARATION_COMPONENTS) {
        const row = await bloodCollectionModel.getExpiryDays(component);
        if (!row) {
            throw new BusinessError(
                `Expiry days not configured for component: ${component}`,
                500
            );
        }

        const volume_ml = SEPARATION_VOLUME_ML[component];
        if (!volume_ml) {
            throw new BusinessError(
                `Separation volume not configured for component: ${component}`,
                500
            );
        }

        componentData.push({ component, expiry_days: row.expiry_days, volume_ml });
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

        // Source unit leaves the Available pool (→ Separated). Same
        // invalidation as updateUnitStatus above — separation is a status
        // mutation too, just a more involved one.
        await invalidateCache('cache:blood-units:availability');
        await invalidateCache('cache:blood-units:inventory');

        return { separated_unit: separatedUnit, derived_collections: derivedCollections };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { updateUnitStatus, separateUnit };