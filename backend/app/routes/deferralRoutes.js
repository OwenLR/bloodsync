const express = require('express');
const router = express.Router();
const deferralController = require('../controllers/deferralController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

router.get('/check/:donor_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    deferralController.checkActiveDeferral
);

router.get('/donor/:donor_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    deferralController.getDeferralsByDonor
);

router.get('/interview/:interview_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    deferralController.getDeferralsByInterview
);

module.exports = router;