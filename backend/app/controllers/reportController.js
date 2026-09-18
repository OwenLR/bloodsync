const reportService = require('../services/reportService');
const response = require('../../utils/responseHelper');

const getInventoryReport = async (req, res) => {
    try {
        const report = await reportService.getInventoryReport(req.user);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getDonorsReport = async (req, res) => {
    try {
        const report = await reportService.getDonorsReport(req.user);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getDrivesReport = async (req, res) => {
    try {
        const report = await reportService.getDrivesReport(req.user);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getTestingReport = async (req, res) => {
    try {
        const report = await reportService.getTestingReport(req.user);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getRequestsReport = async (req, res) => {
    try {
        const report = await reportService.getRequestsReport(req.user);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getUsersReport = async (req, res) => {
    try {
        const report = await reportService.getUsersReport();
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getMyImpactReport = async (req, res) => {
    try {
        const report = await reportService.getMyImpactReport(req.user);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getRequestsDetailReport = async (req, res) => {
    try {
        const { month, date } = req.query;
        const report = await reportService.getRequestsDetailReport(req.user, month, date);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getRequestsAvailableDates = async (req, res) => {
    try {
        const { month } = req.query;
        const dates = await reportService.getRequestsAvailableDates(req.user, month);
        return response.success(res, dates);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getInventoryDetailReport = async (req, res) => {
    try {
        const { month, date } = req.query;
        const report = await reportService.getInventoryDetailReport(req.user, month, date);
        return response.success(res, report);
    } catch (error) {
        return response.handleError(res, error);
    }
};

const getInventoryAvailableDates = async (req, res) => {
    try {
        const { month } = req.query;
        const dates = await reportService.getInventoryAvailableDates(req.user, month);
        return response.success(res, dates);
    } catch (error) {
        return response.handleError(res, error);
    }
};

module.exports = {
    getInventoryReport,
    getDonorsReport,
    getDrivesReport,
    getTestingReport,
    getRequestsReport,
    getUsersReport,
    getMyImpactReport,
    getRequestsDetailReport,
    getRequestsAvailableDates,
    getInventoryDetailReport,
    getInventoryAvailableDates,
};