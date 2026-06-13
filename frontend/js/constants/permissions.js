/**
 * permissions.js — Feature-level permission definitions.
 *
 * Maps each action to the roles allowed to perform it.
 * Use these to conditionally show/hide UI elements (buttons, tabs, sections).
 *
 * Usage:
 *   import { PERMISSIONS } from '../constants/permissions.js';
 *   import { ROLES }       from '../constants/roles.js';
 *
 *   if (PERMISSIONS.APPROVE_REQUEST.includes(user.role_id)) {
 *     showApproveButton();
 *   }
 *
 * Never use role IDs directly in feature files — always reference PERMISSIONS.
 */

import { ROLES } from './roles.js';

export const PERMISSIONS = Object.freeze({

  // --- Donors ---
  CREATE_DONOR:       [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST],
  VIEW_DONORS:        [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST],
  UPDATE_DONOR:       [ROLES.ADMIN, ROLES.PRC_STAFF],

  // --- Donor workflow ---
  CONDUCT_INTERVIEW:  [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER],
  CONDUCT_SCREENING:  [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.PHLEBOTOMIST],
  RECORD_DONATION:    [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.PHLEBOTOMIST],
  RECORD_COLLECTION:  [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.PHLEBOTOMIST],

  // --- Blood drives ---
  CREATE_BLOOD_DRIVE: [ROLES.ADMIN, ROLES.PRC_STAFF],
  UPDATE_BLOOD_DRIVE: [ROLES.ADMIN, ROLES.PRC_STAFF],
  CANCEL_BLOOD_DRIVE: [ROLES.ADMIN, ROLES.PRC_STAFF],
  VIEW_BLOOD_DRIVES:  [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST],

  // --- Blood units ---
  VIEW_BLOOD_UNITS:   [ROLES.ADMIN, ROLES.PRC_STAFF],
  UPDATE_UNIT_STATUS: [ROLES.ADMIN, ROLES.PRC_STAFF],
  SEPARATE_UNIT:      [ROLES.ADMIN, ROLES.PRC_STAFF],

  // --- Blood requests ---
  SUBMIT_REQUEST:     [ROLES.REQUESTOR],
  CANCEL_REQUEST:     [ROLES.REQUESTOR],
  VIEW_ALL_REQUESTS:  [ROLES.ADMIN, ROLES.PRC_STAFF],
  APPROVE_REQUEST:    [ROLES.ADMIN, ROLES.PRC_STAFF],
  REJECT_REQUEST:     [ROLES.ADMIN, ROLES.PRC_STAFF],
  RELEASE_REQUEST:    [ROLES.ADMIN, ROLES.PRC_STAFF],

  // --- Users ---
  MANAGE_USERS:       [ROLES.ADMIN],
  APPROVE_USER:       [ROLES.ADMIN],

  // --- Reports ---
  VIEW_REPORTS:       [ROLES.ADMIN, ROLES.PRC_STAFF],

  // --- Notifications ---
  VIEW_NOTIFICATIONS: [ROLES.ADMIN, ROLES.PRC_STAFF, ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.REQUESTOR],

});