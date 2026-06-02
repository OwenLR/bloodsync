const bloodCollectionModel = require('../models/bloodCollectionModel');
const bloodCollectionService = require('../services/bloodCollectionService');
const response = require('../../utils/responseHelper');
const {
    validateCreateCollection,
    validateUpdateCollectionStatus
} = require('../../validators/bloodCollectionValidator');

const getAllCollections = async (req, res) => {
    try {
        const collections = await bloodCollectionModel
            .getAllCollections();
        return response.success(res, collections);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getCollectionById = async (req, res) => {
    try {
        const collection = await bloodCollectionModel
            .getCollectionById(req.params.id);
        if (!collection) {
            return response.notFound(
                res,
                'Blood collection not found'
            );
        }
        return response.success(res, collection);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getCollectionsByBranch = async (req, res) => {
    try {
        const collections = await bloodCollectionModel
            .getCollectionsByBranch(req.params.branch_id);
        return response.success(res, collections);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createCollection = async (req, res) => {
    try {
        const errors = validateCreateCollection(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const collection = await bloodCollectionService
            .createCollection(req.body, req.user.user_id);

        return response.created(
            res,
            collection,
            'Blood collection recorded successfully'
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateCollectionStatus = async (req, res) => {
    try {
        const errors = validateUpdateCollectionStatus(req.body);
        if (errors.length > 0) {
            return response.badRequest(res, errors[0]);
        }

        const { status, reason } = req.body;
        let result;

        if (status === 'Safe') {
            result = await bloodCollectionService
                .markAsSafe(
                    req.params.id,
                    req.user.user_id
                );
        } else if (status === 'Rejected') {
            result = await bloodCollectionService
                .markAsRejected(
                    req.params.id,
                    reason,
                    req.user.user_id
                );
        } else {
            result = await bloodCollectionModel
                .updateCollectionStatus(
                    req.params.id,
                    status,
                    req.user.user_id,
                    reason
                );
        }

        return response.success(
            res,
            result,
            `Blood collection marked as ${status}`
        );
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllCollections,
    getCollectionById,
    getCollectionsByBranch,
    createCollection,
    updateCollectionStatus
};