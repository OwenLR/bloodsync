const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');

// GET is public — requestors need hospital list
router.get('/', hospitalController.getAllHospitals);
router.get('/:id', hospitalController.getHospitalById);

// Write operations — admin only
router.post('/', verifyToken, checkRole([1]), hospitalController.createHospital);
router.patch('/:id', verifyToken, checkRole([1]), hospitalController.updateHospital);
router.delete('/:id', verifyToken, checkRole([1]), hospitalController.deleteHospital);

module.exports = router;