const pool = require('../../config/db');

const getAllRoles = async () => {
    const result = await pool.query(
        'SELECT * FROM roles ORDER BY role_id ASC'
    );
    return result.rows;
};

const getRoleById = async (id) => {
    const result = await pool.query(
        'SELECT * FROM roles WHERE role_id = $1',
        [id]
    );
    return result.rows[0];
};

const createRole = async (role_name) => {
    const result = await pool.query(
        'INSERT INTO roles (role_name) VALUES ($1) RETURNING *',
        [role_name]
    );
    return result.rows[0];
};

const updateRole = async (id, role_name) => {
    const result = await pool.query(
        `UPDATE roles 
         SET role_name = COALESCE($1, role_name)
         WHERE role_id = $2 
         RETURNING *`,
        [role_name, id]
    );
    return result.rows[0];
};

const deleteRole = async (id) => {
    const result = await pool.query(
        'DELETE FROM roles WHERE role_id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

module.exports = {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};