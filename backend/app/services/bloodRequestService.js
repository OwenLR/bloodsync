/**
 * bloodRequestService.js — Blood request lifecycle orchestration.
 *
 * Handles creation, approval (with SELECT FOR UPDATE race condition fix),
 * release, and rejection. Auto-assigns blood units using FEFO on approval.
 * Status transitions validated by domain before any DB write.
 */

const pool = require('../../config/db');
const bloodRequestModel = require('../repositories/bloodRequestModel');
const bloodUnitModel = require('../repositories/bloodUnitModel');
const { invalidateCache } = require('../cache/cacheService');
const { assertValidTransition } = require('../domain/bloodRequestRules');

/**
 * Create a blood request with its line items.
 * Logs initial Pending status.
 *
 * @param {object}   data   - Request fields (request_form_path already resolved)
 * @param {object[]} items  - Array of { blood_type, component, units_requested }
 * @param {number}   userId - Requestor's user_id from JWT
 * @returns {{ request: object, items: object[] }}
 */
const createRequest = async (data, items, userId) => {
    const request = await bloodRequestModel.createRequest({
        ...data,
        user_id: userId,
    });

    const createdItems = await bloodRequestModel.createRequestItems(
        request.request_id,
        items
    );

    await bloodRequestModel.createStatusLog({
        request_id:       request.request_id,
        old_status:       null,
        new_status:       'Pending',
        changed_by_type:  'requestor',
        changed_by_id:    userId,
        notes:            'Request submitted',
    });

    return { request, items: createdItems };
};

/**
 * Approve a blood request and auto-assign blood units (FEFO).
 *
 * Uses SELECT FOR UPDATE to prevent race conditions when two staff members
 * attempt to approve the same request simultaneously — the second one will
 * see status = Approved and fail cleanly.
 *
 * FEFO: units with the nearest expiration date are assigned first.
 *
 * @param {number} requestId
 * @param {number} staffId
 * @returns {{ request: object, reservations: object[] }}
 */
const approveRequest = async (requestId, staffId) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const lockResult = await client.query(
            `SELECT * FROM blood_requests WHERE request_id = $1 FOR UPDATE`,
            [requestId]
        );

        const request = lockResult.rows[0];
        if (!request) throw new Error('Blood request not found');

        // Domain rule — throws if transition is invalid
        assertValidTransition(request.status, 'Approved');

        const items = await bloodRequestModel.getItemsByRequest(requestId);
        const reservations = [];

        for (const item of items) {
            const availableUnits = await bloodUnitModel.getAvailableUnitsForAssignment(
                item.blood_type,
                item.component,
                request.branch_id,
                item.units_requested
            );

            if (availableUnits.length < item.units_requested) {
                throw new Error(
                    `Not enough available units for ${item.blood_type} ${item.component}. ` +
                    `Requested: ${item.units_requested}, Available: ${availableUnits.length}`
                );
            }

            for (const unit of availableUnits) {
                await bloodUnitModel.updateUnitStatus(unit.unit_id, 'Reserved');
                const reservation = await bloodRequestModel.createReservation({
                    request_id:  requestId,
                    item_id:     item.item_id,
                    unit_id:     unit.unit_id,
                    reserved_by: staffId,
                    notes:       null,
                });
                reservations.push(reservation);
            }

            await bloodRequestModel.updateItemFulfilled(
                item.item_id,
                availableUnits.length
            );
        }

        const updated = await bloodRequestModel.updateRequestStatus(
            requestId, 'Approved', staffId
        );

        await bloodRequestModel.createStatusLog({
            request_id:      requestId,
            old_status:      'Pending',
            new_status:      'Approved',
            changed_by_type: 'staff',
            changed_by_id:   staffId,
            notes:           'Request approved and blood units reserved',
        });

        await client.query('COMMIT');

        // Invalidate only after successful commit
        await invalidateCache('cache:blood-units:availability');

        return { request: updated, reservations };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Release an approved request — marks units and reservations as Released.
 *
 * @param {number} requestId
 * @param {number} staffId
 * @returns {object} Updated request record
 */
const releaseRequest = async (requestId, staffId) => {
    const request = await bloodRequestModel.getRequestById(requestId);
    if (!request) throw new Error('Blood request not found');

    // Domain rule — throws if transition is invalid
    assertValidTransition(request.status, 'Released');

    const reservations = await bloodRequestModel.getReservationsByRequest(requestId);

    for (const reservation of reservations) {
        await bloodUnitModel.updateUnitStatus(reservation.unit_id, 'Released');
        await bloodRequestModel.updateReservationStatus(
            reservation.reservation_id, 'Released', new Date()
        );
    }

    const updated = await bloodRequestModel.updateRequestStatus(
        requestId, 'Released', staffId
    );

    await bloodRequestModel.createStatusLog({
        request_id:      requestId,
        old_status:      'Approved',
        new_status:      'Released',
        changed_by_type: 'staff',
        changed_by_id:   staffId,
        notes:           'Blood units released to requestor',
    });

    await invalidateCache('cache:blood-units:availability');

    return updated;
};

/**
 * Reject a request (from Pending or Approved).
 * Frees any reserved units back to Available.
 *
 * @param {number} requestId
 * @param {number} staffId
 * @param {string} denialReason
 * @returns {object} Updated request record
 */
const rejectRequest = async (requestId, staffId, denialReason) => {
    const request = await bloodRequestModel.getRequestById(requestId);
    if (!request) throw new Error('Blood request not found');

    // Domain rule — throws if transition is invalid
    assertValidTransition(request.status, 'Rejected');

    const reservations = await bloodRequestModel.getReservationsByRequest(requestId);

    for (const reservation of reservations) {
        await bloodUnitModel.updateUnitStatus(reservation.unit_id, 'Available');
        await bloodRequestModel.updateReservationStatus(
            reservation.reservation_id, 'Cancelled'
        );
    }

    const updated = await bloodRequestModel.updateRequestStatus(
        requestId, 'Rejected', staffId, denialReason
    );

    await bloodRequestModel.createStatusLog({
        request_id:      requestId,
        old_status:      request.status,
        new_status:      'Rejected',
        changed_by_type: 'staff',
        changed_by_id:   staffId,
        notes:           denialReason,
    });

    await invalidateCache('cache:blood-units:availability');

    return updated;
};

/**
 * Route a status update to the correct handler.
 *
 * @param {number} requestId
 * @param {string} status
 * @param {number} staffId
 * @param {string|null} denialReason
 */
const updateStatus = async (requestId, status, staffId, denialReason = null) => {
    if (status === 'Approved') return approveRequest(requestId, staffId);
    if (status === 'Released') return releaseRequest(requestId, staffId);
    if (status === 'Rejected') return rejectRequest(requestId, staffId, denialReason);
    throw new Error('Invalid status transition');
};

module.exports = {
    createRequest,
    approveRequest,
    releaseRequest,
    rejectRequest,
    updateStatus,
};