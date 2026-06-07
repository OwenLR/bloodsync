/**
 * userService.js — Admin user creation business logic.
 */

const bcrypt        = require('bcrypt');
const userModel     = require('../repositories/userModel');
const BusinessError = require('../../utils/businessError');

const createUser = async (data) => {
    const { first_name, last_name, email, password, role_id, branch_id } = data;

    const existing = await userModel.getUserByEmail(email);
    if (existing) {
        throw new BusinessError('Email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.createUser(
        first_name,
        last_name,
        email,
        hashedPassword,
        role_id,
        branch_id || null
    );

    return user;
};

module.exports = { createUser };