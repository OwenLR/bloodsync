const pool = require('../../config/db');

const getAllCollections = async () => {
    const result = await pool.query(
        `SELECT
            bc.collection_id,
            bc.blood_type,
            bc.component,
            bc.volume_ml,
            bc.barcode,
            bc.collection_date,
            bc.expiration_date,
            bc.status,
            bc.is_qns,
            bc.qns_reason,
            bc.notes,
            bc.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name AS collected_by_first,
            u.last_name AS collected_by_last
         FROM blood_collections bc
         JOIN donations dn ON bc.donation_id = dn.donation_id
         JOIN donors d ON bc.donor_id = d.donor_id
         LEFT JOIN branches b ON bc.branch_id = b.branch_id
         LEFT JOIN users u ON bc.collected_by = u.user_id
         ORDER BY bc.created_at DESC`
    );
    return result.rows;
};

const getCollectionById = async (id) => {
    const result = await pool.query(
        `SELECT
            bc.collection_id,
            bc.blood_type,
            bc.component,
            bc.volume_ml,
            bc.barcode,
            bc.collection_date,
            bc.expiration_date,
            bc.status,
            bc.is_qns,
            bc.qns_reason,
            bc.notes,
            bc.created_at,
            bc.approved_at,
            bc.rejected_at,
            bc.rejection_reason,
            d.donor_id,
            d.first_name,
            d.last_name,
            b.branch_name,
            u.first_name AS collected_by_first,
            u.last_name AS collected_by_last,
            ab.first_name AS approved_by_first,
            ab.last_name AS approved_by_last
         FROM blood_collections bc
         JOIN donations dn ON bc.donation_id = dn.donation_id
         JOIN donors d ON bc.donor_id = d.donor_id
         LEFT JOIN branches b ON bc.branch_id = b.branch_id
         LEFT JOIN users u ON bc.collected_by = u.user_id
         LEFT JOIN users ab ON bc.approved_by = ab.user_id
         WHERE bc.collection_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getCollectionsByBranch = async (branch_id) => {
    const result = await pool.query(
        `SELECT
            bc.collection_id,
            bc.blood_type,
            bc.component,
            bc.volume_ml,
            bc.barcode,
            bc.expiration_date,
            bc.status,
            bc.collection_date,
            d.first_name,
            d.last_name
         FROM blood_collections bc
         JOIN donations dn ON bc.donation_id = dn.donation_id
         JOIN donors d ON bc.donor_id = d.donor_id
         WHERE bc.branch_id = $1
         ORDER BY bc.created_at DESC`,
        [branch_id]
    );
    return result.rows;
};

const createCollection = async (data) => {
    const {
        donation_id, donor_id, branch_id,
        collected_by, blood_type, component,
        volume_ml, barcode, expiration_date,
        is_qns, qns_reason, notes
    } = data;

    const result = await pool.query(
        `INSERT INTO blood_collections (
            donation_id, donor_id, branch_id,
            collected_by, blood_type, component,
            volume_ml, barcode, expiration_date,
            is_qns, qns_reason, notes
         ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12
         ) RETURNING *`,
        [
            donation_id, donor_id, branch_id,
            collected_by, blood_type,
            component || 'Whole Blood',
            volume_ml || 450, barcode,
            expiration_date,
            is_qns || false, qns_reason, notes
        ]
    );
    return result.rows[0];
};

const updateCollectionStatus = async (id, status, user_id, reason) => {
    let query;
    let params;

    if (status === 'Safe') {
        query = `UPDATE blood_collections SET
                    status = $1,
                    approved_by = $2,
                    approved_at = NOW()
                 WHERE collection_id = $3
                 RETURNING *`;
        params = [status, user_id, id];
    } else if (status === 'Rejected') {
        query = `UPDATE blood_collections SET
                    status = $1,
                    rejected_by = $2,
                    rejected_at = NOW(),
                    rejection_reason = $3
                 WHERE collection_id = $4
                 RETURNING *`;
        params = [status, user_id, reason, id];
    } else {
        query = `UPDATE blood_collections SET
                    status = $1
                 WHERE collection_id = $2
                 RETURNING *`;
        params = [status, id];
    }

    const result = await pool.query(query, params);
    return result.rows[0];
};

const getExpiryDays = async (component) => {
    const result = await pool.query(
        `SELECT expiry_days FROM component_expiry_days
         WHERE LOWER(component) = LOWER($1)`,
        [component]
    );
    return result.rows[0];
};

/**
 * Insert 3 derived blood collection rows from a separated whole blood unit.
 * Each row gets a fresh expiry date computed from today + component expiry days.
 * source_unit_id links back to the original whole blood unit for traceability.
 *
 * @param {object} client - pg transaction client
 * @param {object} sourceUnit - the original whole blood unit row
 * @param {Array<{ component: string, expiry_days: number }>} components
 * @param {number} separatedBy - user_id of the staff performing separation
 * @returns {Promise<object[]>} the 3 inserted collection rows
 */
const createDerivedCollections = async (client, sourceUnit, components, separatedBy) => {
    const inserted = [];

    for (const { component, expiry_days } of components) {
        const result = await client.query(
            `INSERT INTO blood_collections (
                donation_id,
                donor_id,
                branch_id,
                collected_by,
                blood_type,
                component,
                volume_ml,
                collection_date,
                expiration_date,
                status,
                drive_id,
                source_unit_id
             ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, NOW(), (NOW() + ($8 || ' days')::interval)::date,
                'Pending', $9, $10
             ) RETURNING *`,
            [
                sourceUnit.donation_id,
                sourceUnit.donor_id,
                sourceUnit.branch_id,
                separatedBy,
                sourceUnit.blood_type,
                component,
                sourceUnit.volume_ml,
                expiry_days,
                sourceUnit.drive_id,
                sourceUnit.unit_id,
            ]
        );
        inserted.push(result.rows[0]);
    }

    return inserted;
};

module.exports = {
    getAllCollections,
    getCollectionById,
    getCollectionsByBranch,
    createCollection,
    updateCollectionStatus,
    getExpiryDays,
    createDerivedCollections,
};