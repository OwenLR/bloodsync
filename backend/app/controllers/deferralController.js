const deferralModel = require('../models/deferralModel');

const getDeferralsByDonor = async (req, res) => {
    try {
        const deferrals = await deferralModel
            .getDeferralsByDonor(req.params.donor_id);
        res.status(200).json({
            status: 'success',
            count: deferrals.length,
            data: deferrals
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getDeferralsByScreening = async (req, res) => {
    try {
        const deferrals = await deferralModel
            .getDeferralsByScreening(req.params.screening_id);
        res.status(200).json({
            status: 'success',
            count: deferrals.length,
            data: deferrals
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const checkActiveDeferral = async (req, res) => {
    try {
        const deferral = await deferralModel
            .checkActiveDeferral(req.params.donor_id);
        res.status(200).json({
            status: 'success',
            is_deferred: !!deferral,
            data: deferral || null
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getDeferralsByDonor,
    getDeferralsByScreening,
    checkActiveDeferral
};