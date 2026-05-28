const roleModel = require('../models/roleModel');

const getAllRoles = async (req, res) => {
    try {
        const roles = await roleModel.getAllRoles();
        res.status(200).json({
            status: 'success',
            data: roles
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getRoleById = async (req, res) => {
    try {
        const role = await roleModel.getRoleById(req.params.id);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: role
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        if (!role_name) {
            return res.status(400).json({
                status: 'error',
                message: 'role_name is required'
            });
        }
        const role = await roleModel.createRole(role_name);
        res.status(201).json({
            status: 'success',
            message: 'Role created successfully',
            data: role
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        if (!role_name) {
            return res.status(400).json({
                status: 'error',
                message: 'role_name is required'
            });
        }
        const role = await roleModel.updateRole(req.params.id, role_name);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Role updated successfully',
            data: role
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const deleteRole = async (req, res) => {
    try {
        const role = await roleModel.deleteRole(req.params.id);
        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Role not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Role deleted successfully',
            data: role
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};