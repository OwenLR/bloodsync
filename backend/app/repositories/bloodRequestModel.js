const pool = require('../../config/db');

const getAllRequests = async () => {
    const result = await pool.query(
        `SELECT br.request_id, br.user_id,
                u.first_name, u.last_name,
                br.hospital_id, h.hospital_name,
                br.branch_id, b.branch_name,
                br.patient_name, br.patient_age, br.diagnosis,
                br.urgency_level, br.request_form_path,
                br.fulfillment_type, br.delivery_address,
                br.preferred_branch_id,
                br.status, br.denial_reason,
                br.reviewed_by, br.reviewed_at,
                br.notes, br.created_at, br.updated_at
         FROM blood_requests br
         LEFT JOIN users u ON br.user_id = u.user_id
         LEFT JOIN hospitals h ON br.hospital_id = h.hospital_id
         LEFT JOIN branches b ON br.branch_id = b.branch_id
         ORDER BY br.created_at DESC`
    );
    return result.rows;
};

const getRequestById = async (id) => {
    const result = await pool.query(
        `SELECT br.request_id, br.user_id,
                u.first_name, u.last_name,
                br.hospital_id, h.hospital_name,
                br.branch_id, b.branch_name,
                br.patient_name, br.patient_age, br.diagnosis,
                br.urgency_level, br.request_form_path,
                br.fulfillment_type, br.delivery_address,
                br.preferred_branch_id,
                br.status, br.denial_reason,
                br.reviewed_by, br.reviewed_at,
                br.notes, br.created_at, br.updated_at
         FROM blood_requests br
         LEFT JOIN users u ON br.user_id = u.user_id
         LEFT JOIN hospitals h ON br.hospital_id = h.hospital_id
         LEFT JOIN branches b ON br.branch_id = b.branch_id
         WHERE br.request_id = $1`,
        [id]
    );
    return result.rows[0];
};

const getRequestsByUser = async (userId) => {
    const result = await pool.query(
        `SELECT br.request_id, br.hospital_id, h.hospital_name,
                br.branch_id, b.branch_name,
                br.patient_name, br.urgency_level,
                br.fulfillment_type, br.delivery_address,
                br.status, br.denial_reason, br.created_at
         FROM blood_requests br
         LEFT JOIN hospitals h ON br.hospital_id = h.hospital_id
         LEFT JOIN branches b ON br.branch_id = b.branch_id
         WHERE br.user_id = $1
         ORDER BY br.created_at DESC`,
        [userId]
    );
    return result.rows;
};

const createRequest = async (data) => {
    const {
        user_id, hospital_id, branch_id,
        patient_name, patient_age, diagnosis,
        urgency_level, request_form_path, notes,
        fulfillment_type, delivery_address, preferred_branch_id
    } = data;

    const result = await pool.query(
        `INSERT INTO blood_requests
            (user_id, hospital_id, branch_id, patient_name,
             patient_age, diagnosis, urgency_level, request_form_path, notes,
             fulfillment_type, delivery_address, preferred_branch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
            user_id, hospital_id, branch_id, patient_name,
            patient_age, diagnosis, urgency_level, request_form_path, notes,
            fulfillment_type || 'Pickup', delivery_address || null,
            preferred_branch_id || null
        ]
    );
    return result.rows[0];
};

const updateRequestStatus = async (id, status, reviewedBy, denialReason = null) => {
    const result = await pool.query(
        `UPDATE blood_requests SET
            status        = $1,
            reviewed_by   = $2,
            reviewed_at   = NOW(),
            denial_reason = COALESCE($3, denial_reason),
            updated_at    = NOW()
         WHERE request_id = $4
         RETURNING *`,
        [status, reviewedBy, denialReason, id]
    );
    return result.rows[0];
};

/**
 * Requestor self-cancel — only allowed when status is Pending.
 * Returns null if request not found or not owned by this user.
 */
const cancelRequest = async (requestId, userId) => {
    const result = await pool.query(
        `UPDATE blood_requests SET
            status     = 'Cancelled',
            updated_at = NOW()
         WHERE request_id = $1
         AND user_id      = $2
         AND status       = 'Pending'
         RETURNING *`,
        [requestId, userId]
    );
    return result.rows[0] || null;
};

/**
 * Get pending request count for a branch — used for waiting time estimate.
 */
const getPendingCountByBranch = async (branchId) => {
    const result = await pool.query(
        `SELECT COUNT(*) AS count
         FROM blood_requests
         WHERE branch_id = $1
         AND status = 'Pending'`,
        [branchId]
    );
    return parseInt(result.rows[0].count, 10);
};

const createRequestItems = async (requestId, items) => {
    const values = items.map((item, i) => {
        const offset = i * 4;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    }).join(', ');

    const params = items.flatMap(item => [
        requestId,
        item.blood_type,
        item.component,
        item.units_requested
    ]);

    const result = await pool.query(
        `INSERT INTO request_items
            (request_id, blood_type, component, units_requested)
         VALUES ${values}
         RETURNING *`,
        params
    );
    return result.rows;
};

const getItemsByRequest = async (requestId) => {
    const result = await pool.query(
        `SELECT * FROM request_items WHERE request_id = $1`,
        [requestId]
    );
    return result.rows;
};

const updateItemFulfilled = async (itemId, unitsFulfilled) => {
    await pool.query(
        `UPDATE request_items
         SET units_fulfilled = $1
         WHERE item_id = $2`,
        [unitsFulfilled, itemId]
    );
};

const createStatusLog = async (data) => {
    const { request_id, old_status, new_status, changed_by_type, changed_by_id, notes } = data;
    await pool.query(
        `INSERT INTO request_status_logs
            (request_id, old_status, new_status, changed_by_type, changed_by_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [request_id, old_status, new_status, changed_by_type, changed_by_id, notes]
    );
};

const getStatusLogsByRequest = async (requestId) => {
    const result = await pool.query(
        `SELECT * FROM request_status_logs
         WHERE request_id = $1
         ORDER BY created_at ASC`,
        [requestId]
    );
    return result.rows;
};

const createReservation = async (data) => {
    const { request_id, item_id, unit_id, reserved_by, notes, branch_id } = data;
    const result = await pool.query(
        `INSERT INTO reservations
            (request_id, item_id, unit_id, reserved_by, notes, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [request_id, item_id, unit_id, reserved_by, notes, branch_id || null]
    );
    return result.rows[0];
};

const getReservationsByRequest = async (requestId) => {
    const result = await pool.query(
        `SELECT res.*, bu.blood_type, bu.component,
                bu.expiration_date, bu.barcode,
                b.branch_name
         FROM reservations res
         LEFT JOIN blood_units bu ON res.unit_id = bu.unit_id
         LEFT JOIN branches b ON res.branch_id = b.branch_id
         WHERE res.request_id = $1`,
        [requestId]
    );
    return result.rows;
};

const updateReservationStatus = async (reservationId, status, releasedAt = null) => {
    const result = await pool.query(
        `UPDATE reservations SET
            status      = $1,
            released_at = COALESCE($2, released_at)
         WHERE reservation_id = $3
         RETURNING *`,
        [status, releasedAt, reservationId]
    );
    return result.rows[0];
};

module.exports = {
    getAllRequests,
    getRequestById,
    getRequestsByUser,
    createRequest,
    updateRequestStatus,
    cancelRequest,
    getPendingCountByBranch,
    createRequestItems,
    getItemsByRequest,
    updateItemFulfilled,
    createStatusLog,
    getStatusLogsByRequest,
    createReservation,
    getReservationsByRequest,
    updateReservationStatus,
};