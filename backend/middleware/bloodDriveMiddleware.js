/**
 * bloodDriveMiddleware.js — Access control for blood drive field operations.
 *
 * Lives at: backend/middleware/bloodDriveMiddleware.js
 * Alongside: authMiddleware.js, roleMiddleware.js, uploadMiddleware.js
 *
 * requireBloodDrive:
 *   - Admin and PRC Staff pass through unconditionally (req.drive_id = null)
 *   - Volunteers and Phlebotomists must be assigned to a currently active
 *     blood drive (within the Philippine time window)
 *   - Attaches req.drive_id so services can enforce cross-drive ownership
 *
 * Philippine Time:
 *   The SQL query in getActiveDriveForUser() uses
 *   (NOW() AT TIME ZONE 'Asia/Manila'), so Railway's UTC server
 *   clock does not affect correctness.
 */

const bloodDriveModel = require('../app/repositories/bloodDriveModel');
const response        = require('../utils/responseHelper');
const ROLES           = require('../constants/roles');

const STAFF_ROLES = [ROLES.ADMIN, ROLES.PRC_STAFF];
const FIELD_ROLES = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

/**
 * Middleware that enforces blood drive assignment for field roles.
 *
 * Usage in route files:
 *   const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
 *   router.post('/', verifyToken, checkRole([...]), requireBloodDrive, controller.create);
 */
const requireBloodDrive = async (req, res, next) => {
    try {
        const { role_id, user_id } = req.user;

        // Admin and PRC Staff always pass through
        if (STAFF_ROLES.includes(role_id)) {
            req.drive_id = null;
            return next();
        }

        // Volunteers and Phlebotomists must have an active drive assignment
        if (FIELD_ROLES.includes(role_id)) {
            const activeDrive = await bloodDriveModel.getActiveDriveForUser(user_id);

            if (!activeDrive) {
                return response.forbidden(
                    res,
                    'Access denied — you are not assigned to an active blood drive at this time'
                );
            }

            req.drive_id = activeDrive.drive_id;
            return next();
        }

        return response.forbidden(res, 'Access denied');

    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = { requireBloodDrive };