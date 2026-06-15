/**
 * registrationRoutes.js — User self-registration and Admin approval routes.
 *
 * Covers the one-time onboarding flow only:
 * - Requestor self-registration
 * - Volunteer/Phlebotomist self-registration (pending approval)
 * - Admin approval and decline actions
 * - Admin viewing of pending profiles
 *
 * Volunteer/Phlebotomist self-profile management lives in volunteerProfileRoutes.js.
 */

const express = require('express');
const router  = express.Router();
const registrationController = require('../controllers/registrationController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole }   = require('../../middleware/roleMiddleware');
const upload  = require('../../middleware/uploadMiddleware');
const ROLES   = require('../../constants/roles');

// ── Self-registration (PUBLIC) ────────────────────────────────

router.post('/requestors/register',
    registrationController.registerRequestor
);

router.post('/volunteers/register',
    upload.single('profile_img'),
    registrationController.registerVolunteer
);

router.post('/phlebotomists/register',
    upload.single('profile_img'),
    registrationController.registerPhlebotomist
);

// ── Admin — manage pending registrations ─────────────────────

router.get('/volunteers/pending',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    registrationController.getPendingRegistrations
);

router.get('/volunteers/available',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    registrationController.getAvailableVolunteers
);

router.get('/volunteers/:id/profile',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    registrationController.getVolunteerProfile
);

router.patch('/volunteers/:id/approve',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    registrationController.approveRegistration
);

router.patch('/volunteers/:id/decline',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    registrationController.declineRegistration
);

module.exports = router;