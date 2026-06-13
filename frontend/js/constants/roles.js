/**
 * roles.js — User role ID constants.
 * Mirrors backend/constants/roles.js exactly.
 * If the backend changes a role ID, update here to match.
 */

export const ROLES = Object.freeze({
  ADMIN:        1,
  PRC_STAFF:    2,
  DONOR:        3,
  REQUESTOR:    4,
  VOLUNTEER:    5,
  PHLEBOTOMIST: 6,
});