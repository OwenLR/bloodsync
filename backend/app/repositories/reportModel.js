const pool = require('../../config/db');

// All branchId params accept null (Admin, all branches). Filter is a no-op when null.
// $1::int cast avoids the Postgres param-type ambiguity noted in bloodUnitModel.js.

// ============================================================
// Inventory (Blood Units)
// ============================================================

const getInventoryStatusBreakdown = async (branchId) => {
    const result = await pool.query(
        `SELECT
            CASE
                WHEN status = 'Available' AND expiration_date <= NOW() THEN 'Expired'
                ELSE status
            END AS status,
            COUNT(*) AS count
         FROM blood_units
         WHERE ($1::int IS NULL OR branch_id = $1)
         GROUP BY 1
         ORDER BY 1`,
        [branchId]
    );
    return result.rows;
};

const getInventoryStockByType = async (branchId) => {
    const result = await pool.query(
        `SELECT
            blood_type,
            component,
            COUNT(*) AS units_available
         FROM blood_units
         WHERE status = 'Available'
           AND expiration_date > NOW()
           AND ($1::int IS NULL OR branch_id = $1)
         GROUP BY blood_type, component
         ORDER BY blood_type, component`,
        [branchId]
    );
    return result.rows;
};

const getInventoryExpiryCounts = async (branchId) => {
    // near_expiry thresholds mirror NEAR_EXPIRY_DAYS in
    // constants/inventoryRulesConstant.js. Keep both in sync if changed
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (
                WHERE status = 'Available' AND expiration_date <= NOW()
            ) AS expired_count,
            COUNT(*) FILTER (
                WHERE status = 'Available' AND expiration_date > NOW() AND (
                    (component = 'Whole Blood'            AND expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (component = 'Packed Red Blood Cells'  AND expiration_date <= NOW() + INTERVAL '7 days')  OR
                    (component = 'Platelets'               AND expiration_date <= NOW() + INTERVAL '2 days')  OR
                    (component = 'Fresh Frozen Plasma'     AND expiration_date <= NOW() + INTERVAL '30 days')
                )
            ) AS near_expiry_count
         FROM blood_units
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

const getInventoryInboundTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM blood_units
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

const getInventoryInboundDailySeries = async (branchId, days) => {
    const result = await pool.query(
        `SELECT
            DATE(created_at) AS date,
            COUNT(*) AS count
         FROM blood_units
         WHERE created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
           AND ($1::int IS NULL OR branch_id = $1)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [branchId, days]
    );
    return result.rows;
};

const getInventoryWastageTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE status_updated_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE status_updated_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE status_updated_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM blood_units
         WHERE status IN ('Disposed', 'Withdrawn')
           AND ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

const getInventoryWastageDailySeries = async (branchId, days) => {
    const result = await pool.query(
        `SELECT
            DATE(status_updated_at) AS date,
            COUNT(*) AS count
         FROM blood_units
         WHERE status IN ('Disposed', 'Withdrawn')
           AND status_updated_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
           AND ($1::int IS NULL OR branch_id = $1)
         GROUP BY DATE(status_updated_at)
         ORDER BY date ASC`,
        [branchId, days]
    );
    return result.rows;
};

// ============================================================
// Donors / Workflow
// ============================================================

/**
 * Donors table has no branch_id (confirmed, not selected anywhere in
 * donorInterviewModel.js/donationModel.js joins). Registration itself is
 * not branch-scoped, so this metric is intentionally global, not filtered
 * by branchId even for Staff.
 * donors.created_at confirmed to exist via bloodDriveModel.js's
 * getDriveStats (d.created_at >= bd.start_datetime).
 */
const getDonorsRegisteredTotals = async () => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM donors`
    );
    return result.rows[0];
};

const getInterviewTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            interview_result,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM donor_interviews
         WHERE ($1::int IS NULL OR branch_id = $1)
         GROUP BY interview_result`,
        [branchId]
    );
    return result.rows;
};

// Table is `screening` (singular), confirmed via screeningModel.js.
const getScreeningTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            screening_result,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM screening
         WHERE ($1::int IS NULL OR branch_id = $1)
         GROUP BY screening_result`,
        [branchId]
    );
    return result.rows;
};

const getDonationTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month,
            COUNT(*) FILTER (WHERE is_qns = true AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS qns_this_month
         FROM donations
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

const getDonationDailySeries = async (branchId, days) => {
    const result = await pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM donations
         WHERE created_at >= CURRENT_DATE - ($2::int) * INTERVAL '1 day'
           AND ($1::int IS NULL OR branch_id = $1)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [branchId, days]
    );
    return result.rows;
};

// ============================================================
// Personal Impact (Volunteer / Phlebotomist)
// ============================================================
// No branch scoping here on purpose. This is a per-user lifetime count,
// not a branch report, so it should reflect everything the user has
// personally done across every branch/drive they've worked, same
// reasoning as getDonorsRegisteredTotals() being intentionally global.

const getInterviewsConductedByUser = async (userId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS count
         FROM donor_interviews
         WHERE conducted_by = $1`,
        [userId]
    );
    return result.rows[0];
};

const getScreeningsPerformedByUser = async (userId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS count
         FROM screening
         WHERE screened_by = $1`,
        [userId]
    );
    return result.rows[0];
};

