const registrationService = require('../services/registrationService');
const profileModel = require('../repositories/profileModel');
const userModel = require('../repositories/userModel');
const bcrypt = require('bcrypt');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const response = require('../../utils/responseHelper');
const { validateRegistration } = require('../../validators/registrationValidator');
const ROLES = require('../../constants/roles');

const registerRequestor = async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        if (!first_name || first_name.trim() === '') return response.badRequest(res, 'first_name is required');
        if (!last_name || last_name.trim() === '') return response.badRequest(res, 'last_name is required');
        if (!email || email.trim() === '') return response.badRequest(res, 'email is required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.badRequest(res, 'email is invalid');
        if (!password || password.length < 8) return response.badRequest(res, 'password must be at least 8 characters');

        const existing = await userModel.getUserByEmail(email);
        if (existing) return response.badRequest(res, 'Email is already registered');

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.createUser(
            first_name, last_name, email,
            hashedPassword, ROLES.REQUESTOR, null
        );

        return response.created(res, {
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role_id: user.role_id,
            status: user.status,
        }, 'Requestor registered successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const registerVolunteer = async (req, res) => {
    try {
        const errors = validateRegistration(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        let profile_img = null;
        if (req.file) {
            profile_img = await uploadToCloudinary(req.file.buffer, 'profile_images');
        }

        const result = await registrationService.register(
            { ...req.body, profile_img },
            ROLES.VOLUNTEER
        );

        return response.created(res, result, 'Volunteer registration submitted. Pending admin approval.');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const registerPhlebotomist = async (req, res) => {
    try {
        const errors = validateRegistration(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        let profile_img = null;
        if (req.file) {
            profile_img = await uploadToCloudinary(req.file.buffer, 'profile_images');
        }

        const result = await registrationService.register(
            { ...req.body, profile_img },
            ROLES.PHLEBOTOMIST
        );

        return response.created(res, result, 'Phlebotomist registration submitted. Pending admin approval.');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const approveRegistration = async (req, res) => {
    try {
        const user = await registrationService.approveRegistration(req.params.id);
        return response.success(res, user, 'Registration approved successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const declineRegistration = async (req, res) => {
    try {
        const user = await registrationService.declineRegistration(req.params.id);
        return response.success(res, user, 'Registration declined');
    } catch (error) {
        return response.error(res, error.message);
    }
};

// GET /api/volunteers/pending — Admin only
// Calls profileModel directly — simple read, no business logic needed
const getPendingRegistrations = async (req, res) => {
    try {
        const profiles = await profileModel.getAllProfiles('Pending');
        return response.success(res, profiles);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getVolunteerProfile = async (req, res) => {
    try {
        const profile = await profileModel.getProfileByUserId(req.params.id);
        if (!profile) return response.notFound(res, 'Profile not found');
        return response.success(res, profile);
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    registerRequestor,
    registerVolunteer,
    registerPhlebotomist,
    approveRegistration,
    declineRegistration,
    getPendingRegistrations,
    getVolunteerProfile,
};