// app/controllers/notificationController.js

const notificationModel = require('../repositories/notificationModel');
const response = require('../../utils/responseHelper');

async function getMyNotifications(req, res) {
  try {
    const user_id = req.user.user_id;
    const notifications = await notificationModel.getNotificationsByUser(user_id);
    return response.success(res, notifications);
  } catch (error) {
    return response.handleError(res, error);
  }
}

async function getUnreadCount(req, res) {
  try {
    const user_id = req.user.user_id;
    const count = await notificationModel.getUnreadCount(user_id);
    return response.success(res, { count });
  } catch (error) {
    return response.handleError(res, error);
  }
}

async function markAsRead(req, res) {
  try {
    const user_id = req.user.user_id;
    const { notification_id } = req.params;

    const updated = await notificationModel.markAsRead(notification_id, user_id);
    if (!updated) return response.notFound(res, 'Notification not found.');

    return response.success(res, updated);
  } catch (error) {
    return response.handleError(res, error);
  }
}

async function markAllAsRead(req, res) {
  try {
    const user_id = req.user.user_id;
    await notificationModel.markAllAsRead(user_id);
    return response.success(res, { message: 'All notifications marked as read.' });
  } catch (error) {
    return response.handleError(res, error);
  }
}

module.exports = { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead };