/**
 * bloodRequestService.js — Blood request lifecycle orchestration.
 *
 * Handles creation, approval (with SELECT FOR UPDATE race condition fix),
 * release, rejection, and requestor self-cancel.
 *
 * Fulfillment planning (distance sorting, branch options, wait time estimates)
 * lives in fulfillmentService.js — import from there for read-only planning.
 *
 * Status transitions validated by domain before any DB write.
 * Socket event emitted to requestor's private room on every status change.
 *
 * TRANSACTION NOTE: approveRequest, releaseRequest, rejectRequest, and
 * markReceived all mutate multiple rows across blood_units, reservations,
 * blood_requests, and request_status_logs. Every write inside these
 * functions must use the local `client` (from pool.connect()) rather than
 * the shared `pool` — passing `client` explicitly into
 * bloodUnitModel.updateUnitStatus / bloodRequestModel.createReservation /
 * updateItemFulfilled / updateRequestStatus / createStatusLog /
 * updateReservationStatus. All of those model functions accept the
 * transaction client as an optional final argument, defaulting to `pool`
 * for other (non-transactional) callers like the Blood Units Dispose/
 * Withdraw actions. Without this, a partial failure mid-function leaves
 * a ROLLBACK with nothing to undo, since the earlier writes already
 * committed on separate pooled connections — this was the root cause of
 * a unit getting stuck at status='Reserved' with no matching reservation
 * row after a failed approve attempt.
 */

const pool              = require('../../config/db');
const bloodRequestModel = require('../repositories/bloodRequestModel');
const bloodUnitModel    = require('../repositories/bloodUnitModel');
const { invalidateCache } = require('../cache/cacheService');
const { assertValidTransition } = require('../domain/bloodRequestRules');
const { validateItems } = require('../../validators/bloodRequestValidator');
const { buildFulfillmentPlan } = require('./fulfillmentService');
const notificationService = require('./notificationService');
const BusinessError = require('../../utils/businessError');

// Cache keys — single source of truth
const AVAILABILITY_CACHE_KEY = 'cache:blood-units:availability';
const INVENTORY_CACHE_KEY    = 'cache:blood-units:inventory';

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a blood request with its line items.
 * Validates total unit cap before inserting.
 */
const createRequest = async (data, items, userId) => {
    const errors = validateItems(items, []);
    if (errors.length > 0) throw new BusinessError(errors[0], 400);

    const request = await bloodRequestModel.createRequest({
        ...data,
        user_id: userId,
    });

    const createdItems = await bloodRequestModel.createRequestItems(
        request.request_id,
        items
    );

    await bloodRequestModel.createStatusLog({
        request_id:      request.request_id,
        old_status:      null,
        new_status:      'Pending',
        changed_by_type: 'requestor',
        changed_by_id:   userId,
        notes:           'Request submitted',
    });

    // Fire and forget — notification failure must not break request creation
    notificationService.notifyNewBloodRequest({
        request_id:    request.request_id,
        branch_id:     request.branch_id,
        patient_name:  data.patient_name,
        urgency_level: data.urgency_level,
    }).catch((err) => console.error('notifyNewBloodRequest failed:', err));

    // Fire and forget — separate from the staff notification above.
    // bloodsync.md #32-33: confirms to the requestor that their submission
    // itself was received. Independent try/catch from notifyNewBloodRequest
    // so a failure in one email never blocks or masks the other.
    notificationService.notifyRequestorSubmission({
        request_id:   request.request_id,
        user_id:      userId,
        patient_name: data.patient_name,
    }).catch((err) => console.error('notifyRequestorSubmission failed:', err));

    return { request, items: createdItems };
};

// ─── Approve ──────────────────────────────────────────────────────────────────

