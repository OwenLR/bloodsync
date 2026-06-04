const express = require('express');
const router = express.Router();
const donorInterviewController = require('../controllers/donorInterviewController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

router.get('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    donorInterviewController.getAllInterviews
);

router.get('/donor/:donor_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    donorInterviewController.getInterviewsByDonor
);

router.get('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    donorInterviewController.getInterviewById
);

router.post('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    donorInterviewController.createInterview
);

module.exports = router;