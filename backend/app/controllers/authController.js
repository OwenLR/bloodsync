const authService = require('../services/authService');
const response    = require('../../utils/responseHelper');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        return res.status(200).json({
            status:  'success',
            message: 'Login successful',
            token:   result.token,
            user:    result.user,
        });
    } catch (error) {
        return response.handleError(res, error);
    }
};

const logout = async (req, res) => {
    return response.success(res, null, 'Logged out successfully');
};

module.exports = { login, logout };