const bloodRequestService  = require('../services/bloodRequestService');
const fulfillmentService   = require('../services/fulfillmentService');
const bloodRequestModel    = require('../repositories/bloodRequestModel');
const response             = require('../../utils/responseHelper');
const { uploadToCloudinary } = require('../../utils/uploadHelper');
const {
    validateCreateRequest,
    validateUpdateRequestStatus,
    validateFulfillmentOptions,
} = require('../../validators/bloodRequestValidator');

// ── Staff / Admin ─────────────────────────────────────────────────────────────

const getAllRequests = async (req, res) => {
    try {
        const requests = await bloodRequestModel.getAllRequests();
        return response.success(res, requests);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getRequestById = async (req, res) => {
    try {
        const request = await bloodRequestModel.getRequestById(req.params.id);
        if (!request) return response.notFound(res, 'Blood request not found');

        const items        = await bloodRequestModel.getItemsByRequest(req.params.id);
        const reservations = await bloodRequestModel.getReservationsByRequest(req.params.id);
        const logs         = await bloodRequestModel.getStatusLogsByRequest(req.params.id);

        return response.success(res, { ...request, items, reservations, logs });
    } catch (error) {
        return response.handleError(res, error);
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
        return response.handleError(res, error);
    }
};

// ── Requestor ─────────────────────────────────────────────────────────────────

const getMyRequests = async (req, res) => {
    try {
        const requests = await bloodRequestModel.getRequestsByUser(
            req.user.user_id
        );
        return response.success(res, requests);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const createRequest = async (req, res) => {
    try {
        const { items, ...requestData } = req.body;
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
            req.user.user_id
        );

        return response.created(res, result, 'Blood request submitted successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

/**
 * POST /api/blood-requests/fulfillment-options
 * Returns branch availability and split vs single-branch recommendation.
 * Called before submission so the mobile app can show the requestor their options.
 *
 * Body: { items: [...], latitude, longitude }
 */
const getFulfillmentOptions = async (req, res) => {
    try {
        const { items, latitude, longitude } = req.body;
        const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

        const errors = validateFulfillmentOptions({ items: parsedItems, latitude, longitude });
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const result = await fulfillmentService.getFulfillmentOptions(
            parsedItems,
            latitude,
            longitude
        );

        return response.success(res, result, 'Fulfillment options retrieved');
    } catch (error) {
        return response.handleError(res, error);
    }
};

/**
 * GET /api/blood-requests/estimate/:branch_id
 * Returns dynamic waiting time estimate based on pending queue depth.
 */
const getWaitingTimeEstimate = async (req, res) => {
    try {
        const result = await fulfillmentService.getWaitingTimeEstimate(
            req.params.branch_id
        );
        return response.success(res, result, 'Waiting time estimate retrieved');
    } catch (error) {
        return response.handleError(res, error);
    }
};

/**
 * PATCH /api/blood-requests/:id/cancel
 * Requestor self-cancel — only allowed when status is Pending.
 */
const cancelRequest = async (req, res) => {
    try {
        const result = await bloodRequestService.cancelRequest(
            req.params.id,
            req.user.user_id
        );
        return response.success(res, result, 'Blood request cancelled successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllRequests,
    getRequestById,
    getMyRequests,
    createRequest,
    updateRequestStatus,
    getFulfillmentOptions,
    getWaitingTimeEstimate,
    cancelRequest,
};