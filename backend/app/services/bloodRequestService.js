const pool = require('../../config/db');
const bloodRequestModel = require('../models/bloodRequestModel');
const bloodUnitModel = require('../models/bloodUnitModel');
const { invalidateCache } = require('../../middleware/cacheMiddleware');

const createRequest = async (data, items, userId) => {
    const request = await bloodRequestModel.createRequest({
        ...data,
        user_id: userId,
    });

    const createdItems = await bloodRequestModel.createRequestItems(request.request_id, items);

    await bloodRequestModel.createStatusLog({
        request_id: request.request_id,
        old_status: null,
        new_status: 'Pending',
        changed_by_type: 'requestor',
        changed_by_id: userId,
        notes: 'Request submitted',
    });

    return { request, items: createdItems };
};

const approveRequest = async (requestId, staffId) => {
    // Get a dedicated client for this transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // SELECT FOR UPDATE locks this row for the duration of the transaction.
        // If two staff members click approve simultaneously, the second one
        // waits here until the first transaction commits, then sees
        // status = 'Approved' and throws the error below.
        const lockResult = await client.query(
            `SELECT * FROM blood_requests
             WHERE request_id = $1
             FOR UPDATE`,
            [requestId]
        );

        const request = lockResult.rows[0];
        if (!request) throw new Error('Blood request not found');
        if (request.status !== 'Pending') throw new Error('Only Pending requests can be approved');

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
                    request_id: requestId,
                    item_id: item.item_id,
                    unit_id: unit.unit_id,
                    reserved_by: staffId,
                    notes: null,
                });
                reservations.push(reservation);
            }

            await bloodRequestModel.updateItemFulfilled(item.item_id, availableUnits.length);
        }

        const updated = await bloodRequestModel.updateRequestStatus(requestId, 'Approved', staffId);

        await bloodRequestModel.createStatusLog({
            request_id: requestId,
            old_status: 'Pending',
            new_status: 'Approved',
            changed_by_type: 'staff',
            changed_by_id: staffId,
            notes: 'Request approved and blood units reserved',
        });

        await client.query('COMMIT');

        await invalidateCache('cache:blood-units:availability');

        return { request: updated, reservations };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const releaseRequest = async (requestId, staffId) => {
    const request = await bloodRequestModel.getRequestById(requestId);
    if (!request) throw new Error('Blood request not found');
    if (request.status !== 'Approved') throw new Error('Only Approved requests can be released');

    const reservations = await bloodRequestModel.getReservationsByRequest(requestId);

    for (const reservation of reservations) {
        await bloodUnitModel.updateUnitStatus(reservation.unit_id, 'Released');
        await bloodRequestModel.updateReservationStatus(
            reservation.reservation_id, 'Released', new Date()
        );
    }

    const updated = await bloodRequestModel.updateRequestStatus(requestId, 'Released', staffId);

    await bloodRequestModel.createStatusLog({
        request_id: requestId,
        old_status: 'Approved',
        new_status: 'Released',
        changed_by_type: 'staff',
        changed_by_id: staffId,
        notes: 'Blood units released to requestor',
    });

    await invalidateCache('cache:blood-units:availability');

    return updated;
};

const rejectRequest = async (requestId, staffId, denialReason) => {
    const request = await bloodRequestModel.getRequestById(requestId);
    if (!request) throw new Error('Blood request not found');
    if (!['Pending', 'Approved'].includes(request.status)) {
        throw new Error('Only Pending or Approved requests can be rejected');
    }

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
        request_id: requestId,
        old_status: request.status,
        new_status: 'Rejected',
        changed_by_type: 'staff',
        changed_by_id: staffId,
        notes: denialReason,
    });

    await invalidateCache('cache:blood-units:availability');

    return updated;
};

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