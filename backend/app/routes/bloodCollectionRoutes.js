const express = require('express');
const router = express.Router();
const bloodCollectionController = require('../controllers/bloodCollectionController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

// Get all collections — staff only
// requestors should NOT see temporary holding
router.get('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.getAllCollections
);

// Get one collection — staff only
router.get('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.getCollectionById
);

// Get collections by branch — staff only
router.get('/branch/:branch_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.getCollectionsByBranch
);

// Create collection
router.post('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    bloodCollectionController.createCollection
);

// Update status — staff marks Safe or Rejected
router.patch('/:id/status',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodCollectionController.updateCollectionStatus
);

module.exports = router;