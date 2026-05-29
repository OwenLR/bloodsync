const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const { role_id } = req.user;

        if (!allowedRoles.includes(role_id)) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

module.exports = { checkRole };