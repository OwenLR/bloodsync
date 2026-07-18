/**
 * bloodDriveService.js — Blood drive lifecycle orchestration.
 */

const bloodDriveModel = require('../repositories/bloodDriveModel');
const userModel       = require('../repositories/userModel');
const BusinessError   = require('../../utils/businessError');
const ROLES           = require('../../constants/roles');
const crypto          = require('crypto');
const {
    computeDriveStatus,
    assertNotTerminal,
    assertCancellable,
    assertValidDateRange,
    assertStartNotInPast,
} = require('../domain/bloodDriveRules');
const notificationService = require('./notificationService');

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

    const participant = await bloodDriveModel.addParticipant(
        drive_id,
        user_id,
        reqUser.user_id,
        role_notes || null
    );

    // Generate confirmation token and store it
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    await bloodDriveModel.setConfirmationToken(drive_id, user_id, confirmationToken);

    // Fire and forget — notification failure must not break assignment
    notificationService.notifyBloodDriveAssigned(
        {
            user_id:    user.user_id,
            first_name: user.first_name,
            email:      user.email,
        },
        {
            drive_id:           drive.drive_id,
            name:               drive.name,
            start_datetime:     drive.start_datetime,
            venue_name:         drive.venue_name,
            role:               role_notes || null,
            confirmation_token: confirmationToken,
        }
    ).catch((err) => console.error('notifyBloodDriveAssigned failed:', err));

    return participant;
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

const confirmParticipation = async (token, action) => {
    const participant = await bloodDriveModel.getParticipantByToken(token);
    if (!participant) return { status: 'invalid' };

    if (participant.drive_status === 'Cancelled') {
        return { status: 'cancelled', drive_name: participant.drive_name };
    }

    const newStatus = action === 'confirm' ? 'Confirmed' : 'Declined';
    await bloodDriveModel.updateParticipantStatus(
        participant.drive_id,
        participant.user_id,
        newStatus
    );
    await bloodDriveModel.clearConfirmationToken(
        participant.drive_id,
        participant.user_id
    );

    return {
        status:         action,
        first_name:     participant.first_name,
        drive_name:     participant.drive_name,
        start_datetime: participant.start_datetime,
        venue_name:     participant.venue_name,
    };
};

/**
 * getMyAssignments(user_id)
 * Returns every drive assignment for the calling Volunteer/Phlebotomist,
 * with each row's drive status recomputed the same way the list endpoints
 * do (getAllDrives/getDrivesByBranch) so a stale 'Upcoming'/'Ongoing' in
 * the DB shows correctly without waiting on some other request to have
 * triggered the write. Status drift correction still persists via
 * updateDriveStatus, same as elsewhere in this file, but this function
 * itself performs no assignment-status mutation.
 * Frontend splits into Incoming (assignment_status = 'Assigned') vs
 * History (Confirmed/Declined/No Show) tabs — no backend filtering, same
 * "return everything scoped to the caller" pattern as the Blood Requests
 * my-requests endpoint.
 */
const getMyAssignments = async (user_id) => {
    const assignments = await bloodDriveModel.getAssignmentsByUser(user_id);
    return Promise.all(
        assignments.map(async (row) => {
            const computed = computeDriveStatus(row);
            if (computed !== row.status) {
                await bloodDriveModel.updateDriveStatus(row.drive_id, computed);
                row.status = computed;
            }
            return row;
        })
    );
};

/**
 * updateMyParticipationStatus(drive_id, reqUser, assignment_status)
 * Self-service accept/decline from the "My Assignments" web page — the
 * authenticated counterpart to confirmParticipation() above, which is
 * the token-based email-link path. Both paths remain available per
 * product decision; this one clears confirmation_token too, so using
 * the web path invalidates that assignment's email link the same way
 * using the email link already invalidates itself.
 * Restricted at the validator level (validateSelfUpdateParticipant) to
 * only ever pass 'Confirmed' or 'Declined' — 'Assigned'/'No Show' stay
 * reachable only through the existing Admin/Staff route.
 * Looks up the participant row by (drive_id, reqUser.user_id) — never a
 * body/param user_id — so a Volunteer/Phlebotomist can only ever act on
 * their own assignment.
 */
const updateMyParticipationStatus = async (drive_id, reqUser, assignment_status) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    try {
        assertNotTerminal(drive);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    const participant = await bloodDriveModel.getParticipant(drive_id, reqUser.user_id);
    if (!participant) {
        throw new BusinessError('You are not assigned to this blood drive', 404);
    }

    const updated = await bloodDriveModel.updateParticipantStatus(
        drive_id,
        reqUser.user_id,
        assignment_status
    );

    await bloodDriveModel.clearConfirmationToken(drive_id, reqUser.user_id);

    return updated;
};

/**
 * getDriveStats(drive_id)
 * Returns aggregate counts for the drive monitoring dashboard.
 * Read-only — no mutations.
 */
const getDriveStats = async (drive_id) => {
    const drive = await getDriveWithCurrentStatus(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    const raw = await bloodDriveModel.getDriveStats(drive_id);

    // pg returns COUNT columns as strings — convert to plain integers here
    // in the service, not the repository (repositories return raw data only)
    const stats = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, v === null ? 0 : parseInt(v, 10)])
    );

    return { drive_id: Number(drive_id), ...stats };
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
    getMyAssignments,
    updateMyParticipationStatus,
    getDriveStats,
};