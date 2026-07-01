/**
 * bloodUnitRules.js — Pure blood unit business rules.
 *
 * No framework dependencies. No database access.
 * Takes plain data, returns results or throws Error.
 * Can be tested without Express or PostgreSQL.
 */

/**
 * Terminal statuses — units in these states cannot be updated further.
 */
const TERMINAL_STATUSES = ['Released', 'Disposed', 'Withdrawn', 'Separated'];

/**
 * Statuses that require a reason to be provided.
 */
const REASON_REQUIRED_STATUSES = ['Disposed', 'Withdrawn'];

/**
 * Assert that a blood unit is not in a terminal state.
 *
 * Two terminal conditions:
 * 1. status is one of TERMINAL_STATUSES (set explicitly via dispose/withdraw/
 *    release/separate actions)
 * 2. expiration_date has passed — no cron or trigger ever flips status to
 *    'Expired' in this system, so a unit can sit at status='Available' long
 *    after its expiration_date unless this is checked here. Computed from
 *    the unit's own expiration_date rather than relying on a stored status
 *    string that nothing sets.
 *
 * @param {{ status: string, expiration_date: string|Date }} unit
 * @throws {Error} if unit status is terminal or unit has expired
 */
const assertNotTerminal = (unit) => {
    if (TERMINAL_STATUSES.includes(unit.status)) {
        throw new Error(
            `Cannot update. Unit is already ${unit.status}`
        );
    }
    if (unit.expiration_date && new Date(unit.expiration_date) <= new Date()) {
        throw new Error(
            'Cannot update. Unit has expired'
        );
    }
};

/**
 * Assert that a reason is provided for statuses that require one.
 *
 * @param {string} status
 * @param {string|null|undefined} reason
 * @throws {Error} if reason is missing for a status that requires it
 */
const assertReasonProvided = (status, reason) => {
    if (REASON_REQUIRED_STATUSES.includes(status) && !reason) {
        throw new Error(
            `reason is required when marking unit as ${status}`
        );
    }
};

/**
 * Assert that a unit can be separated.
 * Only Available Whole Blood units can be separated.
 *
 * @param {{ component: string, status: string }} unit
 * @throws {Error}
 */
const assertSeparable = (unit) => {
    if (unit.component !== 'Whole Blood') {
        throw new Error(
            `Only Whole Blood units can be separated. This unit is ${unit.component}`
        );
    }
    if (unit.status !== 'Available') {
        throw new Error(
            `Only Available units can be separated. This unit is ${unit.status}`
        );
    }
};

module.exports = {
    TERMINAL_STATUSES,
    REASON_REQUIRED_STATUSES,
    assertNotTerminal,
    assertReasonProvided,
    assertSeparable,
};