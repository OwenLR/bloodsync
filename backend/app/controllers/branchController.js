const branchModel = require('../repositories/branchModel');
const response = require('../../utils/responseHelper');
const {
    validateCreateBranch,
    validateUpdateBranch,
} = require('../../validators/branchValidator');

const getAllBranches = async (req, res) => {
    try {
        const branches = await branchModel.getAllBranches();
        return response.success(res, branches);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getBranchById = async (req, res) => {
    try {
        const branch = await branchModel.getBranchById(req.params.id);
        if (!branch) return response.notFound(res, 'Branch not found');
        return response.success(res, branch);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createBranch = async (req, res) => {
    try {
        const errors = validateCreateBranch(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const branch = await branchModel.createBranch(
            req.body.branch_name,
            req.body.location
        );
        return response.created(res, branch, 'Branch created successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateBranch = async (req, res) => {
    try {
        const errors = validateUpdateBranch(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const branch = await branchModel.updateBranch(
            req.params.id,
            req.body.branch_name,
            req.body.location
        );
        if (!branch) return response.notFound(res, 'Branch not found');
        return response.success(res, branch, 'Branch updated successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const deleteBranch = async (req, res) => {
    try {
        const branch = await branchModel.deleteBranch(req.params.id);
        if (!branch) return response.notFound(res, 'Branch not found');
        return response.success(res, branch, 'Branch deleted successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
};