/**
 * Approve a blood request and auto-assign blood units (FEFO, multi-branch aware).
 * Uses SELECT FOR UPDATE to prevent race conditions.
 * All writes go through `client` so the whole approval is atomic — see the
 * TRANSACTION NOTE at the top of this file.
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
        if (!request) throw new BusinessError('Blood request not found', 404);

        assertValidTransition(request.status, 'Approved');

        const items        = await bloodRequestModel.getItemsByRequest(requestId);
        const reservations = [];

        for (const item of items) {
            // Try preferred/assigned branch first
            let availableUnits = await bloodUnitModel.getAvailableUnitsForAssignment(
                item.blood_type,
                item.component,
                request.branch_id,
                item.units_requested
            );

            // If primary branch insufficient, look across all branches (FEFO per branch)
            if (availableUnits.length < item.units_requested) {
                const allBranches = await bloodUnitModel.getAvailableCountByBranch(
                    item.blood_type,
                    item.component
                );

                const branchesWithStock = allBranches.filter(
                    (b) => b.branch_id !== request.branch_id
                );

                const branchNames = branchesWithStock
                    .map((b) => b.branch_name)
                    .join(', ');

                if (
                    availableUnits.length +
                    allBranches.reduce((sum, b) => sum + parseInt(b.available_count, 10), 0) <
                    item.units_requested
                ) {
                    throw new BusinessError(
                        `Insufficient ${item.blood_type} ${item.component}. ` +
                        `Requested: ${item.units_requested}. ` +
                        `Total available across all branches: ${
                            availableUnits.length +
                            allBranches.reduce((sum, b) => sum + parseInt(b.available_count, 10), 0)
                        }. ` +
                        (branchNames ? `Other branches with stock: ${branchNames}.` : ''),
                        400
                    );
                }

                // Fill remaining from other branches (nearest first if coords exist)
                let remaining = item.units_requested - availableUnits.length;

                for (const branch of branchesWithStock) {
                    if (remaining <= 0) break;
                    const extra = await bloodUnitModel.getAvailableUnitsForAssignment(
                        item.blood_type,
                        item.component,
                        branch.branch_id,
                        remaining
                    );
                    availableUnits = [...availableUnits, ...extra];
                    remaining -= extra.length;
                }
            }

            for (const unit of availableUnits) {
                await bloodUnitModel.updateUnitStatus(unit.unit_id, 'Reserved', null, null, client);
                const reservation = await bloodRequestModel.createReservation({
                    request_id:  requestId,
                    item_id:     item.item_id,
                    unit_id:     unit.unit_id,
                    reserved_by: staffId,
                    branch_id:   unit.branch_id,
                    notes:       null,
                }, client);
                reservations.push(reservation);
            }

            await bloodRequestModel.updateItemFulfilled(
                item.item_id,
                availableUnits.length,
                client
            );
        }

        const updated = await bloodRequestModel.updateRequestStatus(
            requestId, 'Approved', staffId, null, client
        );

        await bloodRequestModel.createStatusLog({
            request_id:      requestId,
            old_status:      'Pending',
            new_status:      'Approved',
            changed_by_type: 'staff',
            changed_by_id:   staffId,
            notes:           'Request approved and blood units reserved',
        }, client);

        await client.query('COMMIT');

        await invalidateCache(AVAILABILITY_CACHE_KEY);
        await invalidateCache(INVENTORY_CACHE_KEY);

        notificationService.notifyRequestStatusChange({
            request_id:   requestId,
            user_id:      request.user_id,
            new_status:   'Approved',
            patient_name: request.patient_name,
        }).catch((err) => console.error('notifyRequestStatusChange failed:', err));

        return { request: updated, reservations };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ─── Mark Ready for Pickup ────────────────────────────────────────────────────

/**
 * Staff marks units as ready for pickup — Approved → Waiting.
 * Units stay Reserved. Request moves to Waiting so the requestor
 * knows they can come collect.
 * No unit/reservation status changes here (units stay Reserved), so no
 * transaction is needed beyond the two model writes below.
 */
