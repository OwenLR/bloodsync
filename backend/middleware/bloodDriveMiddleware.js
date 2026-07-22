/**
 * bloodDriveMiddleware.js — Access control for blood drive field operations.
 *
 * Lives at: backend/middleware/bloodDriveMiddleware.js
 * Alongside: authMiddleware.js, roleMiddleware.js, uploadMiddleware.js
 *
 * requireBloodDrive:
 *   - Admin and PRC Staff pass through unconditionally (req.drive_id = null,
 *     req.drive_branch_id = null — Staff resolve branch from their own
 *     JWT branch_id at the controller/service level instead)
 *   - Volunteers and Phlebotomists must be assigned to a currently active
 *     blood drive (within the Philippine time window)
 *   - Attaches req.drive_id so services can enforce cross-drive ownership
 *   - Attaches req.drive_branch_id — the active drive's own branch_id.
 *     Volunteers/Phlebotomists never carry a branch_id on their user record,
 *     so this is the ONLY correct source of branch_id for their field-workflow
 *     writes (donor-interviews, screenings, donations, blood-collections all
 *     ultimately resolve branch_id from this, not from client input).
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

        // Admin and PRC Staff always pass through.
        // branch_id for these roles is resolved from req.user.branch_id
        // at the controller/service level, not from a drive.
        if (STAFF_ROLES.includes(role_id)) {
            req.drive_id = null;
            req.drive_branch_id = null;
            return next();
        }

        // Volunteers and Phlebotomists must have an active drive assignment
        if (FIELD_ROLES.includes(role_id)) {
            const activeDrive = await bloodDriveModel.getActiveDriveForUser(user_id);

            if (!activeDrive) {
                return response.forbidden(
                    res,
                    'Access denied! You are not assigned to an active blood drive at this time'
                );
            }

            req.drive_id = activeDrive.drive_id;
            req.drive_branch_id = activeDrive.branch_id;
            return next();
        }

        return response.forbidden(res, 'Access denied');

    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = { requireBloodDrive };