const screeningModel = require('../models/screeningModel');
const donorModel = require('../models/donorModel');
const interviewAnswerModel = require('../models/interviewAnswerModel');

const createScreening = async (data, user_id) => {
    // Check donor exists
    const donor = await donorModel.getDonorById(data.donor_id);
    if (!donor) throw new Error('Donor not found');

    // Check interview answers submitted for this screening
    // Screening record must exist first — but answers are submitted
    // against a screening_id, so screening is created before answers.
    // What we enforce here: screening result cannot be set to Eligible
    // unless answers have been submitted.
    // Note: screening is created first, then answers submitted,
    // then screening result is updated via updateScreening.
    // So createScreening just creates the record — result starts null.

    const screening = await screeningModel.createScreening({
        ...data,
        screened_by: user_id
    });

    return screening;
};

const updateScreening = async (id, data) => {
    const screening = await screeningModel.getScreeningById(id);
    if (!screening) throw new Error('Screening not found');

    // If trying to set result to Eligible, verify answers were submitted
    if (data.screening_result === 'Eligible') {
        const answers = await interviewAnswerModel.getAnswersByScreening(id);
        if (answers.length === 0) {
            throw new Error(
                'Cannot mark screening as Eligible — interview answers not yet submitted'
            );
        }
    }

    const updated = await screeningModel.updateScreening(id, data);
    return updated;
};

module.exports = {
    createScreening,
    updateScreening
};