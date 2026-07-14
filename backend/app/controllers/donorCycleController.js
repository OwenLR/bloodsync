const donorCycleService = require('../services/donorCycleService');
const response          = require('../../utils/responseHelper');

const getWalkInCycleStatus = async (req, res) => {
    try {
        const status = await donorCycleService.getWalkInCycleStatus(req.params.donor_id);
        return response.success(res, status);
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = { getWalkInCycleStatus };