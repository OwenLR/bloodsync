const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const userModel = require('../repositories/userModel');
const profileModel = require('../repositories/profileModel');

/**
 * Register a volunteer or phlebotomist.
 * If email exists and status = Declined → delete old user + profile, create fresh.
 * If email exists and status != Declined → reject.
 * Creates user (Pending) + profile atomically in a transaction.
 */
const register = async (data, role_id) => {
    const {
        first_name, last_name, email, password,
        ...profileData
    } = data;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if email already exists
        const existing = await userModel.getUserByEmail(email);

        if (existing) {
            if (existing.status !== 'Declined') {
                throw new Error('Email is already registered');
            }
            // Declined — delete old profile and user, allow re-registration
            await profileModel.deleteProfileByUserId(existing.user_id);
            await userModel.deleteUser(existing.user_id);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.createPendingUser(
            first_name, last_name, email, hashedPassword, role_id
        );

        const profile = await profileModel.createProfile(
            user.user_id, profileData
        );

        await client.query('COMMIT');

        return { user, profile };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Admin approves a volunteer/phlebotomist.
 * Sets status = Active, is_active = true.
 */
const approveRegistration = async (userId) => {
    const user = await userModel.getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.status !== 'Pending') throw new Error('Only Pending registrations can be approved');

    const updated = await userModel.updateUser(userId, {
        status: 'Active',
        is_active: true,
    });

    return updated;
};

/**
 * Admin declines a volunteer/phlebotomist.
 * Sets status = Declined, is_active = false.
 * Record is kept for audit.
 */
const declineRegistration = async (userId) => {
    const user = await userModel.getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.status !== 'Pending') throw new Error('Only Pending registrations can be declined');

    const updated = await userModel.updateUser(userId, {
        status: 'Declined',
        is_active: false,
    });

    return updated;
};

module.exports = {
    register,
    approveRegistration,
    declineRegistration,
};