/**
 * authValidator.js — Technical input validation for auth endpoints.
 *
 * Validators only — no business rules, no DB queries, no bcrypt.
 * Business logic (credential checks, hashing) lives in authService.js.
 */

const validateChangePassword = (data) => {
    const errors = [];
    const { current_password, new_password } = data;

    if (!current_password) errors.push('current_password is required');
    if (!new_password) errors.push('new_password is required');

    if (new_password && new_password.length < 8) {
        errors.push('new_password must be at least 8 characters');
    }

    if (current_password && new_password && current_password === new_password) {
        errors.push('new_password must be different from current_password');
    }

    return errors;
};

module.exports = {
    validateChangePassword,
};