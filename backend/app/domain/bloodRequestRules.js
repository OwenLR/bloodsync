/**
 * bloodRequestRules.js — Pure blood request business rules.
 *
 * No framework dependencies. No database access.
 * Takes plain data, returns results or throws Error.
 * Can be tested without Express or PostgreSQL.
 */

/**
 * Valid status transitions for blood requests.
 * Key = current status, Value = array of statuses it may transition to.
 *
 * Full flow:
 *   Pending  → Approved  (staff approves, units reserved)
 *   Pending  → Rejected  (staff rejects before approval)
 *   Approved → Waiting   (staff marks units ready for pickup)
 *   Approved → Rejected  (staff rejects after approval — frees reserved units)
 *   Waiting  → Released  (requestor confirms receipt OR staff manually releases)
 *   Waiting  → Rejected  (edge case: issue discovered after units prepared)
 */
const VALID_TRANSITIONS = {
    Pending:  ['Approved', 'Rejected'],
    Approved: ['Waiting',  'Rejected'],
    Waiting:  ['Released', 'Rejected'],
    Released: [],
    Rejected: [],
};

/**
 * Assert that a status transition is valid.
 *
 * @param {string} currentStatus - The request's current status
 * @param {string} newStatus     - The intended new status
 * @throws {Error} if the transition is not allowed
 */
const assertValidTransition = (currentStatus, newStatus) => {
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed) {
        throw new Error(`Unknown current status: ${currentStatus}`);
    }

    if (!allowed.includes(newStatus)) {
        if (allowed.length === 0) {
            throw new Error(
                `Cannot transition from ${currentStatus} — this status is terminal`
            );
        }
        throw new Error(
            `Cannot transition from ${currentStatus} to ${newStatus}. ` +
            `Allowed transitions: ${allowed.join(', ')}`
        );
    }
};

module.exports = {
    VALID_TRANSITIONS,
    assertValidTransition,
};