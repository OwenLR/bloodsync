/**
 * bloodDriveService.js — Blood drive lifecycle orchestration.
 */

const bloodDriveModel = require('../repositories/bloodDriveModel');
const userModel       = require('../repositories/userModel');
const BusinessError   = require('../../utils/businessError');
const ROLES           = require('../../constants/roles');
const {
    computeDriveStatus,
    assertNotTerminal,
    assertCancellable,
    assertValidDateRange,
    assertStartNotInPast,
} = require('../domain/bloodDriveRules');

// ── Helpers ──────────────────────────────────────────────────

const getDriveWithCurrentStatus = async (drive_id) => {
    const drive = await bloodDriveModel.getDriveById(drive_id);
    if (!drive) return null;

    const computed = computeDriveStatus(drive);
    if (computed !== drive.status) {
        await bloodDriveModel.updateDriveStatus(drive_id, computed);
        drive.status = computed;
    }

    return drive;
};

const assertBranchOwnership = (user, target_branch_id) => {
    if (
        user.role_id === ROLES.PRC_STAFF &&
        user.branch_id !== Number(target_branch_id)
    ) {
        throw new BusinessError(
            'PRC Staff can only manage blood drives for their own branch',
            403
        );
    }
};

// ── Blood Drive CRUD ──────────────────────────────────────────

const getAllDrives = async () => {
    const drives = await bloodDriveModel.getAllDrives();
    return Promise.all(
        drives.map(async (drive) => {
            const computed = computeDriveStatus(drive);
            if (computed !== drive.status) {
                await bloodDriveModel.updateDriveStatus(drive.drive_id, computed);
                drive.status = computed;
            }
            return drive;
        })
    );
};

const getDriveById = async (drive_id) => {
    return getDriveWithCurrentStatus(drive_id);
};

const getDrivesByBranch = async (branch_id) => {
    const drives = await bloodDriveModel.getDrivesByBranch(branch_id);
    return Promise.all(
        drives.map(async (drive) => {
            const computed = computeDriveStatus(drive);
            if (computed !== drive.status) {
                await bloodDriveModel.updateDriveStatus(drive.drive_id, computed);
                drive.status = computed;
            }
            return drive;
        })
    );
};

const createDrive = async (data, reqUser) => {
    assertBranchOwnership(reqUser, data.branch_id);

    // Domain rules — wrap plain Error as BusinessError
    try {
        assertValidDateRange(data.start_datetime, data.end_datetime);
        assertStartNotInPast(data.start_datetime);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    return bloodDriveModel.createDrive({
        ...data,
        created_by: reqUser.user_id,
    });
};

const updateDrive = async (drive_id, data, reqUser) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    try {
        assertNotTerminal(drive);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    assertBranchOwnership(reqUser, drive.branch_id);

    const newStart = data.start_datetime || drive.start_datetime;
    const newEnd   = data.end_datetime   || drive.end_datetime;

    try {
        assertValidDateRange(newStart, newEnd);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    return bloodDriveModel.updateDrive(drive_id, data);
};

const cancelDrive = async (drive_id, reqUser, cancellation_reason) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    try {
        assertCancellable(drive);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    assertBranchOwnership(reqUser, drive.branch_id);

    return bloodDriveModel.cancelDrive(
        drive_id,
        reqUser.user_id,
        cancellation_reason || null
    );
};

// ── Participants ──────────────────────────────────────────────

const getParticipants = async (drive_id) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);
    return bloodDriveModel.getParticipantsByDrive(drive_id);
};

const addParticipant = async (drive_id, user_id, reqUser, role_notes) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    try {
        assertNotTerminal(drive);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    assertBranchOwnership(reqUser, drive.branch_id);

    const user = await userModel.getUserById(user_id);
    if (!user) throw new BusinessError('User not found', 404);

    if (user.status !== 'Active' || !user.is_active) {
        throw new BusinessError(
            `Cannot assign ${user.first_name} ${user.last_name} — account is not Active`,
            400
        );
    }

    if (![ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST].includes(user.role_id)) {
        throw new BusinessError(
            'Only Volunteers and Phlebotomists can be assigned to blood drives',
            400
        );
    }

    const existing = await bloodDriveModel.getParticipant(drive_id, user_id);
    if (existing) {
        throw new BusinessError(
            `${user.first_name} ${user.last_name} is already assigned to this drive`,
            400
        );
    }

    return bloodDriveModel.addParticipant(
        drive_id,
        user_id,
        reqUser.user_id,
        role_notes || null
    );
};

const removeParticipant = async (drive_id, user_id, reqUser) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    try {
        assertNotTerminal(drive);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    assertBranchOwnership(reqUser, drive.branch_id);

    const participant = await bloodDriveModel.getParticipant(drive_id, user_id);
    if (!participant) throw new BusinessError('Participant not found on this drive', 404);

    return bloodDriveModel.removeParticipant(drive_id, user_id);
};

const updateParticipantStatus = async (drive_id, user_id, assignment_status, reqUser) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    try {
        assertNotTerminal(drive);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    assertBranchOwnership(reqUser, drive.branch_id);

    const participant = await bloodDriveModel.getParticipant(drive_id, user_id);
    if (!participant) throw new BusinessError('Participant not found on this drive', 404);

    return bloodDriveModel.updateParticipantStatus(drive_id, user_id, assignment_status);
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