/**
 * statusConstants.js — Status string constants for all domain objects.
 * Mirrors backend/constants/statuses.js exactly.
 *
 * Always reference by name (BLOOD_REQUEST_STATUS.APPROVED)
 * never by array position — object form prevents positional bugs.
 *
 * If the backend changes a status string, update here to match.
 */

export const BLOOD_DRIVE_STATUS = Object.freeze({
  UPCOMING:  'Upcoming',
  ONGOING:   'Ongoing',
  ENDED:     'Ended',
  CANCELLED: 'Cancelled',
});

export const BLOOD_REQUEST_STATUS = Object.freeze({
  PENDING:  'Pending',
  APPROVED: 'Approved',
  RELEASED: 'Released',
  REJECTED: 'Rejected',
});

export const BLOOD_UNIT_STATUS = Object.freeze({
  AVAILABLE:  'Available',
  RESERVED:   'Reserved',
  RELEASED:   'Released',
  DISPOSED:   'Disposed',
  WITHDRAWN:  'Withdrawn',
  EXPIRED:    'Expired',
  SEPARATED:  'Separated',
});

export const COLLECTION_STATUS = Object.freeze({
  PENDING:   'Pending',
  SAFE:      'Safe',
  REJECTED:  'Rejected',
  DISPOSED:  'Disposed',
  WITHDRAWN: 'Withdrawn',
});

export const PARTICIPANT_STATUS = Object.freeze({
  ASSIGNED:  'Assigned',
  CONFIRMED: 'Confirmed',
  DECLINED:  'Declined',
  NO_SHOW:   'No Show',
});

export const RESERVATION_STATUS = Object.freeze({
  RESERVED:  'Reserved',
  RELEASED:  'Released',
  CANCELLED: 'Cancelled',
});

export const DONOR_STATUS = Object.freeze({
  ACTIVE:   'Active',
  INACTIVE: 'Inactive',
  DEFERRED: 'Deferred',
});

export const USER_STATUS = Object.freeze({
  ACTIVE:   'Active',
  INACTIVE: 'Inactive',
  PENDING:  'Pending',
  DECLINED: 'Declined',
});

export const URGENCY_LEVEL = Object.freeze({
  ROUTINE: 'Routine',
  STAT:    'STAT',
});

export const VENUE_TYPE = Object.freeze({
  SCHOOL:            'School',
  HOSPITAL:          'Hospital',
  COMMUNITY_CENTER:  'Community Center',
  CHURCH:            'Church',
  GOVERNMENT:        'Government',
  OTHER:             'Other',
});