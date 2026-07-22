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
 *   Group item:  { label: string, group: true, children: [{ label, href }], openByDefault?: boolean }
 *
 * Group items render as a collapsible <details>/<summary> block in sidebar.js.
 * openByDefault defaults to true if omitted (existing behavior, unchanged for
 * field-role workflow groups | those roles navigate between steps constantly
 * during a drive, so staying open saves clicks). Set openByDefault: false for
 * groups that aren't a constant-navigation context, e.g. Staff's Donors group
 * below. A group with an active child page is always rendered open regardless
 * of openByDefault, so the current page is never hidden behind a collapsed
 * summary.
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
 * Admin vs Staff Donors item:
 *   Admin and PRC Staff are not required to be assigned to a blood drive |
 *   they can register donors and run the full donor workflow as walk-ins
 *   (drive_id = NULL for these operations, which is correct, not a bug).
 *   Staff's Donors item is a collapsible group containing the donor list
 *   page plus all five field workflow steps, using the SAME routes as
 *   Volunteer/Phlebotomist (ROUTES.FIELD.*) | the pages are shared, only
 *   the sidebar entry point differs by role. Defaults closed
 *   (openByDefault: false) since it's not a constant-navigation context
 *   the way a Vol/Phleb's active-drive workflow is.
 *   Admin's Donors item is a plain flat link (Donor List only, no field
 *   workflow access | Admin is permanently excluded from field workflow
 *   pages, see rules.md) — no collapsible wrapper needed for a single link.
 */

import { ROLES }  from './roles.js';
import { ROUTES } from './routes.js';

const SIDEBAR_DEFINITIONS = {

  [ROLES.ADMIN]: {
    general: [
      { label: 'Dashboard', href: ROUTES.ADMIN.DASHBOARD },
      { label: 'Donors',    href: ROUTES.ADMIN.DONORS    },
      { label: 'Blood Drives',   href: ROUTES.ADMIN.BLOOD_DRIVES   },
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
        label:       'Donors',
        group:       true,
        openByDefault: false,
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