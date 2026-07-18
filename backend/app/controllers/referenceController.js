/**
 * referenceController.js — Small standalone public reference-data lookups
 * that don't belong under any single domain's own controller. Currently
 * just the ZIP/postal code lookup used by the registration form.
 *
 * Path: backend/app/controllers/referenceController.js
 */

const response           = require('../../utils/responseHelper');
const postalCodeService  = require('../services/postalCodeService');

const lookupZip = async (req, res) => {
    try {
        const { province, municipality } = req.query;

        if (!municipality || !municipality.trim()) {
            return response.badRequest(res, 'municipality is required');
        }

        const result = postalCodeService.lookupZip({ province, municipality });

        // No match is not an error — 200 with null data, so the frontend
        // can silently leave the ZIP field blank for manual entry, same
        // "never blocks the flow" pattern already used for geocoding.
        if (!result) {
            return response.success(res, null, 'No ZIP code match found');
        }

        return response.success(res, result);
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = { lookupZip };