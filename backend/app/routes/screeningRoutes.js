const express = require('express');
const router  = express.Router();
const screeningController = require('../controllers/screeningController');
const { verifyToken }       = require('../../middleware/authMiddleware');
const { checkRole }         = require('../../middleware/roleMiddleware');
const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
const ROLES = require('../../constants/roles');

const ALL_ROLES = [
    ROLES.ADMIN, ROLES.PRC_STAFF,
    ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST,
];

router.get('/',
    verifyToken,
    checkRole(ALL_ROLES),
    screeningController.getAllScreenings
);

router.get('/donor/:donor_id',
    verifyToken,
    checkRole(ALL_ROLES),
    screeningController.getScreeningsByDonor
);

router.get('/:id',
    verifyToken,
    checkRole(ALL_ROLES),
    screeningController.getScreeningById
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole(ALL_ROLES),
    requireBloodDrive,
    screeningController.createScreening
);

router.patch('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    screeningController.updateScreening
);

module.exports = router;