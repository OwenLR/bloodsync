const express = require('express');
const router = express.Router();
const volunteerAuthController = require('../controllers/volunteerAuthController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const upload = require('../../middleware/uploadMiddleware');
const ROLES = require('../../constants/roles');

// Public — self registration
router.post('/volunteers/register',
    upload.single('profile_img'),
    volunteerAuthController.registerVolunteer
);

router.post('/phlebotomists/register',
    upload.single('profile_img'),
    volunteerAuthController.registerPhlebotomist
);

// Admin only — manage registrations
router.get('/volunteers/pending',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    volunteerAuthController.getPendingRegistrations
);

router.get('/volunteers/:id/profile',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    volunteerAuthController.getVolunteerProfile
);

router.patch('/volunteers/:id/approve',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    volunteerAuthController.approveRegistration
);

router.patch('/volunteers/:id/decline',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    volunteerAuthController.declineRegistration
);

module.exports = router;