const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

// Admin only
router.get('/', verifyToken, checkRole([1]), userController.getAllUsers);
router.get('/:id', verifyToken, checkRole([1, 2]), userController.getUserById);
router.post('/', verifyToken, checkRole([1]), userController.createUser);
router.patch('/:id', verifyToken, checkRole([1]), userController.updateUser);
router.delete('/:id', verifyToken, checkRole([1]), userController.deleteUser);

module.exports = router;