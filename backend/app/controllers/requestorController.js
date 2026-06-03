const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const requestorModel = require('../models/requestorModel');
const response = require('../../utils/responseHelper');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const {
    validateCreateRequestor,
    validateLoginRequestor,
} = require('../../validators/bloodRequestValidator');

const LOCK_DURATION_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 5;

const register = async (req, res) => {
    try {
        const errors = validateCreateRequestor(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const existing = await requestorModel.getRequestorByEmail(req.body.email);
        if (existing) return response.badRequest(res, 'Email is already registered');

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const requestor = await requestorModel.createRequestor({
            ...req.body,
            password: hashedPassword,
        });

        return response.created(res, requestor, 'Requestor registered successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const login = async (req, res) => {
    try {
        const errors = validateLoginRequestor(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const { email, password } = req.body;

        const requestor = await requestorModel.getRequestorByEmail(email);
        if (!requestor) return response.unauthorized(res, 'Invalid email or password');

        if (!requestor.is_active) {
            return response.unauthorized(res, 'Account is deactivated. Contact administrator.');
        }

        // Check if account is locked
        if (requestor.locked_until && new Date(requestor.locked_until) > new Date()) {
            return response.unauthorized(
                res,
                `Account locked. Try again after ${new Date(requestor.locked_until).toLocaleTimeString()}`
            );
        }

        const isPasswordValid = await bcrypt.compare(password, requestor.password);

        if (!isPasswordValid) {
            await requestorModel.incrementLoginAttempts(requestor.requestor_id);

            const updatedAttempts = requestor.login_attempts + 1;
            if (updatedAttempts >= MAX_LOGIN_ATTEMPTS) {
                const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
                await requestorModel.lockRequestor(requestor.requestor_id, lockedUntil);
                return response.unauthorized(
                    res,
                    `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`
                );
            }

            return response.unauthorized(res, 'Invalid email or password');
        }

        // Successful login — reset attempts and update last login
        await requestorModel.resetLoginAttempts(requestor.requestor_id);
        await requestorModel.updateLastLogin(requestor.requestor_id);

        const token = jwt.sign(
            {
                requestor_id: requestor.requestor_id,
                email: requestor.email,
                role: 'requestor',
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token,
            requestor: {
                requestor_id: requestor.requestor_id,
                first_name: requestor.first_name,
                last_name: requestor.last_name,
                email: requestor.email,
                hospital_id: requestor.hospital_id,
            },
        });
    } catch (error) {
        return response.error(res, error.message);
    }
};

const logout = async (req, res) => {
    return response.success(res, null, 'Logged out successfully');
};

const getProfile = async (req, res) => {
    try {
        const requestor = await requestorModel.getRequestorById(
            req.requestor.requestor_id
        );
        if (!requestor) return response.notFound(res, 'Requestor not found');
        return response.success(res, requestor);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateProfile = async (req, res) => {
    try {
        let profile_img = undefined;

        if (req.file) {
            profile_img = await uploadToCloudinary(req.file.buffer, 'profile_images');
        }

        const requestor = await requestorModel.updateRequestor(
            req.requestor.requestor_id,
            { ...req.body, profile_img }
        );
        if (!requestor) return response.notFound(res, 'Requestor not found');
        return response.success(res, requestor, 'Profile updated successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

// Admin only
const getAllRequestors = async (req, res) => {
    try {
        const requestors = await requestorModel.getAllRequestors();
        return response.success(res, requestors);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getRequestorById = async (req, res) => {
    try {
        const requestor = await requestorModel.getRequestorById(req.params.id);
        if (!requestor) return response.notFound(res, 'Requestor not found');
        return response.success(res, requestor);
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    getAllRequestors,
    getRequestorById,
};