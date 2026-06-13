/**
 * navigation.js — Nav item definitions per role.
 *
 * Owned by constants/ — navbar.js imports from here.
 * Add, remove, or reorder nav items here only.
 * Never hardcode nav links inside navbar.js or any page file.
 */

import { ROLES }   from './roles.js';
import { ROUTES }  from './routes.js';

export const NAV_ITEMS = Object.freeze({
  [ROLES.ADMIN]: [
    { label: 'Dashboard',      href: ROUTES.ADMIN.DASHBOARD      },
    { label: 'Blood Drives',   href: ROUTES.ADMIN.BLOOD_DRIVES   },
    { label: 'Donors',         href: ROUTES.ADMIN.DONORS         },
    { label: 'Blood Units',    href: ROUTES.ADMIN.BLOOD_UNITS    },
    { label: 'Blood Requests', href: ROUTES.ADMIN.BLOOD_REQUESTS },
    { label: 'Users',          href: ROUTES.ADMIN.USERS          },
    { label: 'Reports',        href: ROUTES.ADMIN.REPORTS        },
  ],
  [ROLES.PRC_STAFF]: [
    { label: 'Dashboard',      href: ROUTES.STAFF.DASHBOARD      },
    { label: 'Blood Drives',   href: ROUTES.STAFF.BLOOD_DRIVES   },
    { label: 'Donors',         href: ROUTES.STAFF.DONORS         },
    { label: 'Blood Units',    href: ROUTES.STAFF.BLOOD_UNITS    },
    { label: 'Blood Requests', href: ROUTES.STAFF.BLOOD_REQUESTS },
    { label: 'Reports',        href: ROUTES.STAFF.REPORTS        },
  ],
  [ROLES.VOLUNTEER]: [
    { label: 'Dashboard', href: ROUTES.VOLUNTEER.DASHBOARD },
    { label: 'Donors',    href: ROUTES.VOLUNTEER.DONORS    },
  ],
  [ROLES.PHLEBOTOMIST]: [
    { label: 'Dashboard', href: ROUTES.PHLEBOTOMIST.DASHBOARD },
    { label: 'Donors',    href: ROUTES.PHLEBOTOMIST.DONORS    },
  ],
  [ROLES.REQUESTOR]: [
    { label: 'Dashboard',   href: ROUTES.REQUESTOR.DASHBOARD },
    { label: 'My Requests', href: ROUTES.REQUESTOR.REQUESTS  },
  ],
});