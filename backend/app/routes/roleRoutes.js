const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const ROLES = require('../../constants/roles');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

// Admin only
router.get('/', verifyToken, checkRole([ROLES.ADMIN]), roleController.getAllRoles);
router.get('/:id', verifyToken, checkRole([ROLES.ADMIN]), roleController.getRoleById);
router.post('/', verifyToken, checkRole([ROLES.ADMIN]), roleController.createRole);
router.patch('/:id', verifyToken, checkRole([ROLES.ADMIN]), roleController.updateRole);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), roleController.deleteRole);

module.exports = router;