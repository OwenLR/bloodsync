const express = require('express');
const router  = express.Router();
const bloodDriveController = require('../controllers/bloodDriveController');
const { verifyToken }  = require('../../middleware/authMiddleware');
const { checkRole }    = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

const ADMIN_STAFF = [ROLES.ADMIN, ROLES.PRC_STAFF];
const ALL_STAFF_AND_FIELD = [
    ROLES.ADMIN, ROLES.PRC_STAFF,
    ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST,
];

// ── Blood Drive CRUD ──────────────────────────────────────────

// All staff can view all drives
router.get('/',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.getAllDrives
);

// Volunteers/Phlebotomists can view a single drive (e.g. to see their assignment)
router.get('/:id',
    verifyToken,
    checkRole(ALL_STAFF_AND_FIELD),
    bloodDriveController.getDriveById
);

// Drives by branch — staff only
router.get('/branch/:branch_id',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.getDrivesByBranch
);

// Create — Admin and PRC Staff
// PRC Staff branch restriction enforced in service
router.post('/',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.createDrive
);

// Update — Admin and PRC Staff
// Cannot update Cancelled or Ended drives (enforced in service)
router.patch('/:id',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.updateDrive
);

// Cancel — Admin and PRC Staff
// Separate endpoint for explicit cancel action with reason
router.patch('/:id/cancel',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.cancelDrive
);

// ── Participants ──────────────────────────────────────────────

router.get('/:id/participants',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.getParticipants
);

router.post('/:id/participants',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.addParticipant
);

// Remove participant from drive
router.delete('/:id/participants/:user_id',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.removeParticipant
);

// Update participant assignment_status (Confirmed, Declined, No Show)
router.patch('/:id/participants/:user_id',
    verifyToken,
    checkRole(ADMIN_STAFF),
    bloodDriveController.updateParticipantStatus
);

module.exports = router;