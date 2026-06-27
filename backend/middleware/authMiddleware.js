const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        // Web: read from httpOnly cookie
        // Mobile: read from Authorization: Bearer <token> header
        const token =
            req.cookies.access_token ||
            req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
};

module.exports = { verifyToken };