const express         = require('express');
const router          = express.Router();
const userController  = require('../controllers/userController');
const ROLES           = require('../../constants/roles');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole }   = require('../../middleware/roleMiddleware');
const upload          = require('../../middleware/uploadMiddleware');

const SELF_SERVICE_ROLES = [ROLES.ADMIN, ROLES.PRC_STAFF];

router.get('/', verifyToken, checkRole([ROLES.ADMIN]), userController.getAllUsers);

// Self-service profile photo route — registered BEFORE /:id to avoid Express
// route shadowing (otherwise PATCH /:id would match "me" as if it were an
// id, same issue previously fixed for GET /api/volunteers/available).
// Password change lives at PATCH /api/auth/me/password instead (shared by
// all roles — see authRoutes.js).
router.patch('/me/profile-img', verifyToken, checkRole(SELF_SERVICE_ROLES), upload.single('profile_img'), userController.updateMyProfileImg);

router.get('/:id', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), userController.getUserById);
router.post('/', verifyToken, checkRole([ROLES.ADMIN]), userController.createUser);
router.patch('/:id', verifyToken, checkRole([ROLES.ADMIN]), userController.updateUser);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), userController.deleteUser);

module.exports = router;