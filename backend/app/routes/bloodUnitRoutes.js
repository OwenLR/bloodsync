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

// Staff views full inventory with counts — cached, invalidated on any unit mutation
router.get('/inventory',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    cache(60, () => 'cache:blood-units:inventory'),
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

// Separate a whole blood unit into 3 component collections
router.post('/:id/separate',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodUnitController.separateUnit
);

module.exports = router;