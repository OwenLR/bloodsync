const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const ROLES = require('../../constants/roles');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const { cache } = require('../cache/cacheService');

router.get('/', cache(300), branchController.getAllBranches);
router.get('/:id', branchController.getBranchById);
router.post('/', verifyToken, checkRole([ROLES.ADMIN]), branchController.createBranch);
router.patch('/:id', verifyToken, checkRole([ROLES.ADMIN]), branchController.updateBranch);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), branchController.deleteBranch);

module.exports = router;