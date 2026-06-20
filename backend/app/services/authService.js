/**
 * authService.js — Authentication business logic.
 *
 * Throws BusinessError for known credential/account failures.
 * Plain Error only for unexpected infrastructure issues.
 */

const bcrypt        = require('bcrypt');
const jwt           = require('jsonwebtoken');
const crypto        = require('crypto');
const pool          = require('../../config/db');
const userModel     = require('../repositories/userModel');
const BusinessError = require('../../utils/businessError');

const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

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

    const accessToken = jwt.sign(
        {
            user_id:   user.user_id,
            email:     user.email,
            role_id:   user.role_id,
            branch_id: user.branch_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.user_id, refreshTokenHash, expiresAt]
    );

    return {
        accessToken,
        refreshToken,
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

const refresh = async (refreshToken) => {
    if (!refreshToken) {
        throw new BusinessError('Refresh token missing', 401);
    }

    const tokenHash = hashToken(refreshToken);

    const result = await pool.query(
        `SELECT * FROM refresh_tokens
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
    );

    const stored = result.rows[0];
    if (!stored) {
        throw new BusinessError('Invalid or expired refresh token', 401);
    }

    const user = await userModel.getUserById(stored.user_id);
    if (!user || !user.is_active) {
        throw new BusinessError('Account is deactivated. Contact administrator.', 401);
    }

    // Rotate — delete old, issue new
    await pool.query(
        `DELETE FROM refresh_tokens WHERE token_id = $1`,
        [stored.token_id]
    );

    const newAccessToken = jwt.sign(
        {
            user_id:   user.user_id,
            email:     user.email,
            role_id:   user.role_id,
            branch_id: user.branch_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.user_id, newRefreshTokenHash, expiresAt]
    );

    return { newAccessToken, newRefreshToken };
};

const logout = async (refreshToken) => {
    if (!refreshToken) return;

    const tokenHash = hashToken(refreshToken);
    await pool.query(
        `DELETE FROM refresh_tokens WHERE token_hash = $1`,
        [tokenHash]
    );
};

// Self-service password change — shared by every role, since password
// verification/hashing logic does not depend on role_id. userId comes from
// req.user (JWT), never from request body.
const changePassword = async (userId, currentPassword, newPassword) => {
    const credentials = await userModel.getUserCredentialsById(userId);

    if (!credentials) {
        throw new BusinessError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, credentials.password);
    if (!isMatch) {
        throw new BusinessError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(userId, hashedPassword);

    return { user_id: userId };
};

module.exports = { login, refresh, logout, changePassword };