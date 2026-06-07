const express = require('express');
const router  = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken }       = require('../../middleware/authMiddleware');
const { checkRole }         = require('../../middleware/roleMiddleware');
const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
const ROLES = require('../../constants/roles');

const ALL_ROLES = [
    ROLES.ADMIN, ROLES.PRC_STAFF,
    ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST,
];

// Read — all roles can search and view donors
router.get('/search',
    verifyToken,
    checkRole(ALL_ROLES),
    donorController.searchDonors
);

router.get('/',
    verifyToken,
    checkRole(ALL_ROLES),
    donorController.getAllDonors
);

router.get('/:id',
    verifyToken,
    checkRole(ALL_ROLES),
    donorController.getDonorById
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole(ALL_ROLES),
    requireBloodDrive,
    donorController.createDonor
);

// Update/delete — staff only
router.patch('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    donorController.updateDonor
);

router.delete('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    donorController.deleteDonor
);

module.exports = router;