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

const confirmParticipation = async (req, res) => {
    const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

    try {
        const { token, action } = req.query;

        if (!token || !['confirm', 'decline'].includes(action)) {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 style="color: #c0392b;">Invalid Request</h2>
                    <p>This confirmation link is invalid. Please contact your branch coordinator.</p>
                </div>
            `);
        }

        const result = await bloodDriveService.confirmParticipation(token, action);

        if (result.status === 'invalid') {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 style="color: #c0392b;">Link Already Used or Invalid</h2>
                    <p>This confirmation link has already been used or is invalid.</p>
                    <p>Please contact your branch coordinator if you need to change your response.</p>
                </div>
            `);
        }

        if (result.status === 'cancelled') {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 style="color: #c0392b;">Blood Drive Cancelled</h2>
                    <p>The blood drive <strong>${esc(result.drive_name)}</strong> has been cancelled.</p>
                    <p>No action is needed on your part.</p>
                </div>
            `);
        }

        const driveDate = new Date(result.start_datetime).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });

        if (result.status === 'confirm') {
            return res.status(200).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 style="color: #27ae60;">✓ Participation Confirmed</h2>
                    <p>Thank you, <strong>${esc(result.first_name)}</strong>!</p>
                    <p>You have confirmed your participation in <strong>${esc(result.drive_name)}</strong>.</p>
                    <p>See you on <strong>${esc(driveDate)}</strong> at <strong>${esc(result.venue_name)}</strong>.</p>
                    <p style="color: #888; font-size: 13px;">— Philippine Red Cross Batangas</p>
                </div>
            `);
        } else {
            return res.status(200).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 style="color: #c0392b;">Assignment Declined</h2>
                    <p>Hi <strong>${esc(result.first_name)}</strong>,</p>
                    <p>You have declined the assignment for <strong>${esc(result.drive_name)}</strong>.</p>
                    <p>If this was a mistake, please contact your branch coordinator directly.</p>
                    <p style="color: #888; font-size: 13px;">— Philippine Red Cross Batangas</p>
                </div>
            `);
        }
    } catch (error) {
        return res.status(500).send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center;">
                <h2 style="color: #c0392b;">Something Went Wrong</h2>
                <p>An unexpected error occurred. Please try again or contact your branch coordinator.</p>
            </div>
        `);
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
    confirmParticipation,
};