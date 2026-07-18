const authService  = require('../services/authService');
const userModel    = require('../repositories/userModel');
const profileModel = require('../repositories/profileModel');
const response     = require('../../utils/responseHelper');
const ROLES        = require('../../constants/roles');
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
// profile_img: role-aware lookup (staff_profiles / volunteer_profiles),
// see prior session note.
// branch_name: added this session — PRC Staff only, needed for the navbar
// role label ("PRC {branch_name}"). Other roles either have no branch_id
// (Volunteer/Phlebotomist per current seed data) or don't need branch
// context in their label (Admin/Requestor), so the lookup is skipped for
// them rather than always joining branches for every role.
const me = async (req, res) => {
    try {
        const user = await userModel.getUserById(req.user.user_id);

        if (!user) {
            return response.handleError(res, new Error('User not found'));
        }

        let profile_img = null;
        let branch_name = null;

        if (req.user.role_id === ROLES.ADMIN || req.user.role_id === ROLES.PRC_STAFF) {
            const staffProfile = await userModel.getStaffProfileByUserId(req.user.user_id);
            profile_img = staffProfile ? staffProfile.profile_img : null;
        } else if (req.user.role_id === ROLES.VOLUNTEER || req.user.role_id === ROLES.PHLEBOTOMIST) {
            const volProfile = await profileModel.getProfileByUserId(req.user.user_id);
            profile_img = volProfile ? volProfile.profile_img : null;
        }

        if (req.user.role_id === ROLES.PRC_STAFF && req.user.branch_id) {
            const branch = await branchModel.getBranchById(req.user.branch_id);
            branch_name = branch ? branch.branch_name : null;
        }

        return response.success(res, {
            user: {
                user_id:    req.user.user_id,
                email:      req.user.email,
                role_id:    req.user.role_id,
                branch_id:  req.user.branch_id,
                branch_name,
                first_name: user.first_name,
                last_name:  user.last_name,
                profile_img,
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