/**
 * donationRules.js — Pure blood collection and donation business rules.
 *
 * No framework dependencies. No database access.
 * Takes plain data, returns results or throws Error.
 * Can be tested without Express or PostgreSQL.
 */

const { EXTRACTION } = require('../../constants/medicalRules');

// EXTRACTION.MAX_DURATION_MINUTES (15) stays the single source of truth
// for the business rule — this is just the seconds-unit conversion of it,
// since donations now store extraction_time_seconds, not minutes.
const MAX_DURATION_SECONDS = EXTRACTION.MAX_DURATION_MINUTES * 60;

/**
 * Determine if a collection/donation is QNS based on extraction time.
 * Returns an object describing the QNS state — does NOT throw,
 * because QNS is a flag, not a hard stop on record creation.
 *
 * @param {number|null} extraction_time_seconds
 * @returns {{ is_qns: boolean, qns_reason: string|null }}
 */
const evaluateExtractionTime = (extraction_time_seconds) => {
    if (
        extraction_time_seconds !== null &&
        extraction_time_seconds !== undefined &&
        extraction_time_seconds > MAX_DURATION_SECONDS
    ) {
        return {
            is_qns: true,
            qns_reason:
                `Extraction time exceeded maximum allowed duration ` +
                `of ${EXTRACTION.MAX_DURATION_MINUTES} minutes`,
        };
    }

    return { is_qns: false, qns_reason: null };
};

/**
 * Assert that a QNS collection cannot be marked as Safe.
 *
 * @param {{ is_qns: boolean, qns_reason: string }} collection
 * @throws {Error} if collection is QNS
 */
const assertNotQns = (collection) => {
    if (collection.is_qns) {
        throw new Error(
            `Cannot mark as Safe — this collection is flagged as QNS ` +
            `(Quantity Not Sufficient). Reason: ${collection.qns_reason}`
        );
    }
};

module.exports = {
    evaluateExtractionTime,
    assertNotQns,
};