const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

// GET is public — needed for registration forms
router.get('/', branchController.getAllBranches);
router.get('/:id', branchController.getBranchById);

// Write operations — admin only
router.post('/', verifyToken, checkRole([1]), branchController.createBranch);
router.patch('/:id', verifyToken, checkRole([1]), branchController.updateBranch);
router.delete('/:id', verifyToken, checkRole([1]), branchController.deleteBranch);

module.exports = router;