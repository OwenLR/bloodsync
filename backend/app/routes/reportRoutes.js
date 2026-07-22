const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

router.get('/inventory',  verifyToken, checkRole([ROLES.PRC_STAFF]), reportController.getInventoryReport);
router.get('/donors',     verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), reportController.getDonorsReport);
router.get('/drives',     verifyToken, checkRole([ROLES.ADMIN, ROLES.PRC_STAFF]), reportController.getDrivesReport);
router.get('/testing',    verifyToken, checkRole([ROLES.PRC_STAFF]), reportController.getTestingReport);
router.get('/requests',   verifyToken, checkRole([ROLES.PRC_STAFF]), reportController.getRequestsReport);
router.get('/users',      verifyToken, checkRole([ROLES.ADMIN]), reportController.getUsersReport);

// ASSUMPTION: ROLES.VOLUNTEER / ROLES.PHLEBOTOMIST match the frontend's
// roles.js naming (role_id 5 and 6 per contract.md). Backend constants/
// roles.js was not uploaded this session, if the real constant names
// differ, fix this line to match.
router.get('/my-impact',  verifyToken, checkRole([ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]), reportController.getMyImpactReport);

module.exports = router;