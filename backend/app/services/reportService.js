const reportModel = require('../repositories/reportModel');
const ROLES = require('../../constants/roles');
const { LOW_STOCK_THRESHOLD } = require('../../constants/inventoryRulesConstant');

const TREND_DAYS = 30;

// Converts every numeric-looking value in a row to a real Number
// (pg returns COUNT()/bigint as strings).
const numify = (row) => Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, (v !== null && !isNaN(v)) ? Number(v) : v])
);

const branchIdFor = (user) => (user.role_id === ROLES.PRC_STAFF ? user.branch_id : null);

// 'YYYY-MM' or 'YYYY-MM-DD' in -> always anchored to day 01 out.
// No month given -> current month. Shared by all four Print Report
// detail/dates functions below.
const normalizeMonth = (month) => {
    if (!month) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return `${month.slice(0, 7)}-01`;
};

/**
 * getInventoryReport(user)
 * PRC Staff, scoped to own branch. Admin, all branches (branchId = null).
 * No Admin frontend page exists for this yet (see sessionState.md), but the
 * service itself is role-correct so it's ready when one is built.
 */
const getInventoryReport = async (user) => {
    const branchId = branchIdFor(user);

    const [
        statusBreakdown,
        stockByType,
        expiryCounts,
        inboundTotals,
        inboundDaily,
        wastageTotals,
        wastageDaily,
    ] = await Promise.all([
        reportModel.getInventoryStatusBreakdown(branchId),
        reportModel.getInventoryStockByType(branchId),
        reportModel.getInventoryExpiryCounts(branchId),
        reportModel.getInventoryInboundTotals(branchId),
        reportModel.getInventoryInboundDailySeries(branchId, TREND_DAYS),
        reportModel.getInventoryWastageTotals(branchId),
        reportModel.getInventoryWastageDailySeries(branchId, TREND_DAYS),
    ]);

    return {
        branch_scoped: branchId !== null,
        status_breakdown: statusBreakdown.map(numify),
        stock_by_type: stockByType.map(r => {
            const row = numify(r);
            return { ...row, low_stock: row.units_available < LOW_STOCK_THRESHOLD };
        }),
        expiry: numify(expiryCounts),
        inbound: {
            ...numify(inboundTotals),
            daily_series: inboundDaily.map(numify),
        },
        wastage: {
            ...numify(wastageTotals),
            daily_series: wastageDaily.map(numify),
        },
    };
};

const getDonorsReport = async (user) => {
    const branchId = branchIdFor(user);
    const [registered, interviews, screenings, donations, dailySeries] = await Promise.all([
        reportModel.getDonorsRegisteredTotals(),
        reportModel.getInterviewTotals(branchId),
        reportModel.getScreeningTotals(branchId),
        reportModel.getDonationTotals(branchId),
        reportModel.getDonationDailySeries(branchId, TREND_DAYS),
    ]);
    return {
        branch_scoped: branchId !== null,
        donors_registered: numify(registered), // global, not branch-filtered, see note in reportModel.js
        interviews_by_result: interviews.map(numify),
        screenings_by_result: screenings.map(numify),
        donations: numify(donations),
        donation_daily_series: dailySeries.map(numify),
    };
};

const getDrivesReport = async (user) => {
    const branchId = branchIdFor(user);
    const [statusBreakdown, createdTotals] = await Promise.all([
        reportModel.getDriveStatusBreakdown(branchId),
        reportModel.getDriveCreatedTotals(branchId),
    ]);
    return {
        branch_scoped: branchId !== null,
        status_breakdown: statusBreakdown.map(numify),
        created: numify(createdTotals),
    };
};

const getTestingReport = async (user) => {
    const branchId = branchIdFor(user);
    const [statusBreakdown, totals] = await Promise.all([
        reportModel.getCollectionStatusBreakdown(branchId),
        reportModel.getCollectionTotals(branchId),
    ]);
    return {
        branch_scoped: branchId !== null,
        status_breakdown: statusBreakdown.map(numify),
        totals: numify(totals),
    };
};