const markReadyForPickup = async (requestId, staffId) => {
    const request = await bloodRequestModel.getRequestById(requestId);
    if (!request) throw new BusinessError('Blood request not found', 404);

    assertValidTransition(request.status, 'Waiting');

    const updated = await bloodRequestModel.updateRequestStatus(
        requestId, 'Waiting', staffId
    );

    await bloodRequestModel.createStatusLog({
        request_id:      requestId,
        old_status:      'Approved',
        new_status:      'Waiting',
        changed_by_type: 'staff',
        changed_by_id:   staffId,
        notes:           'Units prepared and ready for pickup',
    });

    notificationService.notifyRequestStatusChange({
        request_id:   requestId,
        user_id:      request.user_id,
        new_status:   'Waiting',
        patient_name: request.patient_name,
    }).catch((err) => console.error('notifyRequestStatusChange failed:', err));

    return updated;
};

// ─── Release ──────────────────────────────────────────────────────────────────

/**
 * Staff manually releases — Waiting → Released.
 * Used when requestor failed to click "already received" or staff
 * is handling it directly.
 * Wrapped in a transaction — see TRANSACTION NOTE at top of file. A
 * partial failure partway through the reservations loop would otherwise
 * leave some units flipped to Released and others still Reserved, with
 * no way to roll back the ones that already committed.
 */
const releaseRequest = async (requestId, staffId) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const lockResult = await client.query(
            `SELECT * FROM blood_requests WHERE request_id = $1 FOR UPDATE`,
            [requestId]
        );

        const request = lockResult.rows[0];
        if (!request) throw new BusinessError('Blood request not found', 404);

        assertValidTransition(request.status, 'Released');

        const reservations = await bloodRequestModel.getReservationsByRequest(requestId);

        for (const reservation of reservations) {
            await bloodUnitModel.updateUnitStatus(reservation.unit_id, 'Released', null, null, client);
            await bloodRequestModel.updateReservationStatus(
                reservation.reservation_id, 'Released', new Date(), client
            );
        }

        const updated = await bloodRequestModel.updateRequestStatus(
            requestId, 'Released', staffId, null, client
        );

        await bloodRequestModel.createStatusLog({
            request_id:      requestId,
            old_status:      'Waiting',
            new_status:      'Released',
            changed_by_type: 'staff',
            changed_by_id:   staffId,
            notes:           'Blood units released to requestor by staff',
        }, client);

        await client.query('COMMIT');

        await invalidateCache(AVAILABILITY_CACHE_KEY);
        await invalidateCache(INVENTORY_CACHE_KEY);

        notificationService.notifyRequestStatusChange({
            request_id:   requestId,
            user_id:      request.user_id,
            new_status:   'Released',
            patient_name: request.patient_name,
        }).catch((err) => console.error('notifyRequestStatusChange failed:', err));

        return updated;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ─── Mark Received (requestor-triggered) ─────────────────────────────────────

/**
 * Requestor confirms they have received the blood units — Waiting → Released.
 * Same unit status flip as releaseRequest but logged as 'requestor' not 'staff'.
 * Only allowed when status is Waiting — enforced by assertValidTransition.
 * Wrapped in a transaction — same reasoning as releaseRequest above.
 */
const markReceived = async (requestId, userId) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const lockResult = await client.query(
            `SELECT * FROM blood_requests WHERE request_id = $1 FOR UPDATE`,
            [requestId]
        );

        const request = lockResult.rows[0];
        if (!request) throw new BusinessError('Blood request not found', 404);

        // Scope check — requestor can only mark their own request
        if (request.user_id !== userId) {
            throw new BusinessError('Not authorized to update this request', 403);
        }

        assertValidTransition(request.status, 'Released');

        const reservations = await bloodRequestModel.getReservationsByRequest(requestId);

        for (const reservation of reservations) {
            await bloodUnitModel.updateUnitStatus(reservation.unit_id, 'Released', null, null, client);
            await bloodRequestModel.updateReservationStatus(
                reservation.reservation_id, 'Released', new Date(), client
            );
        }

        const updated = await bloodRequestModel.updateRequestStatus(
            requestId, 'Released', userId, null, client
        );

        await bloodRequestModel.createStatusLog({
            request_id:      requestId,
            old_status:      'Waiting',
            new_status:      'Released',
            changed_by_type: 'requestor',
            changed_by_id:   userId,
            notes:           'Requestor confirmed receipt of blood units',
        }, client);

        await client.query('COMMIT');

        await invalidateCache(AVAILABILITY_CACHE_KEY);
        await invalidateCache(INVENTORY_CACHE_KEY);

        return updated;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ─── Reject ───────────────────────────────────────────────────────────────────

