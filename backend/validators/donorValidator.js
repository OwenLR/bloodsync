const validator = require('validator');
const VALID_BLOOD_TYPES = require('../constants/bloodTypes');

const VALID_SEX = ['Male', 'Female'];

const validateCreateDonor = (data) => {
    const errors = [];
    const { first_name, last_name, birthdate, sex, email, blood_type, contact } = data;

    if (!first_name || first_name.trim() === '') errors.push('first_name is required');
    if (!last_name || last_name.trim() === '') errors.push('last_name is required');
    if (!birthdate) errors.push('birthdate is required');
    if (!sex) errors.push('sex is required');

    if (sex && !VALID_SEX.includes(sex)) {
        errors.push(`sex must be one of: ${VALID_SEX.join(', ')}`);
    }

    if (birthdate) {
        const date = new Date(birthdate);
        if (isNaN(date.getTime())) {
            errors.push('birthdate is invalid, use YYYY-MM-DD format');
        } else if (date > new Date()) {
            errors.push('birthdate cannot be in the future');
        }
    }

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    if (contact && !/^\d{7,15}$/.test(contact)) {
        errors.push('contact must be numbers only, 7 to 15 digits');
    }

    return errors;
};

const validateUpdateDonor = (data) => {
    const errors = [];
    const { email, blood_type, sex, birthdate, contact } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field required to update');
    }

    if (sex && !VALID_SEX.includes(sex)) {
        errors.push(`sex must be one of: ${VALID_SEX.join(', ')}`);
    }

    if (birthdate) {
        const date = new Date(birthdate);
        if (isNaN(date.getTime())) {
            errors.push('birthdate is invalid, use YYYY-MM-DD format');
        } else if (date > new Date()) {
            errors.push('birthdate cannot be in the future');
        }
    }

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (blood_type && !VALID_BLOOD_TYPES.includes(blood_type)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    if (contact && !/^\d{7,15}$/.test(contact)) {
        errors.push('contact must be numbers only, 7 to 15 digits');
    }

    return errors;
};

module.exports = {
    validateCreateDonor,
    validateUpdateDonor
};