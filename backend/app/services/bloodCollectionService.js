const bloodCollectionModel = require('../models/bloodCollectionModel');
const bloodUnitModel = require('../models/bloodUnitModel');
const donationModel = require('../models/donationModel');
const { calculateExpiryDate } = require('../../utils/dateHelper');
const { invalidateCache } = require('../../middleware/cacheMiddleware');
const { EXTRACTION } = require('../../constants/medicalRules');

const createCollection = async (data, user_id) => {
    const donation = await donationModel.getDonationById(data.donation_id);
    if (!donation) throw new Error('Donation not found');

    const bloodComponent = data.component || 'Whole Blood';
    const expiryData = await bloodCollectionModel.getExpiryDays(bloodComponent);
    const expiration_date = expiryData
        ? calculateExpiryDate(expiryData.expiry_days)
        : null;

    // Extraction time check — flag as QNS if exceeded
    const extraction_time = data.extraction_time_minutes
        ? parseInt(data.extraction_time_minutes)
        : null;

    const isQnsFromTime = extraction_time !== null
        && extraction_time > EXTRACTION.MAX_DURATION_MINUTES;

    const collection = await bloodCollectionModel.createCollection({
        ...data,
        collected_by: user_id,
        expiration_date,
        donor_id: donation.donor_id,
        extraction_time_minutes: extraction_time,
        // If already marked QNS by caller, keep it; otherwise check time
        is_qns: data.is_qns || isQnsFromTime,
        qns_reason: data.is_qns
            ? data.qns_reason
            : isQnsFromTime
                ? `Extraction time exceeded maximum allowed duration of ${EXTRACTION.MAX_DURATION_MINUTES} minutes`
                : data.qns_reason || null,
    });

    return collection;
};

const markAsSafe = async (collection_id, user_id) => {
    const collection = await bloodCollectionModel.getCollectionById(collection_id);
    if (!collection) throw new Error('Blood collection not found');

    // QNS collections cannot be marked as Safe
    if (collection.is_qns) {
        throw new Error(
            'Cannot mark as Safe — this collection is flagged as QNS (Quantity Not Sufficient). ' +
            `Reason: ${collection.qns_reason}`
        );
    }

    const updated = await bloodCollectionModel.updateCollectionStatus(
        collection_id, 'Safe', user_id, null
    );

    const blood_unit = await bloodUnitModel.createUnit({
        collection_id: collection.collection_id,
        donation_id: collection.donation_id,
        donor_id: collection.donor_id,
        branch_id: collection.branch_id,
        blood_type: collection.blood_type,
        component: collection.component,
        volume_ml: collection.volume_ml,
        barcode: collection.barcode,
        collection_date: collection.collection_date,
        expiration_date: collection.expiration_date,
        processed_by: user_id
    });

    await invalidateCache('cache:blood-units:availability');

    return { updated, blood_unit };
};

const markAsRejected = async (collection_id, reason, user_id) => {
    const collection = await bloodCollectionModel.getCollectionById(collection_id);
    if (!collection) throw new Error('Blood collection not found');

    const updated = await bloodCollectionModel.updateCollectionStatus(
        collection_id, 'Rejected', user_id, reason
    );

    return updated;
};

module.exports = {
    createCollection,
    markAsSafe,
    markAsRejected
};