// phlebotomist_id is who physically performed the extraction, distinct
// from extracted_by (who recorded the donation entry, see contract.md's
// Donation Endpoints section). Personal impact should reflect actual
// hands-on extraction work, so phlebotomist_id is the correct column.
const getUnitsExtractedByUser = async (userId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS count
         FROM donations
         WHERE phlebotomist_id = $1`,
        [userId]
    );
    return result.rows[0];
};

// ============================================================
// Blood Drives
// ============================================================

const getDriveStatusBreakdown = async (branchId) => {
    const result = await pool.query(
        `SELECT status, COUNT(*) AS count
         FROM blood_drives
         WHERE ($1::int IS NULL OR branch_id = $1)
         GROUP BY status`,
        [branchId]
    );
    return result.rows;
};

// ASSUMPTION: blood_drives.created_at exists (not directly confirmed in
// bloodDriveModel.js, only start_datetime/end_datetime/updated_at/
// cancelled_at are referenced there, but every other table in this
// schema has created_at, so assuming by convention). Flag if wrong.
const getDriveCreatedTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM blood_drives
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

// ============================================================
// Blood Testing / Collections
// ============================================================

const getCollectionStatusBreakdown = async (branchId) => {
    const result = await pool.query(
        `SELECT status, COUNT(*) AS count
         FROM blood_collections
         WHERE ($1::int IS NULL OR branch_id = $1)
         GROUP BY status`,
        [branchId]
    );
    return result.rows;
};

const getCollectionTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month,
            COUNT(*) FILTER (WHERE is_qns = true AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS qns_this_month
         FROM blood_collections
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

// ============================================================
// Blood Requests
// ============================================================

const getRequestStatusBreakdown = async (branchId) => {
    const result = await pool.query(
        `SELECT status, COUNT(*) AS count
         FROM blood_requests
         WHERE ($1::int IS NULL OR branch_id = $1)
         GROUP BY status`,
        [branchId]
    );
    return result.rows;
};

const getRequestUrgencyBreakdown = async (branchId) => {
    const result = await pool.query(
        `SELECT urgency_level, COUNT(*) AS count
         FROM blood_requests
         WHERE status NOT IN ('Released', 'Rejected', 'Cancelled')
           AND ($1::int IS NULL OR branch_id = $1)
         GROUP BY urgency_level`,
        [branchId]
    );
    return result.rows;
};

const getRequestTotals = async (branchId) => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM blood_requests
         WHERE ($1::int IS NULL OR branch_id = $1)`,
        [branchId]
    );
    return result.rows[0];
};

// ============================================================
// Users (Admin only)
// ============================================================

const getUserStatusBreakdown = async () => {
    const result = await pool.query(
        `SELECT status, COUNT(*) AS count
         FROM users
         GROUP BY status`
    );
    return result.rows;
};

const getUserRoleBreakdown = async () => {
    const result = await pool.query(
        `SELECT r.role_id, r.role_name, COUNT(u.user_id) AS count
         FROM roles r
         LEFT JOIN users u ON u.role_id = r.role_id
         GROUP BY r.role_id, r.role_name
         ORDER BY r.role_id`
    );
    return result.rows;
};

const getUserRegisteredTotals = async () => {
    const result = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS this_month
         FROM users`
    );
    return result.rows[0];
};

// Staff/branch breakdown, Admin and PRC Staff (role_id 2) only, per branch.
// Mirrors staffModel.js's role_id IN (1,2) convention but scoped to 2 only
// here since this is specifically about branch staffing levels, not admins
// (admins have no branch_id).
const getActiveStaffByBranch = async () => {
    const result = await pool.query(
        `SELECT
            b.branch_id,
            b.branch_name,
            COUNT(u.user_id) AS active_staff_count
         FROM branches b
         LEFT JOIN users u
             ON u.branch_id = b.branch_id
            AND u.role_id   = 2
            AND u.status    = 'Active'
         GROUP BY b.branch_id, b.branch_name
         ORDER BY b.branch_name`
    );
    return result.rows;
};

module.exports = {
    // Inventory
    getInventoryStatusBreakdown,
    getInventoryStockByType,
    getInventoryExpiryCounts,
    getInventoryInboundTotals,
    getInventoryInboundDailySeries,
    getInventoryWastageTotals,
    getInventoryWastageDailySeries,
    // Donors / Workflow
    getDonorsRegisteredTotals,
    getInterviewTotals,
    getScreeningTotals,
    getDonationTotals,
    getDonationDailySeries,
    // Personal Impact (Volunteer / Phlebotomist)
    getInterviewsConductedByUser,
    getScreeningsPerformedByUser,
    getUnitsExtractedByUser,
    // Blood Drives
    getDriveStatusBreakdown,
    getDriveCreatedTotals,
    // Blood Testing / Collections
    getCollectionStatusBreakdown,
    getCollectionTotals,
    // Blood Requests
    getRequestStatusBreakdown,
    getRequestUrgencyBreakdown,
    getRequestTotals,
    // Users
    getUserStatusBreakdown,
    getUserRoleBreakdown,
    getUserRegisteredTotals,
    getActiveStaffByBranch,
};