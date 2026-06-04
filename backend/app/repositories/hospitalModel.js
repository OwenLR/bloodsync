const pool = require('../../config/db');

const getAllHospitals = async () => {
    const result = await pool.query(
        'SELECT * FROM hospitals ORDER BY hospital_id ASC'
    );
    return result.rows;
};

const getHospitalById = async (id) => {
    const result = await pool.query(
        'SELECT * FROM hospitals WHERE hospital_id = $1',
        [id]
    );
    return result.rows[0];
};

const createHospital = async (hospital_name, location) => {
    const result = await pool.query(
        'INSERT INTO hospitals (hospital_name, location) VALUES ($1, $2) RETURNING *',
        [hospital_name, location]
    );
    return result.rows[0];
};

const updateHospital = async (id, hospital_name, location) => {
    const result = await pool.query(
        `UPDATE hospitals
         SET hospital_name = COALESCE($1, hospital_name),
             location = COALESCE($2, location)
         WHERE hospital_id = $3
         RETURNING *`,
        [hospital_name, location, id]
    );
    return result.rows[0];
};

const deleteHospital = async (id) => {
    const result = await pool.query(
        'DELETE FROM hospitals WHERE hospital_id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

module.exports = {
    getAllHospitals,
    getHospitalById,
    createHospital,
    updateHospital,
    deleteHospital
};