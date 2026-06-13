/**
 * routes.js — Frontend page route constants.
 *
 * Import from here instead of hardcoding page paths anywhere in the app.
 * If a page path changes, update here — no other files need to change.
 *
 * Used by: guards, auth.js (redirectByRole), navbar.js, sidebarItems.js
 */

export const ROUTES = Object.freeze({
  LOGIN:     '/index.html',
  NOT_FOUND: '/pages/404.html',

  ADMIN: Object.freeze({
    DASHBOARD:      '/pages/admin/dashboard.html',
    BLOOD_DRIVES:   '/pages/admin/blood-drives.html',
    DONORS:         '/pages/admin/donors.html',
    BLOOD_UNITS:    '/pages/admin/blood-units.html',
    BLOOD_REQUESTS: '/pages/admin/blood-requests.html',
    USERS:          '/pages/admin/users.html',
    REPORTS:        '/pages/admin/reports.html',
    NOTIFICATIONS:  '/pages/admin/notifications.html',
  }),

  STAFF: Object.freeze({
    DASHBOARD:      '/pages/staff/dashboard.html',
    BLOOD_DRIVES:   '/pages/staff/blood-drives.html',
    DONORS:         '/pages/staff/donors.html',
    BLOOD_UNITS:    '/pages/staff/blood-units.html',
    BLOOD_REQUESTS: '/pages/staff/blood-requests.html',
    REPORTS:        '/pages/staff/reports.html',
    NOTIFICATIONS:  '/pages/staff/notifications.html',
  }),

  VOLUNTEER: Object.freeze({
    DASHBOARD:    '/pages/volunteer/dashboard.html',
    DONORS:       '/pages/volunteer/donors.html',
    REGISTER:     '/pages/volunteer/donor-registration.html',
    INTERVIEW:    '/pages/volunteer/donor-interview.html',
    DRIVE:        '/pages/volunteer/drive.html',
    NOTIFICATIONS:'/pages/volunteer/notifications.html',
  }),

  PHLEBOTOMIST: Object.freeze({
    DASHBOARD:    '/pages/phlebotomist/dashboard.html',
    DONORS:       '/pages/phlebotomist/donors.html',
    REGISTER:     '/pages/phlebotomist/donor-registration.html',
    SCREENING:    '/pages/phlebotomist/donor-screening.html',
    DONATION:     '/pages/phlebotomist/donor-donation.html',
    COLLECTION:   '/pages/phlebotomist/donor-collection.html',
    DRIVE:        '/pages/phlebotomist/drive.html',
    NOTIFICATIONS:'/pages/phlebotomist/notifications.html',
  }),

  REQUESTOR: Object.freeze({
    DASHBOARD:     '/pages/requestor/dashboard.html',
    REQUESTS:      '/pages/requestor/requests.html',
    AVAILABILITY:  '/pages/requestor/availability.html',
    NOTIFICATIONS: '/pages/requestor/notifications.html',
  }),
});