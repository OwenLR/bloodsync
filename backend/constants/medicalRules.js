/**
 * Medical rules for blood donation eligibility.
 * These are clinical thresholds — do not change without
 * consulting PRC blood bank standards.
 */

const HEMOGLOBIN = {
    MALE: {
        MIN: 13.0,  // g/dL
        MAX: 20.0,  // g/dL
    },
    FEMALE: {
        MIN: 12.5,  // g/dL
        MAX: 20.0,  // g/dL
    },
};

const EXTRACTION = {
    MAX_DURATION_MINUTES: 15,
};

module.exports = {
    HEMOGLOBIN,
    EXTRACTION,
};