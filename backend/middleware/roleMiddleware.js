const response = require('../utils/responseHelper');

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const { role_id } = req.user;

        if (!allowedRoles.includes(role_id)) {
            return response.forbidden(res, 'Access denied. Insufficient permissions.');
        }
        next();
    };
};

module.exports = { checkRole };