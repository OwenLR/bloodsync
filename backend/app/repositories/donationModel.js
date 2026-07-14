const pool = require('../../config/db');

const getAllDonations = async () => {
    const result = await pool.query(
        `SELECT
            dn.donation_id,
            dn.screening_id,
            dn.branch_id,
            dn.drive_id,
            dn.extraction_date,
            dn.blood_volume_ml,
            dn.extraction_time_seconds,
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
            u.first_name  AS extracted_by_first,
            u.last_name   AS extracted_by_last,
            pu.user_id    AS phlebotomist_id,
            pu.first_name AS phlebotomist_first,
            pu.last_name  AS phlebotomist_last
         FROM donations dn
         JOIN donors d    ON dn.donor_id     = d.donor_id
         JOIN screening s ON dn.screening_id = s.screening_id
         LEFT JOIN branches b ON dn.branch_id       = b.branch_id
         LEFT JOIN users u    ON dn.extracted_by    = u.user_id
         LEFT JOIN users pu   ON dn.phlebotomist_id = pu.user_id
         ORDER BY dn.created_at DESC`
    );
    return result.rows;
};

const getDonationById = async (id) => {
    const result = await pool.query(
        `SELECT
            dn.donation_id,
            dn.screening_id,
            dn.branch_id,
            dn.drive_id,
            dn.extraction_date,
            dn.blood_volume_ml,
            dn.extraction_time_seconds,
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
            u.first_name  AS extracted_by_first,
            u.last_name   AS extracted_by_last,
            pu.user_id    AS phlebotomist_id,
            pu.first_name AS phlebotomist_first,
            pu.last_name  AS phlebotomist_last
         FROM donations dn
         JOIN donors d    ON dn.donor_id     = d.donor_id
         JOIN screening s ON dn.screening_id = s.screening_id
         LEFT JOIN branches b ON dn.branch_id       = b.branch_id
         LEFT JOIN users u    ON dn.extracted_by    = u.user_id
         LEFT JOIN users pu   ON dn.phlebotomist_id = pu.user_id
         WHERE dn.donation_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getDonationsByDonor = async (donor_id) => {
    const result = await pool.query(
        `SELECT
            dn.donation_id,
            dn.screening_id,
            dn.branch_id,
            dn.drive_id,
            dn.extraction_date,
            dn.blood_volume_ml,
            dn.extraction_time_seconds,
            dn.is_qns,
            dn.created_at,
            dn.phlebotomist_id,
            s.screening_result,
            s.blood_type_confirmed,
            b.branch_name,
            pu.first_name AS phlebotomist_first,
            pu.last_name  AS phlebotomist_last
         FROM donations dn
         JOIN screening s ON dn.screening_id = s.screening_id
         LEFT JOIN branches b ON dn.branch_id       = b.branch_id
         LEFT JOIN users pu   ON dn.phlebotomist_id = pu.user_id
         WHERE dn.donor_id = $1
         ORDER BY dn.created_at DESC`,
        [donor_id]
    );
    return result.rows;
};

/**
 * Used by donorCycleService to determine whether a screening's cycle
 * reached a donation, and whether that donation was QNS (for the
 * deferral cooldown check).
 */
const getDonationByScreeningId = async (screening_id) => {
    const result = await pool.query(
        `SELECT donation_id, screening_id, is_qns, qns_reason, created_at
         FROM donations
         WHERE screening_id = $1`,
        [screening_id]
    );
    return result.rows[0];
};

const createDonation = async (data) => {
    const {
        donor_id, screening_id, branch_id,
        extracted_by, phlebotomist_id,
        extraction_date, blood_volume_ml,
        extraction_time_seconds,
        reaction_notes, is_qns, qns_reason,
        drive_id,
    } = data;

    const result = await pool.query(
        `INSERT INTO donations (
            donor_id, screening_id, branch_id,
            extracted_by, phlebotomist_id,
            extraction_date, blood_volume_ml,
            extraction_time_seconds, reaction_notes,
            is_qns, qns_reason, drive_id
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
         ) RETURNING *`,
        [
            donor_id,
            screening_id,
            branch_id,
            extracted_by,
            phlebotomist_id || null,
            extraction_date || new Date(),
            blood_volume_ml || 450,
            extraction_time_seconds || 0,
            reaction_notes,
            is_qns || false,
            qns_reason,
            drive_id || null,
        ]
    );
    return result.rows[0];
};

const updateDonation = async (id, data) => {
    const {
        reaction_notes, is_qns,
        qns_reason, extraction_time_seconds,
    } = data;

    const result = await pool.query(
        `UPDATE donations SET
            reaction_notes           = COALESCE($1, reaction_notes),
            is_qns                   = COALESCE($2, is_qns),
            qns_reason               = COALESCE($3, qns_reason),
            extraction_time_seconds  = COALESCE($4, extraction_time_seconds)
         WHERE donation_id = $5
         RETURNING *`,
        [reaction_notes, is_qns, qns_reason, extraction_time_seconds, id]
    );
    return result.rows[0];
};

module.exports = {
    getAllDonations,
    getDonationById,
    getDonationsByDonor,
    getDonationByScreeningId,
    createDonation,
    updateDonation,
};