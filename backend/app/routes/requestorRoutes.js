const express = require('express');
const router = express.Router();
const requestorController = require('../controllers/requestorController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { verifyRequestorToken } = require('../../middleware/requestorAuthMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const upload = require('../../middleware/uploadMiddleware');
const ROLES = require('../../constants/roles');

// Public — no token needed
router.post('/register', requestorController.register);
router.post('/login', requestorController.login);
router.post('/logout', requestorController.logout);

// Requestor — own profile
router.get('/me', verifyRequestorToken, requestorController.getProfile);
router.patch('/me', verifyRequestorToken, upload.single('profile_img'), requestorController.updateProfile);

// Staff/Admin — manage requestors
router.get('/', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), requestorController.getAllRequestors);
router.get('/:id', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), requestorController.getRequestorById);

module.exports = router;