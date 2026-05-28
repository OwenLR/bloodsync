const branchModel = require('../models/branchModel');

const getAllBranches = async (req, res) => {
    try {
        const branches = await branchModel.getAllBranches();
        res.status(200).json({
            status: 'success',
            data: branches
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getBranchById = async (req, res) => {
    try {
        const branch = await branchModel.getBranchById(req.params.id);
        if (!branch) {
            return res.status(404).json({
                status: 'error',
                message: 'Branch not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: branch
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const createBranch = async (req, res) => {
    try {
        const { branch_name, location } = req.body;
        if (!branch_name || !location) {
            return res.status(400).json({
                status: 'error',
                message: 'branch_name and location are required'
            });
        }
        const branch = await branchModel.createBranch(branch_name, location);
        res.status(201).json({
            status: 'success',
            message: 'Branch created successfully',
            data: branch
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const updateBranch = async (req, res) => {
    try {
        const { branch_name, location } = req.body;
        if (!branch_name && !location) {
            return res.status(400).json({
                status: 'error',
                message: 'At least one field required to update'
            });
        }
        const branch = await branchModel.updateBranch(
            req.params.id,
            branch_name,
            location
        );
        if (!branch) {
            return res.status(404).json({
                status: 'error',
                message: 'Branch not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Branch updated successfully',
            data: branch
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const deleteBranch = async (req, res) => {
    try {
        const branch = await branchModel.deleteBranch(req.params.id);
        if (!branch) {
            return res.status(404).json({
                status: 'error',
                message: 'Branch not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Branch deleted successfully',
            data: branch
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
};