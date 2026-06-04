const donationModel = require('../models/donationModel');
const screeningModel = require('../models/screeningModel');
const donorModel = require('../models/donorModel');
const deferralModel = require('../models/deferralModel');
const interviewAnswerModel = require('../models/interviewAnswerModel');
const { HEMOGLOBIN } = require('../../constants/medicalRules');

const createDonation = async (data, user_id) => {
    const { screening_id, reaction_notes, blood_volume_ml } = data;

    // Step 1 — verify screening exists
    const screening = await screeningModel.getScreeningById(screening_id);
    if (!screening) throw new Error('Screening record not found');

    // Step 2 — verify interview answers were submitted
    const answers = await interviewAnswerModel.getAnswersByScreening(screening_id);
    if (answers.length === 0) {
        throw new Error('Cannot proceed — interview answers not yet submitted for this screening');
    }

    // Step 3 — verify screening result is Eligible
    if (screening.screening_result !== 'Eligible') {
        throw new Error(
            `Cannot create donation — donor screening result is ${screening.screening_result}`
        );
    }

    // Step 4 — get donor for sex-based hemoglobin check
    const donor = await donorModel.getDonorById(screening.donor_id);
    if (!donor) throw new Error('Donor not found');

    // Step 5 — hemoglobin threshold check
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

    // Step 6 — check no active deferral
    const activeDeferral = await deferralModel.checkActiveDeferral(screening.donor_id);
    if (activeDeferral) {
        throw new Error('Donor has an active deferral and cannot donate');
    }

    // Step 7 — auto-fill from screening record
    // Frontend only needs to send screening_id + optional notes/volume
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