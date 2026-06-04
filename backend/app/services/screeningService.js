const screeningModel = require('../repositories/screeningModel');
const donorModel = require('../repositories/donorModel');
const donorInterviewModel = require('../repositories/donorInterviewModel');

const createScreening = async (data, user_id) => {
    const { interview_id } = data;

    // Check interview exists
    const interview = await donorInterviewModel.getInterviewById(interview_id);
    if (!interview) throw new Error('Interview session not found');

    // Interview must have Passed before screening can be created
    if (interview.interview_result !== 'Passed') {
        throw new Error(
            interview.interview_result === 'Failed'
                ? 'Cannot create screening — donor did not pass the interview'
                : 'Cannot create screening — interview answers not yet submitted'
        );
    }

    // Check no existing screening for this interview
    const existing = await screeningModel.getScreeningByInterviewId(interview_id);
    if (existing) {
        throw new Error('Screening already exists for this interview session');
    }

    // Auto-fill donor_id and branch_id from interview record
    const screening = await screeningModel.createScreening({
        ...data,
        donor_id: interview.donor_id,
        branch_id: interview.branch_id,
        screened_by: user_id,
    });

    return screening;
};

const updateScreening = async (id, data) => {
    const screening = await screeningModel.getScreeningById(id);
    if (!screening) throw new Error('Screening not found');

    const updated = await screeningModel.updateScreening(id, data);
    return updated;
};

module.exports = {
    createScreening,
    updateScreening,
};