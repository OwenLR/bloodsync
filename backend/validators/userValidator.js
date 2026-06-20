const validator = require('validator');

const VALID_ROLE_IDS = [1, 2, 3, 4, 5, 6];
// Admin-created users should only be Admin or PRC Staff
// Volunteers, Phlebotomists, Requestors self-register
const ADMIN_CREATABLE_ROLES = [1, 2];

const validateCreateUser = (data) => {
    const errors = [];
    const { first_name, last_name, email, role_id } = data;

    if (!first_name || first_name.trim() === '') errors.push('first_name is required');
    if (!last_name || last_name.trim() === '') errors.push('last_name is required');
    if (!email) errors.push('email is required');
    if (!role_id) errors.push('role_id is required');

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (role_id && !ADMIN_CREATABLE_ROLES.includes(Number(role_id))) {
        errors.push(`role_id must be one of: ${ADMIN_CREATABLE_ROLES.join(', ')} (Admin or PRC Staff only via this endpoint)`);
    }

    return errors;
};

const validateUpdateUser = (data) => {
    const errors = [];
    const { email, role_id } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field required to update');
    }

    if (email && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (role_id && !VALID_ROLE_IDS.includes(Number(role_id))) {
        errors.push(`role_id must be one of: ${VALID_ROLE_IDS.join(', ')}`);
    }

    return errors;
};

module.exports = {
    validateCreateUser,
    validateUpdateUser,
};