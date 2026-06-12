/**
 * fulfillmentService.js — Blood request fulfillment planning.
 *
 * Read-only service — no mutations, no notifications, no cache writes.
 * Handles multi-branch planning, distance sorting, and waiting time estimates.
 *
 * Imported by bloodRequestService for use during request creation and approval.
 * Can also be called directly from the controller for pre-submission planning.
 */

const bloodUnitModel  = require('../repositories/bloodUnitModel');
const bloodRequestModel = require('../repositories/bloodRequestModel');
const BusinessError   = require('../../utils/businessError');
const { validateItems } = require('../../validators/bloodRequestValidator');
const {
    WAIT_TIME_ESTIMATES,
    OPERATING_HOURS,
} = require('../../constants/bloodRequestConstant');

// ─── Distance helper ──────────────────────────────────────────────────────────

/**
 * Haversine formula — returns distance in km between two coordinates.
 */
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R    = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Waiting time estimate ────────────────────────────────────────────────────

/**
 * Dynamic waiting time estimate based on pending queue depth.
 * Returns a human-readable label and whether PRC is currently open.
 */
const getWaitingTimeEstimate = async (branchId) => {
    const pendingCount = await bloodRequestModel.getPendingCountByBranch(branchId);

    const nowPHT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const hour   = nowPHT.getHours();
    const isOpen = hour >= OPERATING_HOURS.start && hour < OPERATING_HOURS.end;

    const estimate = WAIT_TIME_ESTIMATES.find((e) => pendingCount <= e.maxQueue);
    const label    = estimate ? estimate.label : 'Usually over 1 hour';

    return {
        pending_count: pendingCount,
        estimate:      isOpen ? label : 'Currently outside operating hours',
        next_open:     isOpen ? null  : `Opens at ${OPERATING_HOURS.start}:00 AM PHT`,
        is_open:       isOpen,
    };
};

// ─── Multi-branch fulfillment plan ────────────────────────────────────────────

/**
 * Build a fulfillment plan for a single request item across branches.
 * Sorts branches by distance from requestor if coordinates provided.
 *
 * Returns:
 * - canSingleBranch: boolean
 * - singleBranchOption: nearest branch that has enough (or null)
 * - splitOption: array of { branch_id, branch_name, units_to_take, distance_km }
 * - totalAvailable: total units available across all branches
 */
const buildFulfillmentPlan = async (item, requestorLat, requestorLon) => {
    const branches = await bloodUnitModel.getAvailableCountByBranch(
        item.blood_type,
        item.component
    );

    if (branches.length === 0) {
        return {
            canSingleBranch:    false,
            singleBranchOption: null,
            splitOption:        [],
            totalAvailable:     0,
        };
    }

    const withDistance = branches.map((b) => ({
        ...b,
        distance_km:     getDistanceKm(
            requestorLat, requestorLon,
            parseFloat(b.latitude), parseFloat(b.longitude)
        ),
        available_count: parseInt(b.available_count, 10),
    })).sort((a, b) => a.distance_km - b.distance_km);

    const totalAvailable = withDistance.reduce(
        (sum, b) => sum + b.available_count, 0
    );

    const singleBranchOption = withDistance.find(
        (b) => b.available_count >= item.units_requested
    ) || null;

    let remaining     = item.units_requested;
    const splitOption = [];

    for (const branch of withDistance) {
        if (remaining <= 0) break;
        const take = Math.min(branch.available_count, remaining);
        splitOption.push({
            branch_id:     branch.branch_id,
            branch_name:   branch.branch_name,
            units_to_take: take,
            distance_km:   branch.distance_km,
        });
        remaining -= take;
    }

    return {
        canSingleBranch:    !!singleBranchOption,
        singleBranchOption,
        splitOption:         remaining <= 0 ? splitOption : [],
        totalAvailable,
    };
};

/**
 * Get multi-branch fulfillment options for all items in a request.
 * Called before submission so the mobile app can show the requestor their options.
 *
 * Returns per-item fulfillment plans plus a summary of what choices to present.
 */
const getFulfillmentOptions = async (items, requestorLat, requestorLon) => {
    const errors = validateItems(items, []);
    if (errors.length > 0) throw new BusinessError(errors[0], 400);

    const plans = await Promise.all(
        items.map(async (item) => {
            const plan = await buildFulfillmentPlan(item, requestorLat, requestorLon);
            return { ...item, plan };
        })
    );

    const allHaveSingle   = plans.every((p) => p.plan.canSingleBranch);
    const anyInsufficient = plans.some((p) => p.plan.totalAvailable < p.units_requested);

    return {
        plans,
        recommendation:   allHaveSingle ? 'single_branch' : 'split',
        any_insufficient: anyInsufficient,
    };
};

module.exports = {
    getDistanceKm,
    getWaitingTimeEstimate,
    buildFulfillmentPlan,
    getFulfillmentOptions,
};