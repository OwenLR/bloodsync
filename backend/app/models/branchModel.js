const pool = require('../../config/db');

const getAllBranches = async () => {
    const result = await pool.query(
        'SELECT * FROM branches ORDER BY branch_id ASC'
    );
    return result.rows;
};

const getBranchById = async (id) => {
    const result = await pool.query(
        'SELECT * FROM branches WHERE branch_id = $1',
        [id]
    );
    return result.rows[0];
};

const createBranch = async (branch_name, location) => {
    const result = await pool.query(
        'INSERT INTO branches (branch_name, location) VALUES ($1, $2) RETURNING *',
        [branch_name, location]
    );
    return result.rows[0];
};

const updateBranch = async (id, branch_name, location) => {
    const result = await pool.query(
        `UPDATE branches 
         SET branch_name = COALESCE($1, branch_name),
             location = COALESCE($2, location)
         WHERE branch_id = $3 
         RETURNING *`,
        [branch_name, location, id]
    );
    return result.rows[0];
};

const deleteBranch = async (id) => {
    const result = await pool.query(
        'DELETE FROM branches WHERE branch_id = $1 RETURNING *',
        [id]
    );
    return result.rows[0];
};

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
};