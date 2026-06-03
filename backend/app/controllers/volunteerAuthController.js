const volunteerService = require('../services/volunteerService');
const volunteerProfileModel = require('../models/volunteerProfileModel');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const response = require('../../utils/responseHelper');
const { validateVolunteerRegister } = require('../../validators/volunteerValidator');
const ROLES = require('../../constants/roles');

// POST /api/volunteers/register
const registerVolunteer = async (req, res) => {
    try {
        const errors = validateVolunteerRegister(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        let profile_img = null;
        if (req.file) {
            profile_img = await uploadToCloudinary(req.file.buffer, 'profile_images');
        }

        const result = await volunteerService.register(
            { ...req.body, profile_img },
            ROLES.VOLUNTEER
        );

        return response.created(res, result, 'Volunteer registration submitted. Pending admin approval.');
    } catch (error) {
        return response.error(res, error.message);
    }
};

// POST /api/phlebotomists/register
const registerPhlebotomist = async (req, res) => {
    try {
        const errors = validateVolunteerRegister(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        let profile_img = null;
        if (req.file) {
            profile_img = await uploadToCloudinary(req.file.buffer, 'profile_images');
        }

        const result = await volunteerService.register(
            { ...req.body, profile_img },
            ROLES.PHLEBOTOMIST
        );

        return response.created(res, result, 'Phlebotomist registration submitted. Pending admin approval.');
    } catch (error) {
        return response.error(res, error.message);
    }
};

// PATCH /api/volunteers/:id/approve — Admin only
const approveRegistration = async (req, res) => {
    try {
        const user = await volunteerService.approveRegistration(req.params.id);
        return response.success(res, user, 'Registration approved successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

// PATCH /api/volunteers/:id/decline — Admin only
const declineRegistration = async (req, res) => {
    try {
        const user = await volunteerService.declineRegistration(req.params.id);
        return response.success(res, user, 'Registration declined');
    } catch (error) {
        return response.error(res, error.message);
    }
};

// GET /api/volunteers/pending — Admin only
const getPendingRegistrations = async (req, res) => {
    try {
        const profiles = await volunteerProfileModel.getAllProfiles('Pending');
        return response.success(res, profiles);
    } catch (error) {
        return response.error(res, error.message);
    }
};

// GET /api/volunteers/:id/profile — Admin only
const getVolunteerProfile = async (req, res) => {
    try {
        const profile = await volunteerProfileModel.getProfileByUserId(req.params.id);
        if (!profile) return response.notFound(res, 'Profile not found');
        return response.success(res, profile);
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    registerVolunteer,
    registerPhlebotomist,
    approveRegistration,
    declineRegistration,
    getPendingRegistrations,
    getVolunteerProfile,
};