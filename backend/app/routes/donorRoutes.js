const express = require('express');
const router  = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken }       = require('../../middleware/authMiddleware');
const { checkRole }         = require('../../middleware/roleMiddleware');
const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
const ROLES = require('../../constants/roles');
const donorCycleController = require('../controllers/donorCycleController');

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

// Walk-in (Staff/Admin) donation-cycle status — resolves whether the
// donor's most recent non-drive interview/screening/donation chain is
// in progress, in a deferral cooldown, or free to restart. Not used for
// Volunteer/Phlebotomist drive-scoped flows.
// No route-shadowing risk vs GET /:id — two segments, not one.
router.get('/:donor_id/cycle-status',
    verifyToken,
    checkRole(ALL_ROLES),
    donorCycleController.getWalkInCycleStatus
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole(ALL_ROLES),
    requireBloodDrive,
    donorController.createDonor
);

// Update — full update, staff only
router.patch('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    donorController.updateDonor
);

// Update — contact info only (email/contact), Volunteer + Phlebotomist.
// Narrower than the full update above — see donorContactValidator.js for
// why this is a separate route rather than adding these roles to PATCH /:id.
// No route-shadowing risk vs PATCH /:id — different path shape (:id only
// captures a single segment, not /:id/contact's two segments).
router.patch('/:id/contact',
    verifyToken,
    checkRole([ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    donorController.updateDonorContact
);

router.delete('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    donorController.deleteDonor
);

module.exports = router;