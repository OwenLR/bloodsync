/**
 * bloodRequestConstant.js — Business rule constants for blood requests.
 *
 * These are policy values, not technical limits.
 * Update here when PRC changes their policy — no other files need to change.
 */

// Maximum total units across all items in a single request
const MAX_UNITS_PER_REQUEST = 10;

// Maximum units per single line item (per blood type + component combination)
const MAX_UNITS_PER_ITEM = 10;

// Queue depth thresholds for dynamic waiting time estimates
const WAIT_TIME_ESTIMATES = [
    { maxQueue: 2,        label: 'Usually under 15 minutes' },
    { maxQueue: 5,        label: 'Usually 15–30 minutes'    },
    { maxQueue: 10,       label: 'Usually 30–60 minutes'    },
    { maxQueue: Infinity, label: 'Usually over 1 hour'      },
];

// PRC operating hours (PHT) for after-hours messaging
const OPERATING_HOURS = {
    start: 8,  // 8:00 AM
    end:   17, // 5:00 PM
};

module.exports = {
    MAX_UNITS_PER_REQUEST,
    MAX_UNITS_PER_ITEM,
    WAIT_TIME_ESTIMATES,
    OPERATING_HOURS,
};