const jwt = require('jsonwebtoken');

const verifyRequestorToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Reject staff tokens on requestor routes
        if (decoded.role !== 'requestor') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Requestor token required.'
            });
        }

        req.requestor = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token'
        });
    }
};

module.exports = { verifyRequestorToken };