const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');

const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.getAllUsers();
        res.status(200).json({
            status: 'success',
            data: users
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password, role_id, branch_id } = req.body;

        if (!first_name || !last_name || !email || !password || !role_id) {
            return res.status(400).json({
                status: 'error',
                message: 'first_name, last_name, email, password and role_id are required'
            });
        }

        // Check if email already exists
        const existing = await userModel.getUserByEmail(email);
        if (existing) {
            return res.status(400).json({
                status: 'error',
                message: 'Email already exists'
            });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.createUser(
            first_name,
            last_name,
            email,
            hashedPassword,
            role_id,
            branch_id || null
        );

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const fields = req.body;
        if (Object.keys(fields).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }

        const user = await userModel.updateUser(req.params.id, fields);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await userModel.deleteUser(req.params.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};