const express = require('express');
const router = express.Router();
const bloodRequestController = require('../controllers/bloodRequestController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { verifyRequestorToken } = require('../../middleware/requestorAuthMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const upload = require('../../middleware/uploadMiddleware');
const ROLES = require('../../constants/roles');

// Requestor — submit and view own requests
router.post('/', verifyRequestorToken, upload.single('request_form'), bloodRequestController.createRequest);
router.get('/my-requests', verifyRequestorToken, bloodRequestController.getMyRequests);

// Staff/Admin — view and manage all requests
router.get('/', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), bloodRequestController.getAllRequests);
router.get('/:id', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), bloodRequestController.getRequestById);
router.patch('/:id/status', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), bloodRequestController.updateRequestStatus);

module.exports = router;