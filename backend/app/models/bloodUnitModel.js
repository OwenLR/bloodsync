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
            bu.status,
            bu.processed_at,
            bu.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name AS processed_by_first,
            u.last_name AS processed_by_last
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
            bu.blood_type,
            bu.component,
            bu.volume_ml,
            bu.barcode,
            bu.collection_date,
            bu.expiration_date,
            bu.status,
            bu.disposal_reason,
            bu.withdrawal_reason,
            bu.processed_at,
            bu.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            b.branch_id,
            u.first_name AS processed_by_first,
            u.last_name AS processed_by_last
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

const getInventoryByBloodType = async () => {
    const result = await pool.query(
        `SELECT
            bu.branch_id,
            b.branch_name,
            bu.blood_type,
            bu.component,
            COUNT(*) as units_available,
            MIN(bu.expiration_date) as nearest_expiry
         FROM blood_units bu
         LEFT JOIN branches b ON bu.branch_id = b.branch_id
         WHERE bu.status = 'Available'
         AND bu.expiration_date > NOW()
         GROUP BY bu.branch_id, b.branch_name,
                  bu.blood_type, bu.component
         ORDER BY bu.branch_id, bu.blood_type ASC`
    );
    return result.rows;
};

const getInventoryAvailability = async () => {
    // Returns only available or not
    // for requestor view
    const result = await pool.query(
        `SELECT
            b.branch_name,
            bu.blood_type,
            bu.component,
            CASE
                WHEN COUNT(*) > 0 THEN 'Available'
                ELSE 'Not Available'
            END as availability
         FROM branches b
         CROSS JOIN (
             SELECT DISTINCT blood_type, component
             FROM blood_units
         ) bt
         LEFT JOIN blood_units bu
             ON bu.branch_id = b.branch_id
             AND bu.blood_type = bt.blood_type
             AND bu.component = bt.component
             AND bu.status = 'Available'
             AND bu.expiration_date > NOW()
         GROUP BY b.branch_name, bu.blood_type, bu.component
         ORDER BY b.branch_name, bu.blood_type ASC`
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
            component || 'Whole Blood',
            volume_ml || 450, barcode,
            collection_date, expiration_date,
            processed_by
        ]
    );
    return result.rows[0];
};

const updateUnitStatus = async (id, status, reason, user_id) => {
    const result = await pool.query(
        `UPDATE blood_units SET
            status = $1,
            disposal_reason = CASE
                WHEN $1 = 'Disposed' THEN $2
                ELSE disposal_reason
            END,
            withdrawal_reason = CASE
                WHEN $1 = 'Withdrawn' THEN $2
                ELSE withdrawal_reason
            END
         WHERE unit_id = $3
         RETURNING *`,
        [status, reason, id]
    );
    return result.rows[0];
};

const getAvailableUnitsForAssignment = async (bloodType, component, branchId, limit) => {
    const result = await pool.query(
        `SELECT unit_id, blood_type, component, expiration_date, barcode
         FROM blood_units
         WHERE blood_type = $1
         AND component = $2
         AND branch_id = $3
         AND status = 'Available'
         AND expiration_date > NOW()
         ORDER BY expiration_date ASC
         LIMIT $4`,
        [bloodType, component, branchId, limit]
    );
    return result.rows;
};

module.exports = {
    getAllUnits,
    getUnitById,
    getUnitsByBranch,
    getInventoryByBloodType,
    getInventoryAvailability,
    createUnit,
    updateUnitStatus,
    getAvailableUnitsForAssignment
};