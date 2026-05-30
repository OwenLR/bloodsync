const pool = require('../../config/db');

const getAllDonations = async () => {
    const result = await pool.query(
        `SELECT
            dn.donation_id,
            dn.extraction_date,
            dn.blood_volume_ml,
            dn.extraction_time_minutes,
            dn.reaction_notes,
            dn.is_qns,
            dn.qns_reason,
            dn.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            d.blood_type,
            s.screening_result,
            s.hemoglobin,
            s.blood_type_confirmed,
            b.branch_name,
            u.first_name AS extracted_by_first,
            u.last_name AS extracted_by_last
         FROM donations dn
         JOIN donors d ON dn.donor_id = d.donor_id
         JOIN screening s ON dn.screening_id = s.screening_id
         LEFT JOIN branches b ON dn.branch_id = b.branch_id
         LEFT JOIN users u ON dn.extracted_by = u.user_id
         ORDER BY dn.created_at DESC`
    );
    return result.rows;
};

const getDonationById = async (id) => {
    const result = await pool.query(
        `SELECT
            dn.donation_id,
            dn.extraction_date,
            dn.blood_volume_ml,
            dn.extraction_time_minutes,
            dn.reaction_notes,
            dn.is_qns,
            dn.qns_reason,
            dn.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            d.blood_type,
            s.screening_result,
            s.hemoglobin,
            s.blood_type_confirmed,
            b.branch_name,
            u.first_name AS extracted_by_first,
            u.last_name AS extracted_by_last
         FROM donations dn
         JOIN donors d ON dn.donor_id = d.donor_id
         JOIN screening s ON dn.screening_id = s.screening_id
         LEFT JOIN branches b ON dn.branch_id = b.branch_id
         LEFT JOIN users u ON dn.extracted_by = u.user_id
         WHERE dn.donation_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getDonationsByDonor = async (donor_id) => {
    const result = await pool.query(
        `SELECT
            dn.donation_id,
            dn.extraction_date,
            dn.blood_volume_ml,
            dn.is_qns,
            dn.created_at,
            s.screening_result,
            s.blood_type_confirmed,
            b.branch_name
         FROM donations dn
         JOIN screening s ON dn.screening_id = s.screening_id
         LEFT JOIN branches b ON dn.branch_id = b.branch_id
         WHERE dn.donor_id = $1
         ORDER BY dn.created_at DESC`,
        [donor_id]
    );
    return result.rows;
};

const createDonation = async (data) => {
    const {
        donor_id, screening_id, branch_id,
        extracted_by, extraction_date,
        blood_volume_ml, extraction_time_minutes,
        reaction_notes, is_qns, qns_reason
    } = data;

    const result = await pool.query(
        `INSERT INTO donations (
            donor_id, screening_id, branch_id,
            extracted_by, extraction_date,
            blood_volume_ml, extraction_time_minutes,
            reaction_notes, is_qns, qns_reason
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
         ) RETURNING *`,
        [
            donor_id, screening_id, branch_id,
            extracted_by, extraction_date || new Date(),
            blood_volume_ml || 450,
            extraction_time_minutes,
            reaction_notes,
            is_qns || false,
            qns_reason
        ]
    );
    return result.rows[0];
};

const updateDonation = async (id, data) => {
    const {
        reaction_notes, is_qns,
        qns_reason, extraction_time_minutes
    } = data;

    const result = await pool.query(
        `UPDATE donations SET
            reaction_notes = COALESCE($1, reaction_notes),
            is_qns = COALESCE($2, is_qns),
            qns_reason = COALESCE($3, qns_reason),
            extraction_time_minutes = COALESCE($4, extraction_time_minutes)
         WHERE donation_id = $5
         RETURNING *`,
        [reaction_notes, is_qns, qns_reason, extraction_time_minutes, id]
    );
    return result.rows[0];
};

module.exports = {
    getAllDonations,
    getDonationById,
    getDonationsByDonor,
    createDonation,
    updateDonation
};