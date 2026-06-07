const express = require('express');
const router  = express.Router();
const donorInterviewController = require('../controllers/donorInterviewController');
const { verifyToken }      = require('../../middleware/authMiddleware');
const { checkRole }        = require('../../middleware/roleMiddleware');
const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
const ROLES = require('../../constants/roles');

const ALL_ROLES = [
    ROLES.ADMIN, ROLES.PRC_STAFF,
    ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST,
];

// Read — all roles can view interviews
router.get('/',
    verifyToken,
    checkRole(ALL_ROLES),
    donorInterviewController.getAllInterviews
);

router.get('/donor/:donor_id',
    verifyToken,
    checkRole(ALL_ROLES),
    donorInterviewController.getInterviewsByDonor
);

router.get('/:id',
    verifyToken,
    checkRole(ALL_ROLES),
    donorInterviewController.getInterviewById
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole(ALL_ROLES),
    requireBloodDrive,
    donorInterviewController.createInterview
);

module.exports = router;