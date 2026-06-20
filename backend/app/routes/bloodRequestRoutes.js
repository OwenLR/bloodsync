const express = require('express');
const router  = express.Router();
const bloodRequestController = require('../controllers/bloodRequestController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole }   = require('../../middleware/roleMiddleware');
const upload  = require('../../middleware/uploadMiddleware');
const ROLES   = require('../../constants/roles');

// ── Requestor ─────────────────────────────────────────────────

// Submit a new blood request
router.post('/',
    verifyToken,
    checkRole([ROLES.REQUESTOR]),
    upload.single('request_form'),
    bloodRequestController.createRequest
);

// View own requests
router.get('/my-requests',
    verifyToken,
    checkRole([ROLES.REQUESTOR]),
    bloodRequestController.getMyRequests
);

// Get fulfillment options before submitting
// (which branches have stock, split vs single branch recommendation)
router.post('/fulfillment-options',
    verifyToken,
    checkRole([ROLES.REQUESTOR]),
    bloodRequestController.getFulfillmentOptions
);

// Get dynamic waiting time estimate for a branch
router.get('/estimate/:branch_id',
    verifyToken,
    checkRole([ROLES.REQUESTOR]),
    bloodRequestController.getWaitingTimeEstimate
);

// Cancel own pending request
router.patch('/:id/cancel',
    verifyToken,
    checkRole([ROLES.REQUESTOR]),
    bloodRequestController.cancelRequest
);

// Confirm receipt of blood units — Waiting → Released
// Logged as requestor action in request_status_logs
router.patch('/:id/received',
    verifyToken,
    checkRole([ROLES.REQUESTOR]),
    bloodRequestController.markReceived
);

// ── Staff / Admin ─────────────────────────────────────────────

router.get('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodRequestController.getAllRequests
);

router.get('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodRequestController.getRequestById
);

router.patch('/:id/status',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodRequestController.updateRequestStatus
);

// Mark units ready for pickup — Approved → Waiting
// Notifies the requestor via socket that units are prepared
router.patch('/:id/ready',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]),
    bloodRequestController.markReadyForPickup
);

module.exports = router;