const VALID_BLOOD_TYPES = require('../constants/bloodTypes');
const { COLLECTION_STATUSES } = require('../constants/statuses');

const VALID_COMPONENTS = [
    'Whole Blood',
    'Packed Red Blood Cells',
    'Fresh Frozen Plasma',
    'Platelets',
];

const validateCreateCollection = (data) => {
    const errors = [];
    const { donation_id, blood_type, component, volume_ml } = data;

    if (!donation_id) errors.push('donation_id is required');
    if (!blood_type) errors.push('blood_type is required');

    if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

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