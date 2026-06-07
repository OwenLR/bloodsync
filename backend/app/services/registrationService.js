/**
 * registrationService.js — Volunteer, Phlebotomist, and Requestor
 * registration business logic.
 */

const pool          = require('../../config/db');
const bcrypt        = require('bcrypt');
const userModel     = require('../repositories/userModel');
const profileModel  = require('../repositories/profileModel');
const BusinessError = require('../../utils/businessError');
const ROLES         = require('../../constants/roles');

const registerRequestor = async (data) => {
    const { first_name, last_name, email, password, contact } = data;

    const existing = await userModel.getUserByEmail(email);
    if (existing) {
        throw new BusinessError('Email is already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.createUser(
        first_name,
        last_name,
        email,
        hashedPassword,
        ROLES.REQUESTOR,
        null
    );

    return user;
};

const register = async (data, role_id) => {
    const { first_name, last_name, email, password, ...profileData } = data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existing = await userModel.getUserByEmail(email);
        if (existing) {
            if (existing.status !== 'Declined') {
                throw new BusinessError('Email is already registered', 400);
            }
            await profileModel.deleteProfileByUserId(existing.user_id);
            await userModel.deleteUser(existing.user_id);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userModel.createPendingUser(
            first_name, last_name, email, hashedPassword, role_id
        );
        const profile = await profileModel.createProfile(user.user_id, profileData);

        await client.query('COMMIT');
        return { user, profile };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const approveRegistration = async (userId) => {
    const user = await userModel.getUserById(userId);
    if (!user) throw new BusinessError('User not found', 404);
    if (user.status !== 'Pending') {
        throw new BusinessError('Only Pending registrations can be approved', 400);
    }
    return userModel.updateUser(userId, { status: 'Active', is_active: true });
};

const declineRegistration = async (userId) => {
    const user = await userModel.getUserById(userId);
    if (!user) throw new BusinessError('User not found', 404);
    if (user.status !== 'Pending') {
        throw new BusinessError('Only Pending registrations can be declined', 400);
    }
    return userModel.updateUser(userId, { status: 'Declined', is_active: false });
};

module.exports = {
    registerRequestor,
    register,
    approveRegistration,
    declineRegistration,
};