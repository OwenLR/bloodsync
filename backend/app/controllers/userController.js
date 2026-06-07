const userModel   = require('../repositories/userModel');
const userService = require('../services/userService');
const response    = require('../../utils/responseHelper');
const {
    validateCreateUser,
    validateUpdateUser,
} = require('../../validators/userValidator');

const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.getAllUsers(req.query.status || null);
        return response.success(res, users);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.params.id);
        if (!user) return response.notFound(res, 'User not found');
        return response.success(res, user);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const createUser = async (req, res) => {
    try {
        const errors = validateCreateUser(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const user = await userService.createUser(req.body);
        return response.created(res, user, 'User created successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const updateUser = async (req, res) => {
    try {
        const errors = validateUpdateUser(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const user = await userModel.updateUser(req.params.id, req.body);
        if (!user) return response.notFound(res, 'User not found');
        return response.success(res, user, 'User updated successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await userModel.deleteUser(req.params.id);
        if (!user) return response.notFound(res, 'User not found');
        return response.success(res, user, 'User deleted successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};