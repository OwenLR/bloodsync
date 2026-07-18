/**
 * bloodDriveValidator.js — Technical input validation for blood drive routes.
 * Business rules (date range logic, branch ownership) belong in the service/domain.
 */

const { VENUE_TYPES, PARTICIPANT_STATUSES } = require('../constants/statuses');

// Statuses a Volunteer/Phlebotomist may set on their OWN assignment via
// the self-service route. Deliberately narrower than PARTICIPANT_STATUSES
// (which also includes 'Assigned' and 'No Show') — those two remain
// reachable only through the existing Admin/Staff route.
const SELF_SERVICE_STATUSES = ['Confirmed', 'Declined'];

/**
 * Validate blood drive creation payload.
 * Required: name, branch_id, start_datetime, end_datetime
 * Everything else is optional.
 */
const validateCreateDrive = (data) => {
    const errors = [];
    const {
        name, branch_id,
        start_datetime, end_datetime,
        slots_available, contact_number, contact_email,
        venue_type,
    } = data;

    if (!name || name.trim() === '') {
        errors.push('name is required');
    }
    if (!branch_id) {
        errors.push('branch_id is required');
    } else if (isNaN(branch_id) || Number(branch_id) < 1) {
        errors.push('branch_id must be a positive integer');
    }
    if (!start_datetime) {
        errors.push('start_datetime is required');
    } else if (isNaN(new Date(start_datetime).getTime())) {
        errors.push('start_datetime is invalid — use ISO 8601 format (e.g. 2025-10-01T08:00:00+08:00)');
    }
    if (!end_datetime) {
        errors.push('end_datetime is required');
    } else if (isNaN(new Date(end_datetime).getTime())) {
        errors.push('end_datetime is invalid — use ISO 8601 format (e.g. 2025-10-01T17:00:00+08:00)');
    }
    if (slots_available !== undefined && slots_available !== null && slots_available !== '') {
        if (!Number.isInteger(Number(slots_available)) || Number(slots_available) < 1) {
            errors.push('slots_available must be a positive integer');
        }
    }
    if (contact_number && !/^\d{7,15}$/.test(contact_number)) {
        errors.push('contact_number must be numbers only, 7 to 15 digits');
    }
    if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
        errors.push('contact_email is invalid');
    }
    if (venue_type && !VENUE_TYPES.includes(venue_type)) {
        errors.push(`venue_type must be one of: ${VENUE_TYPES.join(', ')}`);
    }

    return errors;
};

/**
 * Validate blood drive update payload.
 * All fields optional — at least one must be present.
 * Same field-level rules as create.
 */
const validateUpdateDrive = (data) => {
    const errors = [];
    const {
        start_datetime, end_datetime,
        slots_available, contact_number, contact_email,
        venue_type,
    } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field is required to update');
    }

    if (start_datetime && isNaN(new Date(start_datetime).getTime())) {
        errors.push('start_datetime is invalid — use ISO 8601 format');
    }
    if (end_datetime && isNaN(new Date(end_datetime).getTime())) {
        errors.push('end_datetime is invalid — use ISO 8601 format');
    }
    if (slots_available !== undefined && slots_available !== null && slots_available !== '') {
        if (!Number.isInteger(Number(slots_available)) || Number(slots_available) < 1) {
            errors.push('slots_available must be a positive integer');
        }
    }
    if (contact_number && !/^\d{7,15}$/.test(contact_number)) {
        errors.push('contact_number must be numbers only, 7 to 15 digits');
    }
    if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
        errors.push('contact_email is invalid');
    }
    if (venue_type && !VENUE_TYPES.includes(venue_type)) {
        errors.push(`venue_type must be one of: ${VENUE_TYPES.join(', ')}`);
    }

    return errors;
};

/**
 * Validate drive cancellation payload.
 * cancellation_reason is optional but recommended.
 */
const validateCancelDrive = (data) => {
    const errors = [];

    if (
        data.cancellation_reason !== undefined &&
        data.cancellation_reason !== null &&
        data.cancellation_reason.trim() === ''
    ) {
        errors.push('cancellation_reason cannot be blank if provided');
    }

    return errors;
};

/**
 * Validate adding a participant to a drive.
 * user_id is required.
 */
