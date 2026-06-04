const express = require('express');
const router = express.Router();
const interviewAnswerController = require('../controllers/interviewAnswerController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

router.get('/interview/:interview_id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    interviewAnswerController.getAnswersByInterview
);

router.post('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    interviewAnswerController.submitAnswers
);

module.exports = router;