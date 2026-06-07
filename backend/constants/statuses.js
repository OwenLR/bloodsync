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
];

const SCREENING_RESULTS   = ['Eligible', 'Deferred'];
const HEMOGLOBIN_STATUSES = ['Allowed', 'Not Allowed'];
const DONOR_STATUSES      = ['Active', 'Inactive', 'Deferred'];
const REQUEST_STATUSES    = ['Pending', 'Approved', 'Released', 'Rejected'];
const RESERVATION_STATUSES = ['Reserved', 'Released', 'Cancelled'];
const URGENCY_LEVELS      = ['Routine', 'STAT'];
const CHANGED_BY_TYPES    = ['staff', 'requestor'];
const USER_STATUSES       = ['Active', 'Inactive', 'Pending', 'Declined'];

// Blood drive statuses
// Upcoming  → drive is scheduled but has not started yet
// Ongoing   → drive is currently within its start/end window
// Ended     → drive window has passed (terminal — no updates allowed)
// Cancelled → manually cancelled by Admin or Staff (terminal — no updates allowed)
const BLOOD_DRIVE_STATUSES = ['Upcoming', 'Ongoing', 'Ended', 'Cancelled'];

// Valid venue types for blood drives
const VENUE_TYPES = [
    'School',
    'Hospital',
    'Community Center',
    'Church',
    'Government',
    'Other',
];

// Participant assignment statuses
const PARTICIPANT_STATUSES = ['Assigned', 'Confirmed', 'Declined', 'No Show'];

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
};