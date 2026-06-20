/**
 * bloodDriveStaffingService.js — Volunteer/Phlebotomist staffing for blood drives.
 *
 * getSuggestedParticipants() — ranks available volunteers by distance from
 *   drive venue using Haversine formula. Powers the "review and pick" UI
 *   (Scenario 1: staff selects manually from a sorted list).
 *
 * bulkAddParticipants() — assigns multiple participants in one call.
 *   Two modes:
 *   - user_ids provided → assign exactly those users (manual selection)
 *   - target_count + role_id provided → auto-pick top N by distance
 *     (Scenario 2: large drives where clicking 35 times is unreasonable)
 *
 * Both modes reuse addParticipant() from bloodDriveService to keep all
 * assignment business rules (active status check, duplicate check,
 * terminal drive check, branch ownership, notification) in one place.
 */

const profileModel    = require('../repositories/profileModel');
const bloodDriveModel = require('../repositories/bloodDriveModel');
const BusinessError   = require('../../utils/businessError');
const { getDistanceKm } = require('./fulfillmentService');

// Imported here to reuse all existing assignment rules without duplication.
// addParticipant already handles: active check, duplicate check, terminal
// drive check, branch ownership, notification fire-and-forget.
const { addParticipant } = require('./bloodDriveService');

// ── Suggestions ───────────────────────────────────────────────────────────

/**
 * getSuggestedParticipants(drive_id, options)
 *
 * Returns eligible volunteers/phlebotomists sorted by distance from the
 * drive venue. Already-assigned participants are excluded.
 *
 * If the drive has no venue coordinates, falls back to alphabetical order
 * with distance: null — frontend can display these without a distance badge.
 *
 * @param {number} drive_id
 * @param {object} options
 * @param {number|null} options.role_id  — 5=Volunteer, 6=Phlebotomist, null=both
 * @param {number|null} options.limit    — cap result count (default: no cap)
 * @returns {Array} sorted candidates with distance_km attached
 */
const getSuggestedParticipants = async (drive_id, { role_id = null, limit = null } = {}) => {
    const drive = await bloodDriveModel.getDriveById(drive_id);
    if (!drive) throw new BusinessError('Blood drive not found', 404);

    // Get already-assigned user_ids so they are excluded from suggestions
    const existing    = await bloodDriveModel.getParticipantsByDrive(drive_id);
    const assignedIds = existing.map((p) => p.user_id);

    const candidates = await profileModel.getVolunteersWithCoords(
        role_id ? Number(role_id) : null,
        assignedIds
    );

    const hasVenueCoords =
        drive.venue_latitude != null && drive.venue_longitude != null;

    // Attach distance to each candidate
    const withDistance = candidates.map((c) => ({
        ...c,
        distance_km: hasVenueCoords
            ? getDistanceKm(
                  Number(drive.venue_latitude),
                  Number(drive.venue_longitude),
                  Number(c.latitude),
                  Number(c.longitude)
              )
            : null,
    }));

    // Sort: nearest first. Null distance goes to the end.
    withDistance.sort((a, b) => {
        if (a.distance_km === null && b.distance_km === null) return 0;
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
    });

    const results = limit ? withDistance.slice(0, Number(limit)) : withDistance;

    return {
        drive_has_coords: hasVenueCoords,
        total_candidates: withDistance.length,
        results,
    };
};

// ── Bulk Assign ───────────────────────────────────────────────────────────

/**
 * bulkAddParticipants(drive_id, body, reqUser)
 *
 * Mode 1 — Manual selection (Scenario 1):
 *   Body: { user_ids: [1, 2, 3], role_notes: "optional" }
 *   Assigns exactly those users.
 *
 * Mode 2 — Auto-assign top N by distance (Scenario 2):
 *   Body: { target_count: 30, role_id: 5, role_notes: "optional" }
 *   Fetches suggestions and assigns the top target_count candidates.
 *
 * Returns a summary:
 *   { assigned: [...], failed: [{ user_id, reason }], total_assigned, total_failed }
 *
 * Partial success is intentional — if 2 of 30 fail (e.g. one was just
 * deactivated between suggestion fetch and assignment), the other 28 go
 * through. The caller sees which ones failed and why.
 */
const bulkAddParticipants = async (drive_id, body, reqUser) => {
    const { user_ids, target_count, role_id, role_notes } = body;

    let targetUserIds;

    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
        // Mode 1: explicit list
        targetUserIds = user_ids.map(Number);
    } else if (target_count) {
        // Mode 2: auto-pick top N by distance
        const suggestions = await getSuggestedParticipants(drive_id, {
            role_id: role_id || null,
            limit:   Number(target_count),
        });

        if (suggestions.results.length === 0) {
            throw new BusinessError(
                'No eligible volunteers with location data found for auto-assignment',
                400
            );
        }

        targetUserIds = suggestions.results.map((s) => s.user_id);
    } else {
        throw new BusinessError(
            'Provide either user_ids (array) or target_count for bulk assignment',
            400
        );
    }

    const assigned = [];
    const failed   = [];

    // Process sequentially — avoids hammering the DB and gives deterministic
    // results. For 30–35 participants this is fast enough.
    for (const user_id of targetUserIds) {
        try {
            const participant = await addParticipant(
                drive_id,
                user_id,
                reqUser,
                role_notes || null
            );
            assigned.push(participant);
        } catch (err) {
            failed.push({
                user_id,
                reason: err.message || 'Unknown error',
            });
        }
    }

    return {
        total_assigned: assigned.length,
        total_failed:   failed.length,
        assigned,
        failed,
    };
};

module.exports = {
    getSuggestedParticipants,
    bulkAddParticipants,
};