const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');

router.get('/', branchController.getAllBranches);
router.get('/:id', branchController.getBranchById);
router.post('/', branchController.createBranch);
router.patch('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

module.exports = router;