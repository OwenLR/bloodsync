const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const ROLES = require('../../constants/roles');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const { cache } = require('../cache/cacheService');

router.get('/', cache(300), hospitalController.getAllHospitals);
router.get('/:id', hospitalController.getHospitalById);
router.post('/', verifyToken, checkRole([ROLES.ADMIN]), hospitalController.createHospital);
router.patch('/:id', verifyToken, checkRole([ROLES.ADMIN]), hospitalController.updateHospital);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), hospitalController.deleteHospital);

module.exports = router;