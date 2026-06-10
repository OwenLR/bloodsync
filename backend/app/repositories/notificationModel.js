// app/repositories/notificationModel.js

const pool = require('../../config/db');

async function createNotification({ user_id, type, title, message, reference_id = null, reference_type = null }) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user_id, type, title, message, reference_id, reference_type]
  );
  return result.rows[0];
}

async function getNotificationsByUser(user_id) {
  const result = await pool.query(
    `SELECT *
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [user_id]
  );
  return result.rows;
}

async function markAsRead(notification_id, user_id) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE notification_id = $1 AND user_id = $2
     RETURNING *`,
    [notification_id, user_id]
  );
  return result.rows[0];
}

async function markAllAsRead(user_id) {
  await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false`,
    [user_id]
  );
}

async function getUnreadCount(user_id) {
  const result = await pool.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE user_id = $1 AND is_read = false`,
    [user_id]
  );
  return parseInt(result.rows[0].count);
}

module.exports = {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};