const pool = require('../../config/db');

const getAllUnits = async () => {
    const result = await pool.query(
        `SELECT
            bu.unit_id,
            bu.blood_type,
            bu.component,
            bu.volume_ml,
            bu.barcode,
            bu.collection_date,
            bu.expiration_date,
            CASE
                WHEN bu.status = 'Available' AND bu.expiration_date <= NOW()
                THEN 'Expired'
                ELSE bu.status
            END AS status,
            -- near_expiry thresholds mirror NEAR_EXPIRY_DAYS in
            -- constants/inventoryRulesConstant.js — keep both in sync if changed
            CASE
                WHEN bu.status = 'Available' AND bu.expiration_date > NOW() AND (
                    (bu.component = 'Whole Blood'              AND bu.expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (bu.component = 'Packed Red Blood Cells'    AND bu.expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (bu.component = 'Platelets'                 AND bu.expiration_date <= NOW() + INTERVAL '2 days')  OR
                    (bu.component = 'Fresh Frozen Plasma'       AND bu.expiration_date <= NOW() + INTERVAL '30 days')
                )
                THEN true
                ELSE false
            END AS near_expiry,
            bu.processed_at,
            bu.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name AS processed_by_first,
            u.last_name  AS processed_by_last
         FROM blood_units bu
         JOIN donors d ON bu.donor_id = d.donor_id
         LEFT JOIN branches b ON bu.branch_id = b.branch_id
         LEFT JOIN users u ON bu.processed_by = u.user_id
         ORDER BY bu.created_at DESC`
    );
    return result.rows;
};

