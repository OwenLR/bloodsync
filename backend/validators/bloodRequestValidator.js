const VALID_BLOOD_TYPES = require('../constants/bloodTypes');
const {
    URGENCY_LEVELS,
    REQUEST_STATUSES,
} = require('../constants/statuses');

const VALID_COMPONENTS = [
    'Whole Blood',
    'Packed Red Blood Cells',
    'Fresh Frozen Plasma',
    'Platelets',
];

const validateCreateRequest = (data) => {
    const errors = [];
    const { hospital_id, branch_id, patient_name, urgency_level, items } = data;

    if (!hospital_id) errors.push('hospital_id is required');
    if (!branch_id) errors.push('branch_id is required');
    if (!patient_name || patient_name.trim() === '') errors.push('patient_name is required');

    if (urgency_level && !URGENCY_LEVELS.includes(urgency_level)) {
        errors.push(`urgency_level must be one of: ${URGENCY_LEVELS.join(', ')}`);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push('items is required and must be a non-empty array');
    } else {
        items.forEach((item, index) => {
            if (!item.blood_type) {
                errors.push(`items[${index}]: blood_type is required`);
            } else if (!VALID_BLOOD_TYPES.includes(item.blood_type)) {
                errors.push(`items[${index}]: invalid blood_type '${item.blood_type}'`);
            }

            if (!item.component) {
                errors.push(`items[${index}]: component is required`);
            } else if (!VALID_COMPONENTS.includes(item.component)) {
                errors.push(`items[${index}]: invalid component '${item.component}'`);
            }

            if (!item.units_requested) {
                errors.push(`items[${index}]: units_requested is required`);
            } else if (!Number.isInteger(Number(item.units_requested)) || Number(item.units_requested) < 1) {
                errors.push(`items[${index}]: units_requested must be a positive integer`);
            }
        });
    }

    return errors;
};

const validateUpdateRequestStatus = (data) => {
    const errors = [];
    const { status } = data;

    if (!status) errors.push('status is required');
    else if (!REQUEST_STATUSES.includes(status)) {
        errors.push(`status must be one of: ${REQUEST_STATUSES.join(', ')}`);
    }

    if (status === 'Rejected' && (!data.denial_reason || data.denial_reason.trim() === '')) {
        errors.push('denial_reason is required when rejecting a request');
    }

    return errors;
};

module.exports = {
    validateCreateRequest,
    validateUpdateRequestStatus,
};