import { apiFetch } from '../../core/api.js';

const BASE = '/api/notifications';

// GET /api/notifications
// Scoped to the logged-in user server-side — no query params needed.
// Same list is used for all 5 roles (Admin, Staff, Vol, Phleb, Requestor) —
// notificationRoutes.js allows all of them on this route.
export async function getMyNotifications() {
  const res  = await apiFetch(BASE);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load notifications.');
  return body.data;
}

// GET /api/notifications/unread-count
// Response shape: { data: { count: 3 } } — unwrap to just the number here
// so callers (navbar badge, this page) don't each have to know the shape.
export async function getUnreadCount() {
  const res  = await apiFetch(`${BASE}/unread-count`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load unread count.');
  return body.data.count;
}

// PATCH /api/notifications/:notification_id/read
export async function markAsRead(notificationId) {
  const res  = await apiFetch(`${BASE}/${notificationId}/read`, {
    method: 'PATCH',
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to mark notification as read.');
  return body.data;
}

// PATCH /api/notifications/read-all
export async function markAllAsRead() {
  const res  = await apiFetch(`${BASE}/read-all`, {
    method: 'PATCH',
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to mark all notifications as read.');
  return body.data;
}