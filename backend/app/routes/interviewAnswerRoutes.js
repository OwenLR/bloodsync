const express = require('express');
const router  = express.Router();
const interviewAnswerController = require('../controllers/interviewAnswerController');
const { verifyToken }       = require('../../middleware/authMiddleware');
const { checkRole }         = require('../../middleware/roleMiddleware');
const { requireBloodDrive } = require('../../middleware/bloodDriveMiddleware');
const ROLES = require('../../constants/roles');

const ALL_ROLES = [
    ROLES.ADMIN, ROLES.PRC_STAFF,
    ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST,
];

router.get('/interview/:interview_id',
    verifyToken,
    checkRole(ALL_ROLES),
    interviewAnswerController.getAnswersByInterview
);

// Write — Volunteers/Phlebotomists must be in an active blood drive
router.post('/',
    verifyToken,
    checkRole(ALL_ROLES),
    requireBloodDrive,
    interviewAnswerController.submitAnswers
);

module.exports = router;