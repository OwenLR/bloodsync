/**
 * config.js — Frontend constants for BloodSync.
 *
 * Single source of truth for all static values used across the web app.
 * Never hardcode role IDs, status strings, blood types, or the API base URL
 * anywhere else — always import from here.
 *
 * ROLES and STATUSES mirror backend constants exactly.
 * If the backend changes a value, update here to match.
 */

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : ''; // empty string = same origin on Railway

// ---------------------------------------------------------------------------
// Roles — mirrors backend/constants/roles.js
// ---------------------------------------------------------------------------

export const ROLES = {
  ADMIN:         1,
  PRC_STAFF:     2,
  DONOR:         3,
  REQUESTOR:     4,
  VOLUNTEER:     5,
  PHLEBOTOMIST:  6,
};

// ---------------------------------------------------------------------------
// Statuses — mirrors backend/constants/statuses.js
// ---------------------------------------------------------------------------

export const STATUSES = {

  BLOOD_DRIVE: ['Upcoming', 'Ongoing', 'Ended', 'Cancelled'],

  BLOOD_REQUEST: ['Pending', 'Approved', 'Released', 'Rejected'],

  BLOOD_UNIT: ['Available', 'Reserved', 'Released', 'Disposed', 'Withdrawn', 'Expired', 'Separated'],

  COLLECTION: ['Pending', 'Safe', 'Rejected', 'Disposed', 'Withdrawn'],

  PARTICIPANT: ['Assigned', 'Confirmed', 'Declined', 'No Show'],

  RESERVATION: ['Reserved', 'Released', 'Cancelled'],

  DONOR: ['Active', 'Inactive', 'Deferred'],

  USER: ['Active', 'Inactive', 'Pending', 'Declined'],

  URGENCY: ['Routine', 'STAT'],

  VENUE_TYPE: [
    'School',
    'Hospital',
    'Community Center',
    'Church',
    'Government',
    'Other',
  ],

};

// ---------------------------------------------------------------------------
// Blood types — mirrors backend/constants/bloodTypes.js
// ---------------------------------------------------------------------------

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ---------------------------------------------------------------------------
// Notification types — mirrors NOTIFICATION_TYPES in backend/constants/statuses.js
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = {
  BLOOD_REQUEST_NEW:     'blood_request_new',
  BLOOD_REQUEST_STATUS:  'blood_request_status',
  BLOOD_DRIVE_ASSIGNED:  'blood_drive_assigned',
  DONOR_POST_EXTRACTION: 'donor_post_extraction',
  INVENTORY_LOW:         'inventory_low',
  INVENTORY_EXPIRING:    'inventory_expiring',
};

// ---------------------------------------------------------------------------
// Blood components — canonical names used in requests and inventory
// ---------------------------------------------------------------------------

export const COMPONENTS = [
  'Whole Blood',
  'Packed Red Blood Cells',
  'Platelets',
  'Fresh Frozen Plasma',
];