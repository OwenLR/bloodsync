const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const ROLES = require('../../constants/roles');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

router.get('/', verifyToken, checkRole([ROLES.ADMIN]), userController.getAllUsers);
router.get('/:id', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), userController.getUserById);
router.post('/', verifyToken, checkRole([ROLES.ADMIN]), userController.createUser);
router.patch('/:id', verifyToken, checkRole([ROLES.ADMIN]), userController.updateUser);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), userController.deleteUser);

module.exports = router;