/**
 * donorEligibility.js — Pure donor eligibility business rules.
 *
 * No framework dependencies. No database access.
 * Takes plain data, returns results or throws Error.
 * Can be tested without Express or PostgreSQL.
 */

const { HEMOGLOBIN } = require('../../constants/medicalRules');

/**
 * Check if a donor's hemoglobin level is within acceptable range.
 * Thresholds differ by sex per PRC blood bank medical standards.
 *
 * @param {number} hemoglobin - Hemoglobin level in g/dL
 * @param {string} sex        - 'Male' or 'Female'
 * @throws {Error} if hemoglobin is outside the acceptable range
 */
const checkHemoglobinEligibility = (hemoglobin, sex) => {
    const hb = parseFloat(hemoglobin);
    const thresholds = sex === 'Male' ? HEMOGLOBIN.MALE : HEMOGLOBIN.FEMALE;

    if (hb < thresholds.MIN) {
        throw new Error(
            `Donor hemoglobin (${hb} g/dL) is below the minimum ` +
            `required for ${sex} donors (${thresholds.MIN} g/dL)`
        );
    }

    if (hb > thresholds.MAX) {
        throw new Error(
            `Donor hemoglobin (${hb} g/dL) exceeds the maximum ` +
            `allowed limit (${thresholds.MAX} g/dL)`
        );
    }
};

module.exports = {
    checkHemoglobinEligibility,
};