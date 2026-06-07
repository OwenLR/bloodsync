const express = require('express');
const router  = express.Router();
const bloodCollectionController = require('../controllers/bloodCollectionController');
const { verifyToken }       = require('../../middleware/authMiddleware');
const { checkRole }         = require('../../middleware/roleMiddleware');
const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
const ROLES = require('../../constants/roles');

// Read — staff only (requestors should never see temporary holding)
router.get('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.getAllCollections
);

router.get('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.getCollectionById
);

router.get('/branch/:branch_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.getCollectionsByBranch
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    requireBloodDrive,
    bloodCollectionController.createCollection
);

// Status update — staff only
router.patch('/:id/status',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.updateCollectionStatus
);

module.exports = router;