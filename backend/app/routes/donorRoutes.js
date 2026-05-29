const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

// role_id 1 = Admin, 2 = PRC Staff, 5 = Volunteer, 6 = Phlebotomist

// Search donors
router.get('/search', verifyToken, checkRole([1, 2, 5, 6]), donorController.searchDonors);

// Get all donors
router.get('/', verifyToken, checkRole([1, 2, 5, 6]), donorController.getAllDonors);

// Get donor by id
router.get('/:id', verifyToken, checkRole([1, 2, 5, 6]), donorController.getDonorById);

// Register donor — staff and phlebotomist
router.post('/', verifyToken, checkRole([1, 2, 5, 6]), donorController.createDonor);

// Update donor
router.patch('/:id', verifyToken, checkRole([1, 2]), donorController.updateDonor);

// Delete donor — admin only
router.delete('/:id', verifyToken, checkRole([1]), donorController.deleteDonor);

module.exports = router;