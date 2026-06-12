/**
 * bloodUnitValidator.js — Technical input validation for blood unit routes.
 * Transition rules belong in app/domain/bloodUnitRules.js, not here.
 */

const { UNIT_STATUSES } = require('../constants/statuses');

const validateUpdateUnitStatus = (data) => {
    const errors = [];
    const { status } = data;

    if (!status) {
        errors.push('status is required');
    } else if (!UNIT_STATUSES.includes(status)) {
        errors.push(
            `Invalid status. Must be one of: ${UNIT_STATUSES.join(', ')}`
        );
    }

    return errors;
};

/**
 * validateSeparate — no body required.
 * unit_id comes from req.params; nothing else needed from the request body.
 * Kept here for consistency with the 4-step controller pattern.
 */
const validateSeparate = () => {
    return []; // no body fields to validate
};

module.exports = {
    validateUpdateUnitStatus,
    validateSeparate,
};