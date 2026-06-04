const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const upload = require('../../middleware/uploadMiddleware');
const ROLES = require('../../constants/roles');

// Requestor self-registration — immediately Active
router.post('/requestors/register',
    registrationController.registerRequestor
);

// Volunteer self-registration — Pending until Admin approves
router.post('/volunteers/register',
    upload.single('profile_img'),
    registrationController.registerVolunteer
);

// Phlebotomist self-registration — Pending until Admin approves
router.post('/phlebotomists/register',
    upload.single('profile_img'),
    registrationController.registerPhlebotomist
);

// Admin only — manage volunteer/phlebotomist registrations
router.get('/volunteers/pending',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    registrationController.getPendingRegistrations
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