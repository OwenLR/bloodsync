/**
 * volunteerProfileRoutes.js — Volunteer and Phlebotomist self-profile routes.
 *
 * Separate from registrationRoutes — registration is a one-time onboarding
 * process. Profile management is an ongoing operational concern.
 *
 * Base path: /api/volunteers/me
 */

const express = require('express');
const router  = express.Router();
const volunteerProfileController = require('../controllers/volunteerProfileController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole }   = require('../../middleware/roleMiddleware');
const upload  = require('../../middleware/uploadMiddleware');
const ROLES   = require('../../constants/roles');

const FIELD_ROLES = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

// View own profile
router.get('/profile',
    verifyToken,
    checkRole(FIELD_ROLES),
    volunteerProfileController.getMyProfile
);

// Update own profile — identity fields locked in validator
router.patch('/profile',
    verifyToken,
    checkRole(FIELD_ROLES),
    upload.single('profile_img'),
    volunteerProfileController.updateMyProfile
);

module.exports = router;