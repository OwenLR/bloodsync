// app/routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { checkRole } = require('../../middleware/roleMiddleware');
const notificationController = require('../controllers/notificationController');
const ROLES = require('../../constants/roles');

const allowedRoles = [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.REQUESTOR, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

router.get('/', verifyToken, checkRole(allowedRoles), notificationController.getMyNotifications);
router.get('/unread-count', verifyToken, checkRole(allowedRoles), notificationController.getUnreadCount);
router.patch('/:notification_id/read', verifyToken, checkRole(allowedRoles), notificationController.markAsRead);
router.patch('/read-all', verifyToken, checkRole(allowedRoles), notificationController.markAllAsRead);

module.exports = router;