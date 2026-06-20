const authService = require('../services/authService');
const userModel   = require('../repositories/userModel');
const response    = require('../../utils/responseHelper');
const { validateChangePassword } = require('../../validators/authValidator');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
};

const isMobileRequest = (req) => req.headers['x-client-type'] === 'mobile';

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);

        if (isMobileRequest(req)) {
            // Mobile: return tokens in response body for secure storage
            return response.success(res, {
                user:          result.user,
                access_token:  result.accessToken,
                refresh_token: result.refreshToken,
            }, 'Login successful');
        }

        // Web: set httpOnly cookies — tokens never exposed to JavaScript
        res.cookie('access_token', result.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000, // 15 minutes in ms
        });

        res.cookie('refresh_token', result.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        });

        return response.success(res, { user: result.user }, 'Login successful');
    } catch (error) {
        return response.handleError(res, error);
    }
};

const refresh = async (req, res) => {
    try {
        if (isMobileRequest(req)) {
            // Mobile: refresh token comes from request body
            const { refresh_token } = req.body;
            const result = await authService.refresh(refresh_token);

            return response.success(res, {
                access_token:  result.newAccessToken,
                refresh_token: result.newRefreshToken,
            }, 'Token refreshed');
        }

        // Web: refresh token comes from httpOnly cookie
        const refreshToken = req.cookies.refresh_token;
        const result = await authService.refresh(refreshToken);

        res.cookie('access_token', result.newAccessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', result.newRefreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return response.success(res, null, 'Token refreshed');
    } catch (error) {
        return response.handleError(res, error);
    }
};



const logout = async (req, res) => {
    try {
        if (isMobileRequest(req)) {
            // Mobile: refresh token comes from request body
            const { refresh_token } = req.body;
            await authService.logout(refresh_token);

            return response.success(res, null, 'Logged out successfully');
        }

        // Web: refresh token comes from httpOnly cookie, then clear both cookies
        const refreshToken = req.cookies.refresh_token;
        await authService.logout(refreshToken);

        res.clearCookie('access_token', COOKIE_OPTIONS);
        res.clearCookie('refresh_token', COOKIE_OPTIONS);

        return response.success(res, null, 'Logged out successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

// GET /api/auth/me
// Returns JWT payload fields + first_name/last_name from DB lookup —
// frontend needs name fields for navbar display on every page load
// (in-memory user cache does not survive page reload).
const me = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.user.user_id);

        if (!user) {
            return response.handleError(res, new Error('User not found'));
        }

        return response.success(res, {
            user: {
                user_id:    req.user.user_id,
                email:      req.user.email,
                role_id:    req.user.role_id,
                branch_id:  req.user.branch_id,
                first_name: user.first_name,
                last_name:  user.last_name,
            }
        }, 'User fetched');
    } catch (error) {
        return response.handleError(res, error);
    }
};

// PATCH /api/auth/me/password — self-service, all authenticated roles
// user_id comes from req.user (JWT) — never from request body
const changePassword = async (req, res) => {
    try {
        const errors = validateChangePassword(req.body);
        if (errors.length > 0) return response.badRequest(res, errors[0]);

        const { current_password, new_password } = req.body;
        const result = await authService.changePassword(
            req.user.user_id,
            current_password,
            new_password
        );
        return response.success(res, result, 'Password updated successfully');
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = { login, refresh, logout, me, changePassword };