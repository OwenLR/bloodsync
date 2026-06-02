const donationModel = require('../models/donationModel');
const screeningModel = require('../models/screeningModel');
const deferralModel = require('../models/deferralModel');

const createDonation = async (data, user_id) => {
    // Check screening exists
    const screening = await screeningModel
        .getScreeningById(data.screening_id);
    if (!screening) {
        throw new Error('Screening record not found');
    }

    // Check screening is Eligible
    if (screening.screening_result !== 'Eligible') {
        throw new Error(
            `Cannot create donation. Donor screening result is ${screening.screening_result}`
        );
    }

    // Check no active deferral
    const activeDeferral = await deferralModel
        .checkActiveDeferral(data.donor_id);
    if (activeDeferral) {
        throw new Error('Donor has an active deferral');
    }

    // Create donation
    const donation = await donationModel.createDonation({
        ...data,
        extracted_by: user_id
    });

    return donation;
};

module.exports = {
    createDonation
};