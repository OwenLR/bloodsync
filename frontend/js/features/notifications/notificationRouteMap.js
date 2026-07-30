// js/features/notifications/notificationRouteMap.js
//
// Maps a notification (type + reference_id) to a role-appropriate
// destination URL. Returns null when no destination exists for that
// role/type combo — those notifications stay non-interactive.
//
// Role-specific because the same type can go to different roles with
// different pages. Reference_id deep-linking only exists where the
// target page actually supports it (currently just the Staff Blood
// Request detail page's ?id= pattern) — everywhere else routes to the
// general list/section page, per your call above.
//
// NOTE: INVENTORY_LOW/INVENTORY_EXPIRING -> Admin routes to
// ROUTES.ADMIN.REPORTS, which is not yet built (sessionState.md Not
// Started — Reports is build-last). Wired now since the route constant
// already exists; link is inert until that page ships.

import { ROUTES } from '../../constants/routes.js';
import { ROLES } from '../../constants/roles.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';

export function getNotificationTarget(notification, roleId) {
  const { type, reference_id } = notification;

  switch (type) {
    case NOTIFICATION_TYPES.BLOOD_REQUEST_NEW:
      // Only Staff ever receive this type — notifyNewBloodRequest()
      // messages staffList only, never admins.
      return roleId === ROLES.PRC_STAFF
        ? `${ROUTES.STAFF.BLOOD_REQUEST_DETAIL}?id=${reference_id}`
        : null;

    case NOTIFICATION_TYPES.BLOOD_REQUEST_STATUS:
      // Only Requestor receives this type. No per-request detail page
      // exists for Requestor — routes to the flat "My Requests" list.
      return roleId === ROLES.REQUESTOR ? ROUTES.REQUESTOR.REQUESTS : null;

    case NOTIFICATION_TYPES.BLOOD_DRIVE_ASSIGNED:
      // Only Vol/Phleb receive this type. No per-drive deep link —
      // routes to the general "My Assignments" page.
      if (roleId === ROLES.VOLUNTEER) return ROUTES.VOLUNTEER.DRIVE;
      if (roleId === ROLES.PHLEBOTOMIST) return ROUTES.PHLEBOTOMIST.DRIVE;
      return null;

    case NOTIFICATION_TYPES.INVENTORY_LOW:
    case NOTIFICATION_TYPES.INVENTORY_EXPIRING:
      // Staff -> their Blood Units page (backend already branch-scopes
      // them). Admin -> Reports, since Admin has no Blood Units page
      // (permanently excluded, see sessionState.md Permanent Rules).
      if (roleId === ROLES.PRC_STAFF) return ROUTES.STAFF.BLOOD_UNITS;
      if (roleId === ROLES.ADMIN) return ROUTES.ADMIN.REPORTS;
      return null;

    case NOTIFICATION_TYPES.DONOR_POST_EXTRACTION:
      // Email-only, never appears in-app — see notificationsUI.js's
      // TYPE_LABELS comment.
      return null;

    default:
      // Unknown/future type — stay non-interactive rather than guess.
      return null;
  }
}