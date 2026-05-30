const pool = require('../../config/db');

const getAllScreenings = async () => {
    const result = await pool.query(
        `SELECT
            s.screening_id,
            s.weight,
            s.blood_pressure,
            s.pulse_rate,
            s.temperature,
            s.hemoglobin,
            s.blood_type_confirmed,
            s.hemoglobin_status,
            s.screening_result,
            s.notes,
            s.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            d.sex,
            b.branch_name,
            u.first_name AS screened_by_first,
            u.last_name AS screened_by_last
         FROM screening s
         JOIN donors d ON s.donor_id = d.donor_id
         LEFT JOIN branches b ON s.branch_id = b.branch_id
         LEFT JOIN users u ON s.screened_by = u.user_id
         ORDER BY s.created_at DESC`
    );
    return result.rows;
};

const getScreeningById = async (id) => {
    const result = await pool.query(
        `SELECT
            s.screening_id,
            s.weight,
            s.blood_pressure,
            s.pulse_rate,
            s.temperature,
            s.hemoglobin,
            s.blood_type_confirmed,
            s.hemoglobin_status,
            s.screening_result,
            s.notes,
            s.created_at,
            d.donor_id,
            d.first_name,
            d.last_name,
            d.sex,
            b.branch_name,
            u.first_name AS screened_by_first,
            u.last_name AS screened_by_last
         FROM screening s
         JOIN donors d ON s.donor_id = d.donor_id
         LEFT JOIN branches b ON s.branch_id = b.branch_id
         LEFT JOIN users u ON s.screened_by = u.user_id
         WHERE s.screening_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getScreeningsByDonor = async (donor_id) => {
    const result = await pool.query(
        `SELECT
            s.screening_id,
            s.weight,
            s.blood_pressure,
            s.hemoglobin,
            s.blood_type_confirmed,
            s.hemoglobin_status,
            s.screening_result,
            s.created_at,
            u.first_name AS screened_by_first,
            u.last_name AS screened_by_last
         FROM screening s
         LEFT JOIN users u ON s.screened_by = u.user_id
         WHERE s.donor_id = $1
         ORDER BY s.created_at DESC`,
        [donor_id]
    );
    return result.rows;
};

const createScreening = async (data) => {
    const {
        donor_id, branch_id, screened_by,
        weight, blood_pressure, pulse_rate,
        temperature, hemoglobin,
        blood_type_confirmed, hemoglobin_status,
        screening_result, notes
    } = data;

    const result = await pool.query(
        `INSERT INTO screening (
            donor_id, branch_id, screened_by,
            weight, blood_pressure, pulse_rate,
            temperature, hemoglobin,
            blood_type_confirmed, hemoglobin_status,
            screening_result, notes
         ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12
         ) RETURNING *`,
        [
            donor_id, branch_id, screened_by,
            weight, blood_pressure, pulse_rate,
            temperature, hemoglobin,
            blood_type_confirmed, hemoglobin_status,
            screening_result, notes
        ]
    );
    return result.rows[0];
};

const updateScreening = async (id, data) => {
    const {
        weight, blood_pressure, pulse_rate,
        temperature, hemoglobin,
        blood_type_confirmed, hemoglobin_status,
        screening_result, notes
    } = data;

    const result = await pool.query(
        `UPDATE screening SET
            weight = COALESCE($1, weight),
            blood_pressure = COALESCE($2, blood_pressure),
            pulse_rate = COALESCE($3, pulse_rate),
            temperature = COALESCE($4, temperature),
            hemoglobin = COALESCE($5, hemoglobin),
            blood_type_confirmed = COALESCE($6, blood_type_confirmed),
            hemoglobin_status = COALESCE($7, hemoglobin_status),
            screening_result = COALESCE($8, screening_result),
            notes = COALESCE($9, notes)
         WHERE screening_id = $10
         RETURNING *`,
        [
            weight, blood_pressure, pulse_rate,
            temperature, hemoglobin,
            blood_type_confirmed, hemoglobin_status,
            screening_result, notes, id
        ]
    );
    return result.rows[0];
};

module.exports = {
    getAllScreenings,
    getScreeningById,
    getScreeningsByDonor,
    createScreening,
    updateScreening
};