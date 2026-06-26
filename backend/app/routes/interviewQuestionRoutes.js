const express = require('express');
const router = express.Router();
const interviewQuestionController = require('../controllers/interviewQuestionController');
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const ROLES = require('../../constants/roles');

router.get('/',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    interviewQuestionController.getAllQuestions
);

router.get('/sex/:sex',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    interviewQuestionController.getQuestionsByGender
);

router.get('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST]),
    interviewQuestionController.getQuestionById
);

router.patch('/:id',
    verifyToken,
    checkRole([ROLES.ADMIN]),
    interviewQuestionController.updateQuestion
);

module.exports = router;