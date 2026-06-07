const express = require('express');
const router  = express.Router();
const donationController = require('../controllers/donationController');
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
    donationController.getAllDonations
);

router.get('/donor/:donor_id',
    verifyToken,
    checkRole(ALL_ROLES),
    donationController.getDonationsByDonor
);

router.get('/:id',
    verifyToken,
    checkRole(ALL_ROLES),
    donationController.getDonationById
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole(ALL_ROLES),
    requireBloodDrive,
    donationController.createDonation
);

router.patch('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    donationController.updateDonation
);

module.exports = router;