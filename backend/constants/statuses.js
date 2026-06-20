const COLLECTION_STATUSES = [
    'Pending',
    'Safe',
    'Rejected',
    'Disposed',
    'Withdrawn',
];

const UNIT_STATUSES = [
    'Available',
    'Reserved',
    'Released',
    'Disposed',
    'Withdrawn',
    'Expired',
    'Separated',
];

const SCREENING_RESULTS   = ['Eligible', 'Deferred'];
const HEMOGLOBIN_STATUSES = ['Allowed', 'Not Allowed'];
const DONOR_STATUSES      = ['Active', 'Inactive', 'Deferred'];
const REQUEST_STATUSES    = ['Pending', 'Approved', 'Waiting', 'Released', 'Rejected'];
const RESERVATION_STATUSES = ['Reserved', 'Released', 'Cancelled'];
const URGENCY_LEVELS      = ['Routine', 'STAT'];
const CHANGED_BY_TYPES    = ['staff', 'requestor'];
const USER_STATUSES       = ['Active', 'Inactive', 'Pending', 'Declined'];

const BLOOD_DRIVE_STATUSES = ['Upcoming', 'Ongoing', 'Ended', 'Cancelled'];

const VENUE_TYPES = [
    'School',
    'Hospital',
    'Community Center',
    'Church',
    'Government',
    'Other',
];

const PARTICIPANT_STATUSES = ['Assigned', 'Confirmed', 'Declined', 'No Show'];

/**
 * Notification type constants — used in notifications.type column.
 * Always use these constants instead of hardcoded strings.
 */
const NOTIFICATION_TYPES = {
    BLOOD_REQUEST_NEW:     'blood_request_new',
    BLOOD_REQUEST_STATUS:  'blood_request_status',
    BLOOD_DRIVE_ASSIGNED:  'blood_drive_assigned',
    DONOR_POST_EXTRACTION: 'donor_post_extraction',
    INVENTORY_LOW:         'inventory_low',
    INVENTORY_EXPIRING:    'inventory_expiring',
};

module.exports = {
    COLLECTION_STATUSES,
    UNIT_STATUSES,
    SCREENING_RESULTS,
    HEMOGLOBIN_STATUSES,
    DONOR_STATUSES,
    REQUEST_STATUSES,
    RESERVATION_STATUSES,
    URGENCY_LEVELS,
    CHANGED_BY_TYPES,
    USER_STATUSES,
    BLOOD_DRIVE_STATUSES,
    VENUE_TYPES,
    PARTICIPANT_STATUSES,
    NOTIFICATION_TYPES,
};