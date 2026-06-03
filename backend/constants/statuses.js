const COLLECTION_STATUSES = [
  "Pending",
  "Safe",
  "Rejected",
  "Disposed",
  "Withdrawn",
];

const UNIT_STATUSES = [
  "Available",
  "Reserved",
  "Released",
  "Disposed",
  "Withdrawn",
  "Expired",
];

const SCREENING_RESULTS = ["Eligible", "Deferred"];

const HEMOGLOBIN_STATUSES = ["Allowed", "Not Allowed"];

const DONOR_STATUSES = ["Active", "Inactive", "Deferred"];

const REQUEST_STATUSES = ["Pending", "Approved", "Released", "Rejected"];
const RESERVATION_STATUSES = ["Reserved", "Released", "Cancelled"];
const URGENCY_LEVELS = ["Routine", "STAT"];
const CHANGED_BY_TYPES = ["staff", "requestor"];

const USER_STATUSES = ['Active', 'Inactive', 'Pending', 'Declined'];

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
  USER_STATUSES
};
