const donationModel = require('../repositories/donationModel');
const screeningModel = require('../repositories/screeningModel');
const donorModel = require('../repositories/donorModel');
const deferralModel = require('../repositories/deferralModel');
const { HEMOGLOBIN } = require('../../constants/medicalRules');

const createDonation = async (data, user_id) => {
    const { screening_id, reaction_notes, blood_volume_ml } = data;

    // Check screening exists
    const screening = await screeningModel.getScreeningById(screening_id);
    if (!screening) throw new Error('Screening record not found');

    // Check screening result is Eligible
    if (screening.screening_result !== 'Eligible') {
        throw new Error(
            screening.screening_result
                ? `Cannot create donation — donor screening result is ${screening.screening_result}`
                : 'Cannot create donation — screening result not yet determined'
        );
    }

    // Get donor for hemoglobin check
    const donor = await donorModel.getDonorById(screening.donor_id);
    if (!donor) throw new Error('Donor not found');

    // Hemoglobin threshold check
    const hemoglobin = parseFloat(screening.hemoglobin);
    const thresholds = donor.sex === 'Male' ? HEMOGLOBIN.MALE : HEMOGLOBIN.FEMALE;

    if (hemoglobin < thresholds.MIN) {
        throw new Error(
            `Donor hemoglobin (${hemoglobin} g/dL) is below the minimum ` +
            `required for ${donor.sex} donors (${thresholds.MIN} g/dL)`
        );
    }

    if (hemoglobin > thresholds.MAX) {
        throw new Error(
            `Donor hemoglobin (${hemoglobin} g/dL) exceeds the maximum ` +
            `allowed limit (${thresholds.MAX} g/dL)`
        );
    }

    // Check no active deferral
    const activeDeferral = await deferralModel.checkActiveDeferral(screening.donor_id);
    if (activeDeferral) {
        throw new Error('Donor has an active deferral and cannot donate');
    }

    // Auto-fill from screening — frontend only sends screening_id
    const donation = await donationModel.createDonation({
        donor_id: screening.donor_id,
        screening_id,
        branch_id: screening.branch_id,
        extracted_by: user_id,
        blood_volume_ml: blood_volume_ml || 450,
        reaction_notes: reaction_notes || null,
        is_qns: false,
    });

    return donation;
};

module.exports = { createDonation };