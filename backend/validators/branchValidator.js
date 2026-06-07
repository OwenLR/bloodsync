/**
 * branchValidator.js — Technical input validation for branch routes.
 * Business rules do not belong here.
 */

const validateCreateBranch = (data) => {
    const errors = [];
    const { branch_name, location } = data;

    if (!branch_name || branch_name.trim() === '') {
        errors.push('branch_name is required');
    }
    if (!location || location.trim() === '') {
        errors.push('location is required');
    }

    return errors;
};

const validateUpdateBranch = (data) => {
    const errors = [];
    const { branch_name, location } = data;

    if (!branch_name && !location) {
        errors.push('At least one field is required to update: branch_name, location');
    }

    return errors;
};

module.exports = {
    validateCreateBranch,
    validateUpdateBranch,
};