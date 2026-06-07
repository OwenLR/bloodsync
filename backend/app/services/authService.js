/**
 * authService.js — Authentication business logic.
 *
 * Throws BusinessError for known credential/account failures.
 * Plain Error only for unexpected infrastructure issues.
 */

const bcrypt        = require('bcrypt');
const jwt           = require('jsonwebtoken');
const userModel     = require('../repositories/userModel');
const BusinessError = require('../../utils/businessError');

const login = async (email, password) => {
    if (!email || !password) {
        throw new BusinessError('Email and password are required', 400);
    }

    const user = await userModel.getUserByEmail(email);
    if (!user) {
        throw new BusinessError('Invalid email or password', 401);
    }

    if (!user.is_active) {
        throw new BusinessError('Account is deactivated. Contact administrator.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new BusinessError('Invalid email or password', 401);
    }

    await userModel.updateLastLogin(user.user_id);

    const token = jwt.sign(
        {
            user_id:   user.user_id,
            email:     user.email,
            role_id:   user.role_id,
            branch_id: user.branch_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
        token,
        user: {
            user_id:    user.user_id,
            first_name: user.first_name,
            last_name:  user.last_name,
            email:      user.email,
            role_id:    user.role_id,
            branch_id:  user.branch_id,
        },
    };
};

module.exports = { login };