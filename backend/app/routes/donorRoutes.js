const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const ROLES = require('../../constants/roles');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

router.get('/search', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]), donorController.searchDonors);
router.get('/', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]), donorController.getAllDonors);
router.get('/:id', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]), donorController.getDonorById);
router.post('/', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]), donorController.createDonor);
router.patch('/:id', verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), donorController.updateDonor);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), donorController.deleteDonor);

module.exports = router;