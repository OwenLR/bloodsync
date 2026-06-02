const validator = require('validator');

const validateCreateUser = (data) => {
    const errors = [];
    const { first_name, last_name, email, password, role_id } = data;

    if (!first_name) errors.push('first_name is required');
    if (!last_name) errors.push('last_name is required');
    if (!email) errors.push('email is required');
    if (!password) errors.push('password is required');
    if (!role_id) errors.push('role_id is required');

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (password && password.length < 8) {
        errors.push('password must be at least 8 characters');
    }

    return errors;
};

const validateUpdateUser = (data) => {
    const errors = [];
    const { email } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field required to update');
    }

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    return errors;
};

module.exports = {
    validateCreateUser,
    validateUpdateUser
};