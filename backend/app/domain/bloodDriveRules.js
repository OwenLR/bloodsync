/**
 * bloodDriveRules.js — Pure blood drive business rules.
 *
 * No framework dependencies. No database access.
 * Takes plain data, returns results or throws Error.
 * Can be tested without Express or PostgreSQL.
 *
 * Philippine Time note:
 * All datetime comparisons use 'Asia/Manila' explicitly.
 * Do not use new Date() directly for status computation —
 * always use getNowPHT() from this module.
 */

const TERMINAL_STATUSES = ['Ended', 'Cancelled'];

/**
 * Get the current time in Philippine Time (UTC+8).
 * Railway and Neon both run UTC — this ensures correctness
 * regardless of server timezone.
 *
 * @returns {Date} Current time as a JS Date (PHT-aware)
 */
const getNowPHT = () => {
    // toLocaleString with timeZone converts to PHT,
    // then re-parse into a Date object for comparison
    return new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
};

/**
 * Compute the correct status of a blood drive based on its
 * scheduled start/end datetimes and current Philippine time.
 *
 * Does NOT change status if already Cancelled — that is a manual
 * terminal state that datetime cannot override.
 *
 * @param {{ status: string, start_datetime: string|Date, end_datetime: string|Date }} drive
 * @returns {'Upcoming'|'Ongoing'|'Ended'|'Cancelled'} Computed status
 */
const computeDriveStatus = (drive) => {
    // Cancelled is a manual terminal state — never auto-override
    if (drive.status === 'Cancelled') return 'Cancelled';

    const now   = getNowPHT();
    const start = new Date(drive.start_datetime);
    const end   = new Date(drive.end_datetime);

    if (now < start) return 'Upcoming';
    if (now >= start && now <= end) return 'Ongoing';
    return 'Ended';
};

/**
 * Assert that a drive is not in a terminal state.
 * Terminal drives cannot be updated or have participants reassigned.
 *
 * @param {{ status: string, drive_id: number }} drive
 * @throws {Error}
 */
const assertNotTerminal = (drive) => {
    if (TERMINAL_STATUSES.includes(drive.status)) {
        throw new Error(
            `Cannot modify drive #${drive.drive_id} — ` +
            `it is already ${drive.status}`
        );
    }
};

/**
 * Assert that a drive can be cancelled.
 * Already cancelled or ended drives cannot be cancelled again.
 *
 * @param {{ status: string, drive_id: number }} drive
 * @throws {Error}
 */
const assertCancellable = (drive) => {
    if (drive.status === 'Cancelled') {
        throw new Error(
            `Drive #${drive.drive_id} is already cancelled`
        );
    }
    if (drive.status === 'Ended') {
        throw new Error(
            `Drive #${drive.drive_id} has already ended and cannot be cancelled`
        );
    }
};

/**
 * Assert that end_datetime is after start_datetime.
 *
 * @param {string|Date} start_datetime
 * @param {string|Date} end_datetime
 * @throws {Error}
 */
const assertValidDateRange = (start_datetime, end_datetime) => {
    const start = new Date(start_datetime);
    const end   = new Date(end_datetime);

    if (isNaN(start.getTime())) throw new Error('start_datetime is invalid');
    if (isNaN(end.getTime()))   throw new Error('end_datetime is invalid');

    if (end <= start) {
        throw new Error('end_datetime must be after start_datetime');
    }
};

/**
 * Assert that start_datetime is not in the past (Philippine time).
 * Only enforced on creation — updates to an ongoing drive are allowed.
 *
 * @param {string|Date} start_datetime
 * @throws {Error}
 */
const assertStartNotInPast = (start_datetime) => {
    const now   = getNowPHT();
    const start = new Date(start_datetime);

    if (start < now) {
        throw new Error('start_datetime cannot be in the past');
    }
};

/**
 * Check if a user is within an active blood drive window (Philippine time).
 * Used by bloodDriveMiddleware to gate Volunteer/Phlebotomist access.
 *
 * @param {{ start_datetime: string|Date, end_datetime: string|Date, status: string }} drive
 * @returns {boolean}
 */
const isDriveActiveNow = (drive) => {
    const computed = computeDriveStatus(drive);
    return computed === 'Ongoing';
};

module.exports = {
    getNowPHT,
    computeDriveStatus,
    assertNotTerminal,
    assertCancellable,
    assertValidDateRange,
    assertStartNotInPast,
    isDriveActiveNow,
    TERMINAL_STATUSES,
};