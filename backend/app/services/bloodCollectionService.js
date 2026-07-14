/**
 * bloodCollectionService.js — Blood collection lifecycle orchestration.
 *
 * Enforces:
 * - Cross-drive ownership: Volunteers/Phlebotomists can only record
 *   collections for donations from their own assigned blood drive
 *
 * markAsSafe auto-creates a blood unit — never create blood units manually.
 * branch_id and drive_id auto-filled from the donation record.
 */

const bloodCollectionModel = require('../repositories/bloodCollectionModel');
const bloodUnitModel       = require('../repositories/bloodUnitModel');
const donationModel        = require('../repositories/donationModel');
const BusinessError        = require('../../utils/businessError');
const { calculateExpiryDate } = require('../../utils/dateHelper');
const { invalidateCache }     = require('../cache/cacheService');
const { evaluateExtractionTime, assertNotQns } = require('../domain/donationRules');
const ROLES = require('../../constants/roles');

const FIELD_ROLES = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

/**
 * Record a new blood collection.
 *
 * @param {object} data      - Collection fields from controller
 * @param {number} user_id   - From JWT (collected_by)
 * @param {object} reqUser   - Full { user_id, role_id, branch_id } from JWT
 * @param {number|null} reqDriveId - Active drive_id from bloodDriveMiddleware
 */
const createCollection = async (data, user_id, reqUser, reqDriveId) => {
    const donation = await donationModel.getDonationById(data.donation_id);
    if (!donation) throw new BusinessError('Donation not found', 404);

    // blood_type is never trusted from the client — it's resolved from the
    // donation's own screening record (blood_type_confirmed, already joined
    // in donationModel.getDonationById). Screening is the one place blood
    // type gets confirmed; re-asking/allowing an edit at collection time
    // duplicated that and risked silently drifting from what screening said.
    if (!donation.blood_type_confirmed) {
        throw new BusinessError(
            'Cannot record a collection — no confirmed blood type found on this donation\'s screening record.',
            400
        );
    }

    // Cross-drive ownership check
    if (FIELD_ROLES.includes(reqUser.role_id)) {
        if (donation.drive_id !== reqDriveId) {
            throw new BusinessError(
                'You can only record collections for donations from your assigned blood drive',
                403
            );
        }
    }

    const bloodComponent = data.component || 'Whole Blood';
    const expiryData = await bloodCollectionModel.getExpiryDays(bloodComponent);
    const expiration_date = expiryData
        ? calculateExpiryDate(expiryData.expiry_days)
        : null;

    // NOTE: contract.md's documented POST /api/blood-collections body has
    // no extraction-time field, and the frontend collection form never
    // sends one — this branch appears unreachable in current usage.
    // Renamed for consistency with evaluateExtractionTime's seconds-based
    // contract (see donationRules.js) rather than left silently stale.
    const extraction_time = data.extraction_time_seconds
        ? parseInt(data.extraction_time_seconds)
        : null;

    const { is_qns: timeExceeded, qns_reason: timeReason } =
        evaluateExtractionTime(extraction_time);

    const is_qns = data.is_qns || timeExceeded;
    const qns_reason = data.is_qns
        ? data.qns_reason
        : timeExceeded
            ? timeReason
            : data.qns_reason || null;

    const collection = await bloodCollectionModel.createCollection({
        ...data,
        collected_by:            user_id,
        expiration_date,
        donor_id:                donation.donor_id,
        branch_id:               donation.branch_id,
        blood_type:              donation.blood_type_confirmed,
        extraction_time_minutes: extraction_time,
        is_qns,
        qns_reason,
        drive_id:                donation.drive_id || null,
    });

    return collection;
};

const markAsSafe = async (collection_id, user_id) => {
    const collection = await bloodCollectionModel.getCollectionById(collection_id);
    if (!collection) throw new BusinessError('Blood collection not found', 404);

    // Domain rule — wrap as BusinessError
    try {
        assertNotQns(collection);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    const updated = await bloodCollectionModel.updateCollectionStatus(
        collection_id, 'Safe', user_id, null
    );

    const blood_unit = await bloodUnitModel.createUnit({
        collection_id:   collection.collection_id,
        donation_id:     collection.donation_id,
        donor_id:        collection.donor_id,
        branch_id:       collection.branch_id,
        blood_type:      collection.blood_type,
        component:       collection.component,
        volume_ml:       collection.volume_ml,
        barcode:         collection.barcode,
        collection_date: collection.collection_date,
        expiration_date: collection.expiration_date,
        processed_by:    user_id,
        drive_id:        collection.drive_id || null,
    });

    await invalidateCache('cache:blood-units:availability');
    await invalidateCache('cache:blood-units:inventory');

    return { updated, blood_unit };
};

const markAsRejected = async (collection_id, reason, user_id) => {
    const collection = await bloodCollectionModel.getCollectionById(collection_id);
    if (!collection) throw new BusinessError('Blood collection not found', 404);

    return bloodCollectionModel.updateCollectionStatus(
        collection_id, 'Rejected', user_id, reason
    );
};

const updateStatus = async (collection_id, status, reason, user_id) => {
    if (status === 'Safe')     return markAsSafe(collection_id, user_id);
    if (status === 'Rejected') return markAsRejected(collection_id, reason, user_id);

    const updated = await bloodCollectionModel.updateCollectionStatus(
        collection_id, status, user_id, reason
    );
    if (!updated) throw new BusinessError('Blood collection not found', 404);
    return updated;
};

module.exports = {
    createCollection,
    markAsSafe,
    markAsRejected,
    updateStatus,
};