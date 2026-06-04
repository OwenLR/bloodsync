const roleModel = require('../repositories/roleModel');
const response = require('../../utils/responseHelper');

const getAllRoles = async (req, res) => {
    try {
        const roles = await roleModel.getAllRoles();
        return response.success(res, roles);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getRoleById = async (req, res) => {
    try {
        const role = await roleModel.getRoleById(req.params.id);
        if (!role) return response.notFound(res, 'Role not found');
        return response.success(res, role);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        if (!role_name) {
            return response.badRequest(res, 'role_name is required');
        }
        const role = await roleModel.createRole(role_name);
        return response.created(res, role, 'Role created successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        if (!role_name) {
            return response.badRequest(res, 'role_name is required');
        }
        const role = await roleModel.updateRole(
            req.params.id,
            role_name
        );
        if (!role) return response.notFound(res, 'Role not found');
        return response.success(res, role, 'Role updated successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const deleteRole = async (req, res) => {
    try {
        const role = await roleModel.deleteRole(req.params.id);
        if (!role) return response.notFound(res, 'Role not found');
        return response.success(res, role, 'Role deleted successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};