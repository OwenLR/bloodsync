/**
 * donationRules.js — Pure blood collection and donation business rules.
 *
 * No framework dependencies. No database access.
 * Takes plain data, returns results or throws Error.
 * Can be tested without Express or PostgreSQL.
 */

const { EXTRACTION } = require('../../constants/medicalRules');

/**
 * Determine if a collection is QNS based on extraction time.
 * Returns an object describing the QNS state — does NOT throw,
 * because QNS is a flag, not a hard stop on record creation.
 *
 * @param {number|null} extraction_time_minutes
 * @returns {{ is_qns: boolean, qns_reason: string|null }}
 */
const evaluateExtractionTime = (extraction_time_minutes) => {
    if (
        extraction_time_minutes !== null &&
        extraction_time_minutes !== undefined &&
        extraction_time_minutes > EXTRACTION.MAX_DURATION_MINUTES
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