const getUnitById = async (id) => {
    const result = await pool.query(
        `SELECT
            bu.unit_id,
            bu.collection_id,
            bu.donation_id,
            bu.donor_id,
            bu.branch_id,
            bu.drive_id,
            bu.blood_type,
            bu.component,
            bu.volume_ml,
            bu.barcode,
            bu.collection_date,
            bu.expiration_date,
            CASE
                WHEN bu.status = 'Available' AND bu.expiration_date <= NOW()
                THEN 'Expired'
                ELSE bu.status
            END AS status,
            -- near_expiry thresholds mirror NEAR_EXPIRY_DAYS in
            -- constants/inventoryRulesConstant.js — keep both in sync if changed
            CASE
                WHEN bu.status = 'Available' AND bu.expiration_date > NOW() AND (
                    (bu.component = 'Whole Blood'              AND bu.expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (bu.component = 'Packed Red Blood Cells'    AND bu.expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (bu.component = 'Platelets'                 AND bu.expiration_date <= NOW() + INTERVAL '2 days')  OR
                    (bu.component = 'Fresh Frozen Plasma'       AND bu.expiration_date <= NOW() + INTERVAL '30 days')
                )
                THEN true
                ELSE false
            END AS near_expiry,
            bu.disposal_reason,
            bu.withdrawal_reason,
            bu.processed_at,
            bu.created_at,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name AS processed_by_first,
            u.last_name  AS processed_by_last
         FROM blood_units bu
         JOIN donors d ON bu.donor_id = d.donor_id
         LEFT JOIN branches b ON bu.branch_id = b.branch_id
         LEFT JOIN users u ON bu.processed_by = u.user_id
         WHERE bu.unit_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getUnitsByBranch = async (branch_id) => {
    const result = await pool.query(
        `SELECT
            bu.unit_id,
            bu.blood_type,
            bu.component,
            bu.volume_ml,
            bu.barcode,
            bu.expiration_date,
            bu.status,
            bu.created_at
         FROM blood_units bu
         WHERE bu.branch_id = $1
         AND bu.status = 'Available'
         AND bu.expiration_date > NOW()
         ORDER BY bu.expiration_date ASC`,
        [branch_id]
    );
    return result.rows;
};

/**
 * Get ALL units for a branch, regardless of status or expiration.
 * Used by the Staff Main Inventory page — needs to show terminal-state
 * units (Disposed/Withdrawn/Released/Separated/Expired) as read-only
 * history, not just Available ones.
 * Unlike getUnitsByBranch (FEFO/fulfillment use — Available + non-expired only),
 * this is the full branch-scoped list.
 */
const getUnitsByBranchAll = async (branch_id) => {
    const result = await pool.query(
        `SELECT
            bu.unit_id,
            bu.blood_type,
            bu.component,
            bu.volume_ml,
            bu.barcode,
            bu.collection_date,
            bu.expiration_date,
            CASE
                WHEN bu.status = 'Available' AND bu.expiration_date <= NOW()
                THEN 'Expired'
                ELSE bu.status
            END AS status,
            -- near_expiry thresholds mirror NEAR_EXPIRY_DAYS in
            -- constants/inventoryRulesConstant.js — keep both in sync if changed
            CASE
                WHEN bu.status = 'Available' AND bu.expiration_date > NOW() AND (
                    (bu.component = 'Whole Blood'              AND bu.expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (bu.component = 'Packed Red Blood Cells'    AND bu.expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (bu.component = 'Platelets'                 AND bu.expiration_date <= NOW() + INTERVAL '2 days')  OR
                    (bu.component = 'Fresh Frozen Plasma'       AND bu.expiration_date <= NOW() + INTERVAL '30 days')
                )
                THEN true
                ELSE false
            END AS near_expiry,
            bu.disposal_reason,
            bu.withdrawal_reason,
            bu.created_at,
            d.donor_id,
            d.first_name,
            d.last_name
         FROM blood_units bu
         JOIN donors d ON bu.donor_id = d.donor_id
         WHERE bu.branch_id = $1
         ORDER BY bu.expiration_date ASC`,
        [branch_id]
    );
    return result.rows;
};

const getInventoryByBloodType = async () => {
    const result = await pool.query(
        `SELECT
            bu.branch_id,
            b.branch_name,
            bu.blood_type,
            bu.component,
            COUNT(*) AS units_available,
            MIN(bu.expiration_date) AS nearest_expiry
         FROM blood_units bu
         LEFT JOIN branches b ON bu.branch_id = b.branch_id
         WHERE bu.status = 'Available'
         AND bu.expiration_date > NOW()
         GROUP BY bu.branch_id, b.branch_name, bu.blood_type, bu.component
         ORDER BY bu.branch_id, bu.blood_type ASC`
    );
    return result.rows;
};

/**
 * Availability for requestors — returns boolean per blood type + component per branch.
 * Also returns branch coordinates for distance calculation on the mobile app.
 * Does NOT expose unit counts.
 */
const getInventoryAvailability = async () => {
    const result = await pool.query(
        `SELECT
            b.branch_id,
            b.branch_name,
            b.latitude,
            b.longitude,
            bt.blood_type,
            bt.component,
            CASE
                WHEN COUNT(bu.unit_id) > 0 THEN true
                ELSE false
            END AS available
         FROM branches b
         CROSS JOIN (
             SELECT DISTINCT blood_type, component
             FROM blood_units
         ) bt
         LEFT JOIN blood_units bu
             ON bu.branch_id    = b.branch_id
             AND bu.blood_type  = bt.blood_type
             AND bu.component   = bt.component
             AND bu.status      = 'Available'
             AND bu.expiration_date > NOW()
         GROUP BY b.branch_id, b.branch_name, b.latitude, b.longitude,
                  bt.blood_type, bt.component
         ORDER BY b.branch_name, bt.blood_type ASC`
    );
    return result.rows;
};

/**
 * Get available units for a specific blood type + component across all branches.
 * Returns count per branch with coordinates for distance-based sorting on the service layer.
 * Used for multi-branch fulfillment logic.
 */
const getAvailableCountByBranch = async (bloodType, component) => {
    const result = await pool.query(
        `SELECT
            b.branch_id,
            b.branch_name,
            b.latitude,
            b.longitude,
            COUNT(bu.unit_id) AS available_count
         FROM branches b
         LEFT JOIN blood_units bu
             ON bu.branch_id   = b.branch_id
             AND bu.blood_type = $1
             AND bu.component  = $2
             AND bu.status     = 'Available'
             AND bu.expiration_date > NOW()
         GROUP BY b.branch_id, b.branch_name, b.latitude, b.longitude
         HAVING COUNT(bu.unit_id) > 0
         ORDER BY b.branch_name ASC`,
        [bloodType, component]
    );
    return result.rows;
};

const createUnit = async (data) => {
    const {
        collection_id, donation_id, donor_id,
        branch_id, blood_type, component,
        volume_ml, barcode, collection_date,
        expiration_date, processed_by
    } = data;

    const result = await pool.query(
        `INSERT INTO blood_units (
            collection_id, donation_id, donor_id,
            branch_id, blood_type, component,
            volume_ml, barcode, collection_date,
            expiration_date, processed_by
         ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11
         ) RETURNING *`,
        [
            collection_id, donation_id, donor_id,
            branch_id, blood_type,
            component     || 'Whole Blood',
            volume_ml     || 450,
            barcode,
            collection_date, expiration_date,
            processed_by
        ]
    );
    return result.rows[0];
};

/**
 * Update a blood unit's status.
 * Accepts an optional transaction client as the 5th arg — defaults to the
 * shared pool for standalone callers (Dispose/Withdraw on the Blood Units
 * page). When called from inside a multi-step transaction (e.g.
 * bloodRequestService.js's approveRequest/releaseRequest/rejectRequest/
 * markReceived), the caller's `client` must be passed through so this write
 * participates in that transaction's COMMIT/ROLLBACK instead of committing
 * immediately on a separate pooled connection.
 *
 * $1 is cast explicitly in the CASE branches below — fixes a Postgres
 * "inconsistent types deduced for parameter $1" error (42P08) that occurred
 * because $1 was compared as text in the CASE branches but assigned directly
 * to the varchar `status` column in the same query.
 */
const updateUnitStatus = async (id, status, reason, user_id, dbClient = pool) => {
    const result = await dbClient.query(
        `UPDATE blood_units SET
            status = $1,
            disposal_reason = CASE
                WHEN $1::varchar = 'Disposed'  THEN $2
                ELSE disposal_reason
            END,
            withdrawal_reason = CASE
                WHEN $1::varchar = 'Withdrawn' THEN $2
                ELSE withdrawal_reason
            END
         WHERE unit_id = $3
         RETURNING *`,
        [status, reason, id]
    );
    return result.rows[0];
};

/**
 * Mark a whole blood unit as Separated.
 * Called inside a transaction — accepts a pg client.
 *
 * @param {object} client - pg transaction client
 * @param {number} unitId
 * @param {number} separatedBy - user_id
 * @returns {Promise<object>} updated unit row
 */
const markUnitSeparated = async (client, unitId, separatedBy) => {
    const result = await client.query(
        `UPDATE blood_units SET
            status       = 'Separated',
            processed_by = $1,
            processed_at = NOW()
         WHERE unit_id = $2
         RETURNING *`,
        [separatedBy, unitId]
    );
    return result.rows[0];
};

/**
 * FEFO: get available units for assignment — nearest expiry first.
 * Scoped to a specific branch.
 */
const getAvailableUnitsForAssignment = async (bloodType, component, branchId, limit) => {
    const result = await pool.query(
        `SELECT unit_id, blood_type, component, expiration_date, barcode, branch_id
         FROM blood_units
         WHERE blood_type = $1
         AND component    = $2
         AND branch_id    = $3
         AND status       = 'Available'
         AND expiration_date > NOW()
         ORDER BY expiration_date ASC
         LIMIT $4`,
        [bloodType, component, branchId, limit]
    );
    return result.rows;
};

/**
 * Get pending request count for a branch — used for waiting time estimate.
 */
const getPendingRequestCountByBranch = async (branchId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS count
         FROM blood_requests
         WHERE branch_id = $1
         AND status = 'Pending'`,
        [branchId]
    );
    return parseInt(result.rows[0].count, 10);
};

module.exports = {
    getAllUnits,
    getUnitById,
    getUnitsByBranch,
    getUnitsByBranchAll,
    getInventoryByBloodType,
    getInventoryAvailability,
    getAvailableCountByBranch,
    createUnit,
    updateUnitStatus,
    markUnitSeparated,
    getAvailableUnitsForAssignment,
    getPendingRequestCountByBranch,
};