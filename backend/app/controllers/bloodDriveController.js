const bloodDriveService = require('../services/bloodDriveService');
const response          = require('../../utils/responseHelper');
const {
    validateCreateDrive,
    validateUpdateDrive,
    validateCancelDrive,
    validateAddParticipant,
    validateUpdateParticipant,
} = require('../../validators/bloodDriveValidator');

const getAllDrives = async (req, res) => {
    try {
        const drives = await bloodDriveService.getAllDrives();
        return response.success(res, drives);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getDriveById = async (req, res) => {
    try {
        const drive = await bloodDriveService.getDriveById(req.params.id);
        if (!drive) return response.notFound(res, 'Blood drive not found');
        return response.success(res, drive);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getDrivesByBranch = async (req, res) => {
    try {
        const drives = await bloodDriveService.getDrivesByBranch(req.params.branch_id);
        return response.success(res, drives);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const createDrive = async (req, res) => {
    try {
        const errors = validateCreateDrive(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const drive = await bloodDriveService.createDrive(req.body, req.user);
        return response.created(res, drive, 'Blood drive created successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const updateDrive = async (req, res) => {
    try {
        const errors = validateUpdateDrive(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const drive = await bloodDriveService.updateDrive(req.params.id, req.body, req.user);
        return response.success(res, drive, 'Blood drive updated successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const cancelDrive = async (req, res) => {
    try {
        const errors = validateCancelDrive(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const drive = await bloodDriveService.cancelDrive(
            req.params.id,
            req.user,
            req.body.cancellation_reason || null
        );
        return response.success(res, drive, 'Blood drive cancelled');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getParticipants = async (req, res) => {
    try {
        const participants = await bloodDriveService.getParticipants(req.params.id);
        return response.success(res, participants);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const addParticipant = async (req, res) => {
    try {
        const errors = validateAddParticipant(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const participant = await bloodDriveService.addParticipant(
            req.params.id,
            req.body.user_id,
            req.user,
            req.body.role_notes || null
        );
        return response.created(res, participant, 'Participant assigned successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const removeParticipant = async (req, res) => {
    try {
        const removed = await bloodDriveService.removeParticipant(
            req.params.id,
            req.params.user_id,
            req.user
        );
        return response.success(res, removed, 'Participant removed successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const updateParticipantStatus = async (req, res) => {
    try {
        const errors = validateUpdateParticipant(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const updated = await bloodDriveService.updateParticipantStatus(
            req.params.id,
            req.params.user_id,
            req.body.assignment_status,
            req.user
        );
        return response.success(res, updated, 'Participant status updated');
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getAllDrives,
    getDriveById,
    getDrivesByBranch,
    createDrive,
    updateDrive,
    cancelDrive,
    getParticipants,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
};