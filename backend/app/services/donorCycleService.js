const donorInterviewModel = require('../repositories/donorInterviewModel');
const screeningModel      = require('../repositories/screeningModel');
const donationModel       = require('../repositories/donationModel');
const { computeCycleStatus } = require('../domain/donorCycleRules');
const bloodCollectionModel = require('../repositories/bloodCollectionModel');

/**
 * Walk-in (Staff, non-drive) cycle status for a donor. Walks the chain:
 * most recent walk-in interview -> its screening (if any) -> its
 * donation (if any). Never considers drive-scoped interviews.
 */
const getWalkInCycleStatus = async (donor_id) => {
    const interview = await donorInterviewModel.getInterviewByDonorAndDrive(donor_id, null);
    if (!interview) return { state: 'available' };

    let screening  = null;
    let donation   = null;
    let collection = null;

    if (interview.interview_result !== null && interview.interview_result !== undefined) {
        screening = await screeningModel.getScreeningByInterviewId(interview.interview_id);

        if (screening && screening.screening_result === 'Eligible') {
            donation = await donationModel.getDonationByScreeningId(screening.screening_id);

            if (donation && !donation.is_qns) {
                collection = await bloodCollectionModel.getCollectionByDonationId(donation.donation_id);
            }
        }
    }

    return computeCycleStatus({ interview, screening, donation, collection });
};

module.exports = { getWalkInCycleStatus };