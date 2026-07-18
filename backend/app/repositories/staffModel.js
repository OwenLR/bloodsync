// app/repositories/staffModel.js

const pool = require('../../config/db');

async function getStaffByBranch(branch_id) {
  const result = await pool.query(
    `SELECT u.user_id, u.email, u.first_name
     FROM users u
     WHERE u.role_id IN (1, 2)
       AND u.branch_id = $1
       AND u.status = 'Active'`,
    [branch_id]
  );
  return result.rows;
}

async function getAllAdmins() {
  const result = await pool.query(
    `SELECT u.user_id, u.email, u.first_name
     FROM users u
     WHERE u.role_id = 1
       AND u.status = 'Active'`
  );
  return result.rows;
}

module.exports = { getStaffByBranch, getAllAdmins };