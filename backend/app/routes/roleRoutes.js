const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

// Admin only
router.get('/', verifyToken, checkRole([1]), roleController.getAllRoles);
router.get('/:id', verifyToken, checkRole([1]), roleController.getRoleById);
router.post('/', verifyToken, checkRole([1]), roleController.createRole);
router.patch('/:id', verifyToken, checkRole([1]), roleController.updateRole);
router.delete('/:id', verifyToken, checkRole([1]), roleController.deleteRole);

module.exports = router;