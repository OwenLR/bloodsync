/**
 * userService.js — Admin/PRC Staff user business logic.
 *
 * createUser()           — Admin creating other Admin/PRC Staff accounts.
 *                          Password is auto-generated (12-char alphanumeric)
 *                          and sent to the new user via welcome email.
 *                          Admin does NOT supply a password in the request.
 * updateOwnProfileImg()  — self-service profile photo update (Admin + PRC Staff)
 *
 * Note: self-service password change lives in authService.js instead —
 * password verification/hashing is identical regardless of role, so it is
 * shared by all roles under /api/auth/me/password rather than duplicated
 * here under /api/users (which is otherwise Admin-only management of
 * OTHER users' accounts, not self-service).
 */

const crypto                 = require('crypto');
const bcrypt                 = require('bcrypt');
const userModel              = require('../repositories/userModel');
const BusinessError          = require('../../utils/businessError');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const { sendEmail }          = require('../email/emailService');
const { adminWelcomeEmail }  = require('../email/emailTemplates');

// Generates a cryptographically random 12-character alphanumeric password.
// Uses crypto.randomBytes for randomness, filters to [A-Za-z0-9] only.
const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    while (password.length < 12) {
        const bytes = crypto.randomBytes(16);
        for (const byte of bytes) {
            // Reject values that would create modulo bias for a 62-char alphabet
            if (byte < 248 && password.length < 12) {
                password += chars[byte % chars.length];
            }
        }
    }
    return password;
};

const createUser = async (data) => {
    const { first_name, last_name, email, role_id, branch_id } = data;

    const existing = await userModel.getUserByEmail(email);
    if (existing) {
        throw new BusinessError('Email already exists', 400);
    }

    const plainPassword  = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await userModel.createUser(
        first_name,
        last_name,
        email,
        hashedPassword,
        role_id,
        branch_id || null
    );

    // Fetch role name for the email — role_id 1 = Admin, 2 = PRC Staff
    const roleNames = { 1: 'Admin', 2: 'PRC Staff' };
    const role_name = roleNames[Number(role_id)] || 'Staff';

    // Fire-and-forget — account is created regardless of email delivery
    sendEmail({
        to:      email,
        subject: 'Your BloodSync Account Has Been Created',
        html:    adminWelcomeEmail({
            name:      `${first_name} ${last_name}`,
            email,
            password:  plainPassword,
            role_name,
        }),
    }).catch((err) => {
        console.error('[userService] Welcome email failed to send:', err.message);
    });

    return user;
};

// Self-service profile photo update — Admin + PRC Staff only.
// Uploads to Cloudinary, then upserts the URL into staff_profiles.
// (Volunteer/Phlebotomist have their own equivalent via
// PATCH /api/volunteers/me/profile + volunteer_profiles.profile_img)
const updateOwnProfileImg = async (userId, fileBuffer) => {
    if (!fileBuffer) {
        throw new BusinessError('No file uploaded', 400);
    }

    const imageUrl = await uploadToCloudinary(fileBuffer, 'profile_images');
    const profile  = await userModel.upsertStaffProfileImg(userId, imageUrl);

    return profile;
};

module.exports = {
    createUser,
    updateOwnProfileImg,
};