const getRequestsReport = async (user) => {
    const branchId = branchIdFor(user);
    const [statusBreakdown, urgencyBreakdown, totals] = await Promise.all([
        reportModel.getRequestStatusBreakdown(branchId),
        reportModel.getRequestUrgencyBreakdown(branchId),
        reportModel.getRequestTotals(branchId),
    ]);
    return {
        branch_scoped: branchId !== null,
        status_breakdown: statusBreakdown.map(numify),
        urgency_breakdown_active: urgencyBreakdown.map(numify),
        totals: numify(totals),
    };
};

const getUsersReport = async () => {
    const [statusBreakdown, roleBreakdown, registeredTotals, staffByBranch] = await Promise.all([
        reportModel.getUserStatusBreakdown(),
        reportModel.getUserRoleBreakdown(),
        reportModel.getUserRegisteredTotals(),
        reportModel.getActiveStaffByBranch(),
    ]);
    return {
        status_breakdown: statusBreakdown.map(numify),      // Active/Inactive/Pending/Declined
        role_breakdown: roleBreakdown.map(numify),           // per-role headcount
        registered: numify(registeredTotals),
        pending_approvals: statusBreakdown.find(r => r.status === 'Pending')
            ? Number(statusBreakdown.find(r => r.status === 'Pending').count) : 0,
        active_staff_by_branch: staffByBranch.map(numify),
    };
};

/**
 * getMyImpactReport(user)
 * Volunteer / Phlebotomist only. Personal lifetime counts, not branch or
 * drive scoped, same reasoning as getDonorsReport()'s global
 * donors_registered figure. Both roles can perform any step of the donor
 * workflow (see rules.md), so all three counts are returned regardless of
 * which specific role is asking, rather than trying to guess which counts
 * matter per role.
 */
const getMyImpactReport = async (user) => {
    const [interviews, screenings, unitsExtracted] = await Promise.all([
        reportModel.getInterviewsConductedByUser(user.user_id),
        reportModel.getScreeningsPerformedByUser(user.user_id),
        reportModel.getUnitsExtractedByUser(user.user_id),
    ]);
    return {
        interviews_conducted: Number(interviews.count),
        screenings_performed: Number(screenings.count),
        units_extracted: Number(unitsExtracted.count),
    };
};

// ============================================================
// Print Reports — Detail Lists ('in' = Blood Units, 'out' = Blood Requests)
// ============================================================

const getInventoryDetailReport = async (user, month, date) => {
    const branchId   = branchIdFor(user);
    const monthStart = normalizeMonth(month);
    const units       = await reportModel.getInventoryDetailList(branchId, monthStart, date || null);
    return {
        branch_scoped: branchId !== null,
        scope: { month: monthStart.slice(0, 7), date: date || null },
        units: units.map(numify),
    };
};

const getInventoryAvailableDates = async (user, month) => {
    const branchId   = branchIdFor(user);
    const monthStart = normalizeMonth(month);
    const dates       = await reportModel.getInventoryDatesWithData(branchId, monthStart);
    return {
        month: monthStart.slice(0, 7),
        dates: dates.map(d => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
    };
};

const getRequestsDetailReport = async (user, month, date) => {
    const branchId   = branchIdFor(user);
    const monthStart = normalizeMonth(month);

    const requests   = await reportModel.getRequestsDetailList(branchId, monthStart, date || null);
    const requestIds = requests.map(r => r.request_id);
    const items       = await reportModel.getItemsByRequestIds(requestIds);

    const itemsByRequest = {};
    items.forEach(item => {
        const key = item.request_id;
        if (!itemsByRequest[key]) itemsByRequest[key] = [];
        itemsByRequest[key].push(numify(item));
    });

    return {
        branch_scoped: branchId !== null,
        scope: { month: monthStart.slice(0, 7), date: date || null },
        requests: requests.map(r => ({ ...numify(r), items: itemsByRequest[r.request_id] || [] })),
    };
};

const getRequestsAvailableDates = async (user, month) => {
    const branchId   = branchIdFor(user);
    const monthStart = normalizeMonth(month);
    const dates       = await reportModel.getRequestDatesWithData(branchId, monthStart);
    return {
        month: monthStart.slice(0, 7),
        dates: dates.map(d => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
    };
};

module.exports = {
    getInventoryReport,
    getDonorsReport,
    getDrivesReport,
    getTestingReport,
    getRequestsReport,
    getUsersReport,
    getMyImpactReport,
    getInventoryDetailReport,
    getInventoryAvailableDates,
    getRequestsDetailReport,
    getRequestsAvailableDates,
};