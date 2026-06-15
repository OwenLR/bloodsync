const registrationService = require('../services/registrationService');
const profileModel = require('../repositories/profileModel');
const response = require('../../utils/responseHelper');
const {
    validateRequestorRegistration,
    validateRegistration,
} = require('../../validators/registrationValidator');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const ROLES = require('../../constants/roles');

const registerRequestor = async (req, res) => {
    try {
        const errors = validateRequestorRegistration(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const user = await registrationService.registerRequestor(req.body);
        return response.created(res, {
            user_id:    user.user_id,
            first_name: user.first_name,
            last_name:  user.last_name,
            email:      user.email,
            role_id:    user.role_id,
            status:     user.status,
        }, 'Requestor registered successfully');
    } catch (error) {
        return response.badRequest(res, error.message);
    }
};

const registerVolunteer = async (req, res) => {
    try {
        const errors = validateRegistration(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const profile_img = req.file
            ? await uploadToCloudinary(req.file.buffer, 'profile_images')
            : null;

        const result = await registrationService.register(
            { ...req.body, profile_img },
            ROLES.VOLUNTEER
        );
        return response.created(
            res,
            result,
            'Volunteer registration submitted. Pending admin approval.'
        );
    } catch (error) {
        return response.badRequest(res, error.message);
    }
};

const registerPhlebotomist = async (req, res) => {
    try {
        const errors = validateRegistration(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const profile_img = req.file
            ? await uploadToCloudinary(req.file.buffer, 'profile_images')
            : null;

        const result = await registrationService.register(
            { ...req.body, profile_img },
            ROLES.PHLEBOTOMIST
        );
        return response.created(
            res,
            result,
            'Phlebotomist registration submitted. Pending admin approval.'
        );
    } catch (error) {
        return response.badRequest(res, error.message);
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

// Simple read — no business logic, direct repository call is correct here
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

const getAvailableVolunteers = async (req, res) => {
    try {
        // Optional filters: ?role=5 or ?role=6, ?municipality=Batangas City
        const roleId       = req.query.role         ? parseInt(req.query.role) : null;
        const municipality = req.query.municipality || null;

        const profiles = await profileModel.getAvailableVolunteers(roleId, municipality);
        return response.success(res, profiles);
    } catch (error) {
        return response.handleError(res, error);
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
    getAvailableVolunteers,
};