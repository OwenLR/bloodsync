const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const response = require('../../utils/responseHelper');
const {
    validateCreateUser,
    validateUpdateUser
} = require('../../validators/userValidator');

const getAllUsers = async (req, res) => {
    try {
        const { status } = req.query; // ?status=Pending
        const users = await userModel.getAllUsers(status || null);
        return response.success(res, users);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.params.id);
        if (!user) return response.notFound(res, 'User not found');
        return response.success(res, user);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createUser = async (req, res) => {
    try {
        const errors = validateCreateUser(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const existing = await userModel
            .getUserByEmail(req.body.email);
        if (existing) {
            return response.badRequest(res, 'Email already exists');
        }

        const hashedPassword = await bcrypt.hash(
            req.body.password, 10
        );

        const user = await userModel.createUser(
            req.body.first_name,
            req.body.last_name,
            req.body.email,
            hashedPassword,
            req.body.role_id,
            req.body.branch_id || null
        );

        return response.created(
            res,
            user,
            'User created successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateUser = async (req, res) => {
    try {
        const errors = validateUpdateUser(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const user = await userModel.updateUser(
            req.params.id,
            req.body
        );
        if (!user) return response.notFound(res, 'User not found');
        return response.success(res, user, 'User updated successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await userModel.deleteUser(req.params.id);
        if (!user) return response.notFound(res, 'User not found');
        return response.success(res, user, 'User deleted successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};