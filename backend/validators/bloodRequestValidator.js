const VALID_BLOOD_TYPES = require('../constants/bloodTypes');
const {
    URGENCY_LEVELS,
    REQUEST_STATUSES,
} = require('../constants/statuses');
const {
    MAX_UNITS_PER_REQUEST,
    MAX_UNITS_PER_ITEM,
} = require('../constants/bloodRequestConstant');

const VALID_COMPONENTS = [
    'Whole Blood',
    'Packed Red Blood Cells',
    'Fresh Frozen Plasma',
    'Platelets',
];

/**
 * Validate request items array — checks blood type, component, units per item,
 * and total unit cap. Pushes errors into the provided errors array.
 *
 * Exported so services can reuse it as a BusinessError thrower:
 *   const errors = validateItems(items, []);
 *   if (errors.length > 0) throw new BusinessError(errors[0], 400);
 */
const validateItems = (items, errors) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push('items is required and must be a non-empty array');
        return errors;   // ← was: return;
    }

    let totalUnits = 0;

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
        } else if (Number(item.units_requested) > MAX_UNITS_PER_ITEM) {
            errors.push(`items[${index}]: units_requested cannot exceed ${MAX_UNITS_PER_ITEM} per item`);
        } else {
            totalUnits += Number(item.units_requested);
        }
    });

    if (totalUnits > MAX_UNITS_PER_REQUEST) {
        errors.push(`Total units requested (${totalUnits}) exceeds the maximum allowed per request (${MAX_UNITS_PER_REQUEST})`);
    }

    return errors; 
};

const validateCreateRequest = (data) => {
    const errors = [];
    const { hospital_id, branch_id, patient_name, urgency_level, items } = data;

    if (!hospital_id)   errors.push('hospital_id is required');
    if (!branch_id)     errors.push('branch_id is required');
    if (!patient_name || patient_name.trim() === '') errors.push('patient_name is required');

    if (urgency_level && !URGENCY_LEVELS.includes(urgency_level)) {
        errors.push(`urgency_level must be one of: ${URGENCY_LEVELS.join(', ')}`);
    }

    validateItems(items, errors);

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

/**
 * Validate fulfillment options request.
 * items required — latitude/longitude optional (system still works without location,
 * just sorts branches alphabetically instead of by distance).
 */
const validateFulfillmentOptions = (data) => {
    const errors = [];
    const { items, latitude, longitude } = data;

    validateItems(items, errors);

    if (latitude !== undefined && latitude !== null) {
        if (isNaN(latitude) || Number(latitude) < -90 || Number(latitude) > 90) {
            errors.push('latitude must be a valid number between -90 and 90');
        }
    }

    if (longitude !== undefined && longitude !== null) {
        if (isNaN(longitude) || Number(longitude) < -180 || Number(longitude) > 180) {
            errors.push('longitude must be a valid number between -180 and 180');
        }
    }

    return errors;
};

const validateRequestFormFile = (file) => {
    const errors = [];
    if (!file) {
        errors.push('A request form document is required.');
    }
    return errors;
};

module.exports = {
    validateItems,
    validateCreateRequest,
    validateUpdateRequestStatus,
    validateFulfillmentOptions,
    validateRequestFormFile, // ← NEW
};