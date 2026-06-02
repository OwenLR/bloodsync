const VALID_BLOOD_TYPES = require('../constants/bloodTypes');
const { COLLECTION_STATUSES } = require('../constants/statuses');

const validateCreateCollection = (data) => {
    const errors = [];
    const { donation_id, blood_type } = data;

    if (!donation_id) errors.push('donation_id is required');
    if (!blood_type) errors.push('blood_type is required');

    if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
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