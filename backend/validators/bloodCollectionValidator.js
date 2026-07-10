const { COLLECTION_STATUSES } = require('../constants/statuses');

const VALID_COMPONENTS = [
    'Whole Blood',
    'Packed Red Blood Cells',
    'Fresh Frozen Plasma',
    'Platelets',
];

/**
 * blood_type is intentionally NOT accepted/validated here. It's resolved
 * server-side in bloodCollectionService.createCollection from the
 * donation's own screening record (blood_type_confirmed) — never trusted
 * from the client. This removes a redundant, editable blood-type field
 * that previously duplicated what screening had already confirmed.
 */
const validateCreateCollection = (data) => {
    const errors = [];
    const { donation_id, component, volume_ml } = data;

    if (!donation_id) errors.push('donation_id is required');

    if (component && !VALID_COMPONENTS.includes(component)) {
        errors.push(`Invalid component. Must be one of: ${VALID_COMPONENTS.join(', ')}`);
    }

    if (volume_ml !== undefined && volume_ml !== null && volume_ml !== '') {
        if (!Number.isInteger(Number(volume_ml)) || Number(volume_ml) <= 0) {
            errors.push('volume_ml must be a positive integer');
        }
    }

    return errors;
};

const validateUpdateCollectionStatus = (data) => {
    const errors = [];
    const { status, reason } = data;

    if (!status) errors.push('status is required');

    if (status && !COLLECTION_STATUSES.includes(status)) {
        errors.push(`Invalid status. Must be one of: ${COLLECTION_STATUSES.join(', ')}`);
    }

    if (status === 'Rejected' && !reason) {
        errors.push('reason is required when rejecting');
    }

    return errors;
};

module.exports = {
    validateCreateCollection,
    validateUpdateCollectionStatus
};