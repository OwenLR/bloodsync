const branchModel = require('../models/branchModel');
const response = require('../../utils/responseHelper');

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
        const { branch_name, location } = req.body;
        if (!branch_name || !location) {
            return response.badRequest(
                res,
                'branch_name and location are required'
            );
        }
        const branch = await branchModel.createBranch(
            branch_name,
            location
        );
        return response.created(
            res,
            branch,
            'Branch created successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateBranch = async (req, res) => {
    try {
        const { branch_name, location } = req.body;
        if (!branch_name && !location) {
            return response.badRequest(
                res,
                'At least one field required to update'
            );
        }
        const branch = await branchModel.updateBranch(
            req.params.id,
            branch_name,
            location
        );
        if (!branch) return response.notFound(res, 'Branch not found');
        return response.success(
            res,
            branch,
            'Branch updated successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const deleteBranch = async (req, res) => {
    try {
        const branch = await branchModel.deleteBranch(req.params.id);
        if (!branch) return response.notFound(res, 'Branch not found');
        return response.success(
            res,
            branch,
            'Branch deleted successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
};