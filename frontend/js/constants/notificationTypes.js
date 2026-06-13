/**
 * notificationTypes.js — Notification type constants.
 * Mirrors NOTIFICATION_TYPES in backend/constants/statuses.js exactly.
 * If the backend adds a new notification type, update here to match.
 */

export const NOTIFICATION_TYPES = Object.freeze({
  BLOOD_REQUEST_NEW:     'blood_request_new',
  BLOOD_REQUEST_STATUS:  'blood_request_status',
  BLOOD_DRIVE_ASSIGNED:  'blood_drive_assigned',
  DONOR_POST_EXTRACTION: 'donor_post_extraction',
  INVENTORY_LOW:         'inventory_low',
  INVENTORY_EXPIRING:    'inventory_expiring',
});