/**
 * Wrapped in a transaction — same reasoning as releaseRequest. A partial
 * failure mid-loop here previously could leave some units flipped back to
 * Available while the request itself never updated to Rejected.
 */
const rejectRequest = async (requestId, staffId, denialReason) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const lockResult = await client.query(
            `SELECT * FROM blood_requests WHERE request_id = $1 FOR UPDATE`,
            [requestId]
        );

        const request = lockResult.rows[0];
        if (!request) throw new BusinessError('Blood request not found', 404);

        assertValidTransition(request.status, 'Rejected');

        const reservations = await bloodRequestModel.getReservationsByRequest(requestId);

        for (const reservation of reservations) {
            await bloodUnitModel.updateUnitStatus(reservation.unit_id, 'Available', null, null, client);
            await bloodRequestModel.updateReservationStatus(
                reservation.reservation_id, 'Cancelled', null, client
            );
        }

        const updated = await bloodRequestModel.updateRequestStatus(
            requestId, 'Rejected', staffId, denialReason, client
        );

        await bloodRequestModel.createStatusLog({
            request_id:      requestId,
            old_status:      request.status, // Pending, Approved, or Waiting
            new_status:      'Rejected',
            changed_by_type: 'staff',
            changed_by_id:   staffId,
            notes:           denialReason,
        }, client);

        await client.query('COMMIT');

        await invalidateCache(AVAILABILITY_CACHE_KEY);
        await invalidateCache(INVENTORY_CACHE_KEY);

        notificationService.notifyRequestStatusChange({
            request_id:   requestId,
            user_id:      request.user_id,
            new_status:   'Rejected',
            patient_name: request.patient_name,
            reason:       denialReason,
        }).catch((err) => console.error('notifyRequestStatusChange failed:', err));

        return updated;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ─── Cancel (requestor self-cancel) ──────────────────────────────────────────

/**
 * Requestor can cancel their own Pending request only.
 * Once Approved, only staff can reject.
 * No units are ever reserved on a Pending request, so there's nothing to
 * roll back beyond the single UPDATE already inside bloodRequestModel's
 * cancelRequest — no transaction needed here.
 */
const cancelRequest = async (requestId, userId) => {
    const cancelled = await bloodRequestModel.cancelRequest(requestId, userId);

    if (!cancelled) {
        const request = await bloodRequestModel.getRequestById(requestId);
        if (!request) throw new BusinessError('Blood request not found', 404);
        if (request.user_id !== userId) throw new BusinessError('Not authorized to cancel this request', 403);
        throw new BusinessError(
            `Cannot cancel a request with status: ${request.status}. Only Pending requests can be cancelled.`,
            400
        );
    }

    await bloodRequestModel.createStatusLog({
        request_id:      requestId,
        old_status:      'Pending',
        new_status:      'Cancelled',
        changed_by_type: 'requestor',
        changed_by_id:   userId,
        notes:           'Cancelled by requestor',
    });

    return cancelled;
};

// ─── Status router ────────────────────────────────────────────────────────────

const updateStatus = async (requestId, status, staffId, denialReason = null) => {
    if (status === 'Approved') return approveRequest(requestId, staffId);
    if (status === 'Waiting')  return markReadyForPickup(requestId, staffId);
    if (status === 'Released') return releaseRequest(requestId, staffId);
    if (status === 'Rejected') return rejectRequest(requestId, staffId, denialReason);
    throw new BusinessError('Invalid status transition', 400);
};

module.exports = {
    createRequest,
    approveRequest,
    markReadyForPickup,
    releaseRequest,
    markReceived,
    rejectRequest,
    cancelRequest,
    updateStatus,
};