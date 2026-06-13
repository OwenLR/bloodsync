/**
 * sidebarItems.js — Sidebar navigation definitions per role and section.
 *
 * sidebar.js is a pure renderer — it knows nothing about roles or pages.
 * This file owns all sidebar navigation structure.
 *
 * Usage in entry files:
 *   import { getSidebarItems } from '../constants/sidebarItems.js';
 *   renderSidebar(getSidebarItems(user.role_id, 'operations'));
 *
 * Sections per role:
 *   Admin        — operations, management
 *   PRC Staff    — operations, management
 *   Volunteer    — operations, drive
 *   Phlebotomist — operations, drive
 *   Requestor    — requests
 */

import { ROLES }  from './roles.js';
import { ROUTES } from './routes.js';

const SIDEBAR_DEFINITIONS = {

  [ROLES.ADMIN]: {
    operations: [
      { label: 'Donors',         href: ROUTES.ADMIN.DONORS         },
      { label: 'Blood Drives',   href: ROUTES.ADMIN.BLOOD_DRIVES   },
      { label: 'Blood Units',    href: ROUTES.ADMIN.BLOOD_UNITS    },
      { label: 'Blood Requests', href: ROUTES.ADMIN.BLOOD_REQUESTS },
    ],
    management: [
      { label: 'Users',   href: ROUTES.ADMIN.USERS   },
      { label: 'Reports', href: ROUTES.ADMIN.REPORTS },
    ],
  },

  [ROLES.PRC_STAFF]: {
    operations: [
      { label: 'Donors',         href: ROUTES.STAFF.DONORS         },
      { label: 'Blood Drives',   href: ROUTES.STAFF.BLOOD_DRIVES   },
      { label: 'Blood Units',    href: ROUTES.STAFF.BLOOD_UNITS    },
      { label: 'Blood Requests', href: ROUTES.STAFF.BLOOD_REQUESTS },
    ],
    management: [
      { label: 'Reports', href: ROUTES.STAFF.REPORTS },
    ],
  },

  [ROLES.VOLUNTEER]: {
    operations: [
      { label: 'Register Donor',    href: ROUTES.VOLUNTEER.REGISTER  },
      { label: 'Conduct Interview', href: ROUTES.VOLUNTEER.INTERVIEW  },
    ],
    drive: [
      { label: 'My Assignment',  href: ROUTES.VOLUNTEER.DRIVE  },
      { label: 'Drive Schedule', href: ROUTES.VOLUNTEER.DRIVE  },
    ],
  },

  [ROLES.PHLEBOTOMIST]: {
    operations: [
      { label: 'Register Donor',     href: ROUTES.PHLEBOTOMIST.REGISTER   },
      { label: 'Conduct Screening',  href: ROUTES.PHLEBOTOMIST.SCREENING  },
      { label: 'Record Donation',    href: ROUTES.PHLEBOTOMIST.DONATION   },
      { label: 'Record Collection',  href: ROUTES.PHLEBOTOMIST.COLLECTION },
    ],
    drive: [
      { label: 'My Assignment',  href: ROUTES.PHLEBOTOMIST.DRIVE },
      { label: 'Drive Schedule', href: ROUTES.PHLEBOTOMIST.DRIVE },
    ],
  },

  [ROLES.REQUESTOR]: {
    requests: [
      { label: 'Submit Request',    href: ROUTES.REQUESTOR.REQUESTS     },
      { label: 'My Requests',       href: ROUTES.REQUESTOR.REQUESTS     },
      { label: 'Blood Availability',href: ROUTES.REQUESTOR.AVAILABILITY },
    ],
  },

};

/**
 * getSidebarItems(roleId, section)
 *
 * Returns the sidebar items for a given role and section.
 * Returns an empty array if the role or section doesn't exist.
 *
 * @param {number} roleId  — user.role_id
 * @param {string} section — e.g. 'operations', 'management', 'drive', 'requests'
 * @returns {Array<{ label: string, href: string }>}
 */
export function getSidebarItems(roleId, section) {
  return SIDEBAR_DEFINITIONS[roleId]?.[section] ?? [];
}

/**
 * getSidebarSections(roleId)
 *
 * Returns all section keys available for a given role.
 * Useful when an entry file needs to render multiple sections.
 *
 * @param {number} roleId
 * @returns {string[]}
 */
export function getSidebarSections(roleId) {
  return Object.keys(SIDEBAR_DEFINITIONS[roleId] ?? {});
}