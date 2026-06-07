const bloodCollectionModel   = require('../repositories/bloodCollectionModel');
const bloodCollectionService = require('../services/bloodCollectionService');
const response               = require('../../utils/responseHelper');
const {
    validateCreateCollection,
    validateUpdateCollectionStatus,
} = require('../../validators/bloodCollectionValidator');

const getAllCollections = async (req, res) => {
    try {
        const collections = await bloodCollectionModel.getAllCollections();
        return response.success(res, collections);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getCollectionById = async (req, res) => {
    try {
        const collection = await bloodCollectionModel.getCollectionById(req.params.id);
        if (!collection) return response.notFound(res, 'Blood collection not found');
        return response.success(res, collection);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getCollectionsByBranch = async (req, res) => {
    try {
        const collections = await bloodCollectionModel.getCollectionsByBranch(
            req.params.branch_id
        );
        return response.success(res, collections);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const createCollection = async (req, res) => {
    try {
        const errors = validateCreateCollection(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const collection = await bloodCollectionService.createCollection(
            req.body,
            req.user.user_id,
            req.user,       // full user object for role check
            req.drive_id    // active drive from bloodDriveMiddleware (null for staff)
        );
        return response.created(res, collection, 'Blood collection recorded successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const updateCollectionStatus = async (req, res) => {
    try {
        const errors = validateUpdateCollectionStatus(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const result = await bloodCollectionService.updateStatus(
            req.params.id,
            req.body.status,
            req.body.reason,
            req.user.user_id
        );
        return response.success(res, result, `Blood collection marked as ${req.body.status}`);
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllCollections,
    getCollectionById,
    getCollectionsByBranch,
    createCollection,
    updateCollectionStatus,
};