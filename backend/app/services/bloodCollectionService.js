const bloodCollectionModel = require('../models/bloodCollectionModel');
const bloodUnitModel = require('../models/bloodUnitModel');
const donationModel = require('../models/donationModel');
const { calculateExpiryDate } = require('../../utils/dateHelper');
const { invalidateCache } = require('../../middleware/cacheMiddleware');

const createCollection = async (data, user_id) => {
    const donation = await donationModel.getDonationById(data.donation_id);
    if (!donation) throw new Error('Donation not found');

    const bloodComponent = data.component || 'Whole Blood';
    const expiryData = await bloodCollectionModel.getExpiryDays(bloodComponent);
    const expiration_date = expiryData
        ? calculateExpiryDate(expiryData.expiry_days)
        : null;

    const collection = await bloodCollectionModel.createCollection({
        ...data,
        collected_by: user_id,
        expiration_date,
        donor_id: donation.donor_id
    });

    return collection;
};

const markAsSafe = async (collection_id, user_id) => {
    const collection = await bloodCollectionModel.getCollectionById(collection_id);
    if (!collection) throw new Error('Blood collection not found');

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

    // Invalidate availability cache — new unit is now in inventory
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