const validateAddParticipant = (data) => {
    const errors = [];
    const { user_id } = data;

    if (!user_id) {
        errors.push('user_id is required');
    } else if (isNaN(user_id) || Number(user_id) < 1) {
        errors.push('user_id must be a positive integer');
    }

    if (data.role_notes && data.role_notes.trim().length > 255) {
        errors.push('role_notes cannot exceed 255 characters');
    }

    return errors;
};

/**
 * Validate updating a participant's assignment_status.
 * Used by the Admin/Staff route — allows the full PARTICIPANT_STATUSES set
 * (Assigned, Confirmed, Declined, No Show).
 */
const validateUpdateParticipant = (data) => {
    const errors = [];
    const { assignment_status } = data;

    if (!assignment_status) {
        errors.push('assignment_status is required');
    } else if (!PARTICIPANT_STATUSES.includes(assignment_status)) {
        errors.push(
            `assignment_status must be one of: ${PARTICIPANT_STATUSES.join(', ')}`
        );
    }

    return errors;
};

/**
 * Validate a Volunteer/Phlebotomist updating their OWN assignment_status
 * (the "My Assignments" web accept/decline action — the authenticated
 * counterpart to the email confirm/decline links).
 * Narrower than validateUpdateParticipant on purpose: only 'Confirmed' or
 * 'Declined' are accepted here. 'Assigned' and 'No Show' are rejected even
 * though they're valid values in PARTICIPANT_STATUSES generally — those
 * two stay reachable only through the existing Admin/Staff route.
 */
const validateSelfUpdateParticipant = (data) => {
    const errors = [];
    const { assignment_status } = data;

    if (!assignment_status) {
        errors.push('assignment_status is required');
    } else if (!SELF_SERVICE_STATUSES.includes(assignment_status)) {
        errors.push(
            `assignment_status must be one of: ${SELF_SERVICE_STATUSES.join(', ')}`
        );
    }

    return errors;
};

/**
 * Validate query params for participant suggestions endpoint.
 * role_id and limit are both optional.
 */
const validateSuggestions = (query) => {
    const errors = [];
    const { role_id, limit } = query;

    if (role_id !== undefined) {
        const parsed = Number(role_id);
        if (!Number.isInteger(parsed) || ![5, 6].includes(parsed)) {
            errors.push('role_id must be 5 (Volunteer) or 6 (Phlebotomist)');
        }
    }

    if (limit !== undefined) {
        const parsed = Number(limit);
        if (!Number.isInteger(parsed) || parsed < 1) {
            errors.push('limit must be a positive integer');
        }
    }

    return errors;
};

/**
 * Validate bulk assignment body.
 * Either user_ids (array) OR target_count must be provided — not both.
 */
const validateBulkAssign = (data) => {
    const errors = [];
    const { user_ids, target_count, role_id } = data;

    const hasUserIds     = user_ids !== undefined;
    const hasTargetCount = target_count !== undefined;

    if (!hasUserIds && !hasTargetCount) {
        errors.push('Provide either user_ids (array) or target_count');
        return errors;
    }

    if (hasUserIds && hasTargetCount) {
        errors.push('Provide either user_ids or target_count, not both');
        return errors;
    }

    if (hasUserIds) {
        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            errors.push('user_ids must be a non-empty array');
        } else if (user_ids.some((id) => isNaN(id) || Number(id) < 1)) {
            errors.push('All user_ids must be positive integers');
        }
    }

    if (hasTargetCount) {
        const parsed = Number(target_count);
        if (!Number.isInteger(parsed) || parsed < 1) {
            errors.push('target_count must be a positive integer');
        }

        if (role_id !== undefined) {
            const parsedRole = Number(role_id);
            if (!Number.isInteger(parsedRole) || ![5, 6].includes(parsedRole)) {
                errors.push('role_id must be 5 (Volunteer) or 6 (Phlebotomist)');
            }
        }
    }

    if (data.role_notes && data.role_notes.trim().length > 255) {
        errors.push('role_notes cannot exceed 255 characters');
    }

    return errors;
};

module.exports = {
    validateCreateDrive,
    validateUpdateDrive,
    validateCancelDrive,
    validateAddParticipant,
    validateUpdateParticipant,
    validateSelfUpdateParticipant,
    validateSuggestions,
    validateBulkAssign,
};