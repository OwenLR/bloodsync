const screeningModel = require('../models/screeningModel');
const donorModel = require('../models/donorModel');

const createScreening = async (data, user_id) => {
    // Check donor exists
    const donor = await donorModel.getDonorById(data.donor_id);
    if (!donor) {
        throw new Error('Donor not found');
    }

    // Create screening
    const screening = await screeningModel.createScreening({
        ...data,
        screened_by: user_id
    });

    return screening;
};

const updateScreening = async (id, data) => {
    const screening = await screeningModel
        .getScreeningById(id);
    if (!screening) {
        throw new Error('Screening not found');
    }

    const updated = await screeningModel
        .updateScreening(id, data);

    return updated;
};

module.exports = {
    createScreening,
    updateScreening
};