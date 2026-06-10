const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.status(401).json({
                status:  'error',
                message: 'Access denied. No token provided.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status:  'error',
            message: 'Invalid or expired token.',
        });
    }
};

module.exports = { verifyToken };