/**
 * routes.js — Frontend page route constants.
 *
 * Import from here instead of hardcoding page paths anywhere in the app.
 * If a page path changes, update here — no other files need to change.
 *
 * Used by: guards, auth.js (redirectByRole), navbar.js, sidebarItems.js
 *
 * FIELD routes — shared between Volunteer and Phlebotomist.
 * Both roles can perform any step of the donor workflow. Pages live under
 * /pages/field/ rather than /pages/volunteer/ or /pages/phlebotomist/ to
 * avoid implying role restrictions that don't exist at the backend level.
 * The existing /pages/volunteer/ and /pages/phlebotomist/ routes are kept
 * for role-specific pages (dashboard, drive assignment, notifications).
 */

export const ROUTES = Object.freeze({
  LOGIN:     '/index.html',
  NOT_FOUND: '/pages/404.html',

  ADMIN: Object.freeze({
    DASHBOARD:          '/pages/admin/dashboard.html',
    BLOOD_DRIVES:       '/pages/admin/bloodDrives.html',
    BLOOD_DRIVE_CREATE: '/pages/admin/bloodDriveCreate.html',
    DONORS:             '/pages/admin/donors.html',
    BLOOD_UNITS:        '/pages/admin/bloodUnits.html',
    BLOOD_REQUESTS:     '/pages/admin/bloodRequests.html',
    USERS:              '/pages/admin/users.html',
    REPORTS:            '/pages/admin/reports.html',
    NOTIFICATIONS:      '/pages/admin/notifications.html',
    SETTINGS:           '/pages/admin/settings.html',
  }),

  STAFF: Object.freeze({
    DASHBOARD:          '/pages/staff/dashboard.html',
    BLOOD_DRIVES:       '/pages/staff/bloodDrives.html',
    BLOOD_DRIVE_CREATE: '/pages/staff/bloodDriveCreate.html',
    DONORS:             '/pages/staff/donors.html',
    BLOOD_UNITS:        '/pages/staff/bloodUnits.html',
    BLOOD_REQUESTS:     '/pages/staff/bloodRequests.html',
    REPORTS:            '/pages/staff/reports.html',
    NOTIFICATIONS:      '/pages/staff/notifications.html',
    SETTINGS:           '/pages/staff/settings.html',
  }),

  // Shared donor workflow pages — used by both Volunteer and Phlebotomist.
  // Entry files under /pages/field/ accept both roles via requireRole guard.
  FIELD: Object.freeze({
    REGISTER:   '/pages/field/donorRegistration.html',
    INTERVIEW:  '/pages/field/donorInterview.html',
    SCREENING:  '/pages/field/donorScreening.html',
    DONATION:   '/pages/field/donorDonation.html',
    COLLECTION: '/pages/field/donorCollection.html',
  }),

  VOLUNTEER: Object.freeze({
    DASHBOARD:     '/pages/volunteer/dashboard.html',
    DONORS:        '/pages/volunteer/donors.html',
    DRIVE:         '/pages/volunteer/drive.html',
    NOTIFICATIONS: '/pages/volunteer/notifications.html',
  }),

  PHLEBOTOMIST: Object.freeze({
    DASHBOARD:     '/pages/phlebotomist/dashboard.html',
    DONORS:        '/pages/phlebotomist/donors.html',
    DRIVE:         '/pages/phlebotomist/drive.html',
    NOTIFICATIONS: '/pages/phlebotomist/notifications.html',
  }),

  REQUESTOR: Object.freeze({
    DASHBOARD:     '/pages/requestor/dashboard.html',
    REQUESTS:      '/pages/requestor/requests.html',
    AVAILABILITY:  '/pages/requestor/availability.html',
    NOTIFICATIONS: '/pages/requestor/notifications.html',
  }),
});