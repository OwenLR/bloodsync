/**
 * volunteerProfileController.js — Volunteer/Phlebotomist self-profile management.
 *
 * Volunteers and Phlebotomists can view their own profile and update
 * non-identity fields. Identity fields (first_name, last_name, birthdate, sex)
 * are locked at the validator level — not just the frontend.
 */

const profileModel = require('../repositories/profileModel');
const response     = require('../../utils/responseHelper');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const { validateUpdateVolunteerProfile } = require('../../validators/volunteerProfileValidator');

/**
 * GET /api/volunteers/me/profile
 * Returns the authenticated volunteer/phlebotomist's own profile.
 */
const getMyProfile = async (req, res) => {
    try {
        const profile = await profileModel.getProfileByUserId(req.user.user_id);
        if (!profile) return response.notFound(res, 'Profile not found');
        return response.success(res, profile);
    } catch (error) {
        return response.error(res, error.message);
    }
};

/**
 * PATCH /api/volunteers/me/profile
 * Update own profile. Identity fields are rejected by validator.
 * Profile image upload supported via multipart/form-data.
 */
const updateMyProfile = async (req, res) => {
    try {
        const errors = validateUpdateVolunteerProfile(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        let updateData = { ...req.body };

        if (req.file) {
            updateData.profile_img = await uploadToCloudinary(
                req.file.buffer,
                'profile_images'
            );
        }

        const profile = await profileModel.updateProfile(
            req.user.user_id,
            updateData
        );
        if (!profile) return response.notFound(res, 'Profile not found');

        return response.success(res, profile, 'Profile updated successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
};