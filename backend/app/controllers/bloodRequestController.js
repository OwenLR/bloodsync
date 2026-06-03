const bloodRequestService = require('../services/bloodRequestService');
const bloodRequestModel = require('../models/bloodRequestModel');
const response = require('../../utils/responseHelper');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const {
    validateCreateRequest,
    validateUpdateRequestStatus,
} = require('../../validators/bloodRequestValidator');

const getAllRequests = async (req, res) => {
    try {
        const requests = await bloodRequestModel.getAllRequests();
        return response.success(res, requests);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getRequestById = async (req, res) => {
    try {
        const request = await bloodRequestModel.getRequestById(req.params.id);
        if (!request) return response.notFound(res, 'Blood request not found');

        const items = await bloodRequestModel.getItemsByRequest(req.params.id);
        const reservations = await bloodRequestModel.getReservationsByRequest(req.params.id);
        const logs = await bloodRequestModel.getStatusLogsByRequest(req.params.id);

        return response.success(res, { ...request, items, reservations, logs });
    } catch (error) {
        return response.error(res, error.message);
    }
};

const getMyRequests = async (req, res) => {
    try {
        const requests = await bloodRequestModel.getRequestsByRequestor(
            req.requestor.requestor_id
        );
        return response.success(res, requests);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const createRequest = async (req, res) => {
    try {
        const { items, ...requestData } = req.body;

        // items comes as JSON string when using multipart/form-data
        const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

        const errors = validateCreateRequest({ ...requestData, items: parsedItems });
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        let request_form_path = null;
        if (req.file) {
            request_form_path = await uploadToCloudinary(req.file.buffer, 'request_forms');
        }

        const result = await bloodRequestService.createRequest(
            { ...requestData, request_form_path },
            parsedItems,
            req.requestor.requestor_id
        );

        return response.created(res, result, 'Blood request submitted successfully');
    } catch (error) {
        return response.error(res, error.message);
    }
};

const updateRequestStatus = async (req, res) => {
    try {
        const errors = validateUpdateRequestStatus(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const { status, denial_reason } = req.body;

        const result = await bloodRequestService.updateStatus(
            req.params.id,
            status,
            req.user.user_id,
            denial_reason
        );

        return response.success(res, result, `Request ${status.toLowerCase()} successfully`);
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getAllRequests,
    getRequestById,
    getMyRequests,
    createRequest,
    updateRequestStatus,
};