const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../repositories/userModel');
const response = require('../../utils/responseHelper');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return response.badRequest(
                res,
                'Email and password are required'
            );
        }

        const user = await userModel.getUserByEmail(email);
        if (!user) {
            return response.unauthorized(
                res,
                'Invalid email or password'
            );
        }

        if (!user.is_active) {
            return response.unauthorized(
                res,
                'Account is deactivated. Contact administrator.'
            );
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );
        if (!isPasswordValid) {
            return response.unauthorized(
                res,
                'Invalid email or password'
            );
        }

        await userModel.updateLastLogin(user.user_id);

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role_id: user.role_id,
                branch_id: user.branch_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role_id: user.role_id,
                branch_id: user.branch_id
            }
        });
    } catch (error) {
        return response.error(res, error.message);
    }
};

const logout = async (req, res) => {
    return response.success(res, null, 'Logged out successfully');
};

module.exports = { login, logout };