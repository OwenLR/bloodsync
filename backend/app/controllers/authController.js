const authService = require('../services/authService');
const response    = require('../../utils/responseHelper');

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

module.exports = { login, refresh, logout };