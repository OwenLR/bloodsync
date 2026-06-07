/**
 * hospitalValidator.js — Technical input validation for hospital routes.
 * Business rules do not belong here.
 */

const validateCreateHospital = (data) => {
    const errors = [];
    const { hospital_name, location } = data;

    if (!hospital_name || hospital_name.trim() === '') {
        errors.push('hospital_name is required');
    }
    if (!location || location.trim() === '') {
        errors.push('location is required');
    }

    return errors;
};

const validateUpdateHospital = (data) => {
    const errors = [];
    const { hospital_name, location } = data;

    if (!hospital_name && !location) {
        errors.push('At least one field is required to update: hospital_name, location');
    }

    return errors;
};

module.exports = {
    validateCreateHospital,
    validateUpdateHospital,
};