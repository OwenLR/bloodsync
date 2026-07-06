/**
 * sidebarItems.js | Sidebar navigation definitions per role and section.
 *
 * sidebar.js is a pure renderer | it knows nothing about roles or pages.
 * This file owns all sidebar navigation structure.
 *
 * Usage in entry files:
 *   import { getSidebarItems } from '../constants/sidebarItems.js';
 *   renderSidebar(getSidebarItems(user.role_id, 'general'), 'General');
 *
 * Item shape:
 *   Flat item:   { label: string, href: string }
 *   Group item:  { label: string, group: true, children: [{ label, href }] }
 *
 * Group items render as a collapsible <details>/<summary> block in sidebar.js.
 * The group is open by default | field roles navigate between steps constantly.
 *
 * Sections per role:
 *   Admin        | general, management
 *   PRC Staff    | general, management
 *   Volunteer    | general, workflow, drive
 *   Phlebotomist | general, workflow, drive
 *   Requestor    | general
 *
 * Field role note:
 *   Both Volunteer and Phlebotomist see all five workflow steps and share the
 *   same /pages/field/ pages. The backend enforces what each user can do |
 *   the sidebar does not restrict by role label. This allows cooperation:
 *   any assigned user can perform any step during an active blood drive.
 *
 * Admin/Staff Donors group (Option B):
 *   Admin and PRC Staff are not required to be assigned to a blood drive |
 *   they can register donors and run the full donor workflow as walk-ins
 *   (drive_id = NULL for these operations, which is correct, not a bug).
 *   The Donors sidebar item is a collapsible group containing the donor
 *   list page plus all five field workflow steps, using the SAME routes
 *   as Volunteer/Phlebotomist (ROUTES.FIELD.*) | the pages are shared,
 *   only the sidebar entry point differs by role.
 */

import { ROLES }  from './roles.js';
import { ROUTES } from './routes.js';

const SIDEBAR_DEFINITIONS = {

  [ROLES.ADMIN]: {
    general: [
      { label: 'Dashboard', href: ROUTES.ADMIN.DASHBOARD },
      {
        label:    'Donors',
        group:    true,
        children: [
          { label: 'Donor List', href: ROUTES.ADMIN.DONORS },
        ],
      },
      { label: 'Blood Drives',   href: ROUTES.ADMIN.BLOOD_DRIVES   },
      { label: 'Blood Units',    href: ROUTES.ADMIN.BLOOD_UNITS    },
      { label: 'Blood Requests', href: ROUTES.ADMIN.BLOOD_REQUESTS },
    ],
    management: [
      { label: 'Users',    href: ROUTES.ADMIN.USERS    },
      { label: 'Reports',  href: ROUTES.ADMIN.REPORTS  },
      { label: 'Settings', href: ROUTES.ADMIN.SETTINGS },
    ],
  },

  [ROLES.PRC_STAFF]: {
    general: [
      { label: 'Dashboard', href: ROUTES.STAFF.DASHBOARD },
      {
        label:    'Donors',
        group:    true,
        children: [
          { label: 'Donor List',        href: ROUTES.STAFF.DONORS     },
          { label: 'Register Donor',    href: ROUTES.FIELD.REGISTER   },
          { label: 'Conduct Interview', href: ROUTES.FIELD.INTERVIEW  },
          { label: 'Conduct Screening', href: ROUTES.FIELD.SCREENING  },
          { label: 'Record Donation & Collection', href: ROUTES.FIELD.DONATION },
        ],
      },
      { label: 'Blood Drives',   href: ROUTES.STAFF.BLOOD_DRIVES      },
      { label: 'Blood Testing',      href: ROUTES.STAFF.BLOOD_COLLECTIONS },
      { label: 'Blood Units',        href: ROUTES.STAFF.BLOOD_UNITS       },
      { label: 'Inventory Cleaning', href: ROUTES.STAFF.INVENTORY_CLEANING },
      { label: 'Blood Separation',   href: ROUTES.STAFF.BLOOD_SEPARATION  },
      { label: 'Blood Requests',     href: ROUTES.STAFF.BLOOD_REQUESTS    },
    ],
    management: [
      { label: 'Reports',  href: ROUTES.STAFF.REPORTS  },
      { label: 'Settings', href: ROUTES.STAFF.SETTINGS },
    ],
  },

  // Volunteer and Phlebotomist share identical sidebar structure.
  // Both roles can perform all five donor workflow steps | the backend
  // enforces access via bloodDriveMiddleware, not by role label.
  [ROLES.VOLUNTEER]: {
    general: [
      { label: 'Dashboard', href: ROUTES.VOLUNTEER.DASHBOARD },
    ],
    workflow: [
      {
        label:    'Blood Drive Workflow',
        group:    true,
        children: [
          { label: 'Register Donor',    href: ROUTES.FIELD.REGISTER   },
          { label: 'Conduct Interview', href: ROUTES.FIELD.INTERVIEW  },
          { label: 'Conduct Screening', href: ROUTES.FIELD.SCREENING  },
          { label: 'Record Donation & Collection', href: ROUTES.FIELD.DONATION },
        ],
      },
    ],
    drive: [
      { label: 'My Assignment', href: ROUTES.VOLUNTEER.DRIVE },
    ],
  },

  [ROLES.PHLEBOTOMIST]: {
    general: [
      { label: 'Dashboard', href: ROUTES.PHLEBOTOMIST.DASHBOARD },
    ],
    workflow: [
      {
        label:    'Blood Drive Workflow',
        group:    true,
        children: [
          { label: 'Register Donor',    href: ROUTES.FIELD.REGISTER   },
          { label: 'Conduct Interview', href: ROUTES.FIELD.INTERVIEW  },
          { label: 'Conduct Screening', href: ROUTES.FIELD.SCREENING  },
          { label: 'Record Donation & Collection', href: ROUTES.FIELD.DONATION },
        ],
      },
    ],
    drive: [
      { label: 'My Assignment', href: ROUTES.PHLEBOTOMIST.DRIVE },
    ],
  },

  [ROLES.REQUESTOR]: {
    general: [
      { label: 'Dashboard',          href: ROUTES.REQUESTOR.DASHBOARD       },
      { label: 'Submit Request',     href: ROUTES.REQUESTOR.SUBMIT_REQUEST  },
      { label: 'My Requests',        href: ROUTES.REQUESTOR.REQUESTS        },
      { label: 'Blood Availability', href: ROUTES.REQUESTOR.AVAILABILITY    },
    ],
  },

};

/**
 * getSidebarItems(roleId, section)
 *
 * Returns the sidebar items for a given role and section.
 * Returns an empty array if the role or section doesn't exist.
 *
 * @param {number} roleId  | user.role_id
 * @param {string} section | e.g. 'general', 'management', 'workflow', 'drive'
 * @returns {Array<{ label: string, href?: string, group?: boolean, children?: Array }>}
 */
export function getSidebarItems(roleId, section) {
  return SIDEBAR_DEFINITIONS[roleId]?.[section] ?? [];
}

/**
 * getSidebarSections(roleId)
 *
 * Returns all section keys available for a given role.
 *
 * @param {number} roleId
 * @returns {string[]}
 */
export function getSidebarSections(roleId) {
  return Object.keys(SIDEBAR_DEFINITIONS[roleId] ?? {});
}