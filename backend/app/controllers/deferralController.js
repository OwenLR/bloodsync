const deferralModel = require('../repositories/deferralModel');
const response = require('../../utils/responseHelper');

const getDeferralsByDonor = async (req, res) => {
    try {
        const deferrals = await deferralModel.getDeferralsByDonor(req.params.donor_id);
        return response.success(res, deferrals);
    } catch (error) {
        return response.error(res, error.message);
    }
};

// Deferrals reference interview_id (not screening_id) — architectural fix.
// Route: GET /api/deferrals/interview/:interview_id
const getDeferralsByInterview = async (req, res) => {
    try {
        const deferrals = await deferralModel.getDeferralsByInterview(req.params.interview_id);
        return response.success(res, deferrals);
    } catch (error) {
        return response.error(res, error.message);
    }
};

const checkActiveDeferral = async (req, res) => {
    try {
        const deferral = await deferralModel.checkActiveDeferral(req.params.donor_id);
        return response.success(res, {
            is_deferred: !!deferral,
            data: deferral || null,
        });
    } catch (error) {
        return response.error(res, error.message);
    }
};

module.exports = {
    getDeferralsByDonor,
    getDeferralsByInterview,
    checkActiveDeferral,
};