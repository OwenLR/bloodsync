const validator = require('validator');
const VALID_BLOOD_TYPES = require('../constants/bloodTypes');

const validateCreateDonor = (data) => {
    const errors = [];
    const { first_name, last_name, birthdate, sex, email, blood_type } = data;

    if (!first_name) errors.push('first_name is required');
    if (!last_name) errors.push('last_name is required');
    if (!birthdate) errors.push('birthdate is required');
    if (!sex) errors.push('sex is required');

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    return errors;
};

const validateUpdateDonor = (data) => {
    const errors = [];
    const { email, blood_type } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field required to update');
    }

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    return errors;
};

module.exports = {
    validateCreateDonor,
    validateUpdateDonor
};