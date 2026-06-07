const express = require('express');
const router = express.Router();
const bloodUnitController = require('../controllers/bloodUnitController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const { cache } = require('../cache/cacheService');
const ROLES = require('../../constants/roles');

router.get('/availability',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.REQUESTOR]),
    cache(60, () => 'cache:blood-units:availability'),
    bloodUnitController.getInventoryAvailability
);

// Staff views full inventory with counts
router.get('/inventory',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodUnitController.getInventoryByBloodType
);

// Units by branch
router.get('/branch/:branch_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodUnitController.getUnitsByBranch
);

// Get all units
router.get('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodUnitController.getAllUnits
);

// Get one unit
router.get('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodUnitController.getUnitById
);

// Update unit status
router.patch('/:id/status',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodUnitController.updateUnitStatus
);

module.exports = router;