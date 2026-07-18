/**
 * bloodDriveModel.js — SQL queries for blood_drives and
 * blood_drive_participants tables.
 * No business logic. No status computation. Raw data only.
 */

const pool = require('../../config/db');

// ── Blood Drives ────────────────────────────────────────────

const getAllDrives = async () => {
    const result = await pool.query(
        `SELECT
            bd.*,
            b.branch_name,
            u.first_name  AS created_by_first,
            u.last_name   AS created_by_last,
            cu.first_name AS cancelled_by_first,
            cu.last_name  AS cancelled_by_last
         FROM blood_drives bd
         LEFT JOIN branches b  ON bd.branch_id    = b.branch_id
         LEFT JOIN users u     ON bd.created_by    = u.user_id
         LEFT JOIN users cu    ON bd.cancelled_by  = cu.user_id
         ORDER BY bd.start_datetime DESC`
    );
    return result.rows;
};

const getDriveById = async (drive_id) => {
    const result = await pool.query(
        `SELECT
            bd.*,
            b.branch_name,
            u.first_name  AS created_by_first,
            u.last_name   AS created_by_last,
            cu.first_name AS cancelled_by_first,
            cu.last_name  AS cancelled_by_last
         FROM blood_drives bd
         LEFT JOIN branches b  ON bd.branch_id    = b.branch_id
         LEFT JOIN users u     ON bd.created_by    = u.user_id
         LEFT JOIN users cu    ON bd.cancelled_by  = cu.user_id
         WHERE bd.drive_id = $1`,
        [drive_id]
    );
    return result.rows[0];
};

const getDrivesByBranch = async (branch_id) => {
    const result = await pool.query(
        `SELECT
            bd.*,
            b.branch_name,
            u.first_name AS created_by_first,
            u.last_name  AS created_by_last
         FROM blood_drives bd
         LEFT JOIN branches b ON bd.branch_id  = b.branch_id
         LEFT JOIN users u    ON bd.created_by  = u.user_id
         WHERE bd.branch_id = $1
         ORDER BY bd.start_datetime DESC`,
        [branch_id]
    );
    return result.rows;
};

const createDrive = async (data) => {
    const {
        branch_id, created_by, name, description,
        venue_name, venue_type, building, floor_room,
        street_address, city, province, postal_code,
        slots_available, contact_person, contact_number,
        contact_email, start_datetime, end_datetime,
        venue_latitude, venue_longitude,
    } = data;

    const result = await pool.query(
        `INSERT INTO blood_drives (
            branch_id, created_by, name, description,
            venue_name, venue_type, building, floor_room,
            street_address, city, province, postal_code,
            slots_available, contact_person, contact_number,
            contact_email, start_datetime, end_datetime,
            venue_latitude, venue_longitude,
            status
         ) VALUES (
            $1,  $2,  $3,  $4,
            $5,  $6,  $7,  $8,
            $9,  $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18,
            $19, $20,
            'Upcoming'
         ) RETURNING *`,
        [
            branch_id, created_by, name, description || null,
            venue_name || null, venue_type || null,
            building || null, floor_room || null,
            street_address || null, city || null,
            province || 'Batangas', postal_code || null,
            slots_available || null,
            contact_person || null, contact_number || null,
            contact_email || null, start_datetime, end_datetime,
            venue_latitude || null, venue_longitude || null,
        ]
    );
    return result.rows[0];
};

const updateDrive = async (drive_id, data) => {
    const {
        name, description, venue_name, venue_type,
        building, floor_room, street_address, city,
        province, postal_code, slots_available,
        contact_person, contact_number, contact_email,
        start_datetime, end_datetime,
        venue_latitude, venue_longitude,
    } = data;

    const result = await pool.query(
        `UPDATE blood_drives SET
            name             = COALESCE($1,  name),
            description      = COALESCE($2,  description),
            venue_name       = COALESCE($3,  venue_name),
            venue_type       = COALESCE($4,  venue_type),
            building         = COALESCE($5,  building),
            floor_room       = COALESCE($6,  floor_room),
            street_address   = COALESCE($7,  street_address),
            city             = COALESCE($8,  city),
            province         = COALESCE($9,  province),
            postal_code      = COALESCE($10, postal_code),
            slots_available  = COALESCE($11, slots_available),
            contact_person   = COALESCE($12, contact_person),
            contact_number   = COALESCE($13, contact_number),
            contact_email    = COALESCE($14, contact_email),
            start_datetime   = COALESCE($15, start_datetime),
            end_datetime     = COALESCE($16, end_datetime),
            venue_latitude   = COALESCE($17, venue_latitude),
            venue_longitude  = COALESCE($18, venue_longitude),
            updated_at       = NOW()
         WHERE drive_id = $19
         RETURNING *`,
        [
            name ?? null, description ?? null,
            venue_name ?? null, venue_type ?? null,
            building ?? null, floor_room ?? null,
            street_address ?? null, city ?? null,
            province ?? null, postal_code ?? null,
            slots_available ?? null, contact_person ?? null,
            contact_number ?? null, contact_email ?? null,
            start_datetime ?? null, end_datetime ?? null,
            venue_latitude ?? null, venue_longitude ?? null,
            drive_id,
        ]
    );
    return result.rows[0];
};

const updateDriveStatus = async (drive_id, status) => {
    const result = await pool.query(
        `UPDATE blood_drives
         SET status = $1, updated_at = NOW()
         WHERE drive_id = $2
         RETURNING *`,
        [status, drive_id]
    );
    return result.rows[0];
};

const cancelDrive = async (drive_id, cancelled_by, cancellation_reason) => {
    const result = await pool.query(
        `UPDATE blood_drives SET
            status               = 'Cancelled',
            cancelled_by         = $1,
            cancelled_at         = NOW(),
            cancellation_reason  = $2,
            updated_at           = NOW()
         WHERE drive_id = $3
           AND status != 'Cancelled'
         RETURNING *`,
        [cancelled_by, cancellation_reason || null, drive_id]
    );
    return result.rows[0];
};

// ── Participants ────────────────────────────────────────────

const getParticipantsByDrive = async (drive_id) => {
    const result = await pool.query(
        `SELECT
            bdp.*,
            u.first_name,
            u.last_name,
            u.email,
            r.role_name,
            r.role_id,
            ab.first_name AS assigned_by_first,
            ab.last_name  AS assigned_by_last
         FROM blood_drive_participants bdp
         JOIN users u   ON bdp.user_id     = u.user_id
         JOIN roles r   ON u.role_id       = r.role_id
         JOIN users ab  ON bdp.assigned_by = ab.user_id
         WHERE bdp.drive_id = $1
         ORDER BY bdp.assigned_at ASC`,
        [drive_id]
    );
    return result.rows;
};

const getParticipant = async (drive_id, user_id) => {
    const result = await pool.query(
        `SELECT * FROM blood_drive_participants
         WHERE drive_id = $1 AND user_id = $2`,
        [drive_id, user_id]
    );
    return result.rows[0];
};

/**
 * Find the active drive assignment for a user right now.
 * Used by bloodDriveMiddleware to gate Volunteer/Phlebotomist access.
 * Compares against Philippine time explicitly.
 */
const getActiveDriveForUser = async (user_id) => {
    const result = await pool.query(
        `SELECT bd.*, bdp.assignment_status
         FROM blood_drive_participants bdp
         JOIN blood_drives bd ON bdp.drive_id = bd.drive_id
         WHERE bdp.user_id = $1
           AND bd.status != 'Cancelled'
           AND (NOW() AT TIME ZONE 'Asia/Manila') >= bd.start_datetime
           AND (NOW() AT TIME ZONE 'Asia/Manila') <= bd.end_datetime
         LIMIT 1`,
        [user_id]
    );
    return result.rows[0];
};

/**
 * getAssignmentsByUser(user_id)
 * Returns every blood_drive_participants row for this user, joined with
 * the parent drive's display fields (name, schedule, venue) and who
 * assigned them. Used by the Volunteer/Phlebotomist "My Assignments"
 * page — frontend splits into Incoming (assignment_status = 'Assigned')
 * vs History (Confirmed/Declined/No Show) tabs client-side; this query
 * intentionally returns everything unfiltered, same "no frontend
 * filtering needed, backend just scopes to the caller" pattern as
 * bloodRequestModel.js's getRequestsByBranch (see contract.md).
 * Ordered newest-drive-first, same convention as getAllDrives/
 * getDrivesByBranch.
 */
const getAssignmentsByUser = async (user_id) => {
    const result = await pool.query(
        `SELECT
            bdp.drive_id,
            bdp.user_id,
            bdp.assignment_status,
            bdp.role_notes,
            bdp.assigned_at,
            bd.name,
            bd.status,
            bd.start_datetime,
            bd.end_datetime,
            bd.venue_name,
            bd.street_address,
            bd.city,
            bd.province,
            ab.first_name AS assigned_by_first,
            ab.last_name  AS assigned_by_last
         FROM blood_drive_participants bdp
         JOIN blood_drives bd  ON bdp.drive_id    = bd.drive_id
         JOIN users ab         ON bdp.assigned_by = ab.user_id
         WHERE bdp.user_id = $1
         ORDER BY bd.start_datetime DESC`,
        [user_id]
    );
    return result.rows;
};

const addParticipant = async (drive_id, user_id, assigned_by, role_notes) => {
    const result = await pool.query(
        `INSERT INTO blood_drive_participants
            (drive_id, user_id, assigned_by, role_notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [drive_id, user_id, assigned_by, role_notes || null]
    );
    return result.rows[0];
};

const removeParticipant = async (drive_id, user_id) => {
    const result = await pool.query(
        `DELETE FROM blood_drive_participants
         WHERE drive_id = $1 AND user_id = $2
         RETURNING *`,
        [drive_id, user_id]
    );
    return result.rows[0];
};

const updateParticipantStatus = async (drive_id, user_id, assignment_status) => {
    const result = await pool.query(
        `UPDATE blood_drive_participants
         SET assignment_status = $1
         WHERE drive_id = $2 AND user_id = $3
         RETURNING *`,
        [assignment_status, drive_id, user_id]
    );
    return result.rows[0];
};

const setConfirmationToken = async (drive_id, user_id, token) => {
    const result = await pool.query(
        `UPDATE blood_drive_participants
         SET confirmation_token = $1
         WHERE drive_id = $2 AND user_id = $3
         RETURNING *`,
        [token, drive_id, user_id]
    );
    return result.rows[0];
};

const getParticipantByToken = async (token) => {
    const result = await pool.query(
        `SELECT bdp.*, bd.name AS drive_name, bd.start_datetime,
                bd.venue_name, bd.status AS drive_status,
                u.first_name, u.last_name
         FROM blood_drive_participants bdp
         JOIN blood_drives bd ON bdp.drive_id = bd.drive_id
         JOIN users u ON bdp.user_id = u.user_id
         WHERE bdp.confirmation_token = $1`,
        [token]
    );
    return result.rows[0];
};

const clearConfirmationToken = async (drive_id, user_id) => {
    await pool.query(
        `UPDATE blood_drive_participants
         SET confirmation_token = NULL
         WHERE drive_id = $1 AND user_id = $2`,
        [drive_id, user_id]
    );
};

// ── Drive Stats ─────────────────────────────────────────────

/**
 * Aggregate drive statistics for the monitoring dashboard.
 * Joins blood_drives inline to get the drive time window for
 * new vs returning donor classification.
 *
 * Donor breakdown:
 *   - total_donors     — all distinct donors with an interview in this drive
 *   - new_donors       — donors whose donors.created_at falls within the
 *                        drive window (registered for the first time here)
 *   - returning_donors — donors who existed before the drive started
 *
 * Interview breakdown:
 *   - interviews_total   — all interview records for this drive
 *   - interviews_passed  — interview_result = 'Pass'
 *   - interviews_failed  — interview_result = 'Fail' (deferred at interview)
 *   - interviews_pending — interview_result IS NULL (not yet completed)
 *
 * Screening breakdown:
 *   - screenings_total    — screenings linked to this drive's interviews
 *   - screenings_eligible — screening_result = 'Eligible'
 *   - screenings_deferred — screening_result = 'Deferred'
 *
 * Donation breakdown:
 *   - donations_total — all donations for this drive
 *   - donations_qns   — is_qns = true (extraction too slow)
 *   - donations_valid — is_qns = false (successful extraction)
 *
 * Collection breakdown:
 *   - collections_total    — all collection records for this drive
 *   - collections_pending  — awaiting testing
 *   - collections_safe     — passed testing, moved to inventory
 *   - collections_rejected — failed testing
 *
 * Returns raw pg row — integer conversion done in service layer.
 */
const getDriveStats = async (drive_id) => {
    const result = await pool.query(
        `SELECT
            COUNT(DISTINCT di.donor_id)
                                                                              AS total_donors,
            COUNT(DISTINCT di.donor_id) FILTER (
                WHERE d.created_at >= bd.start_datetime
                  AND d.created_at <= bd.end_datetime
            )                                                                 AS new_donors,
            COUNT(DISTINCT di.donor_id) FILTER (
                WHERE d.created_at < bd.start_datetime
            )                                                                 AS returning_donors,

            COUNT(di.interview_id)                                            AS interviews_total,
            COUNT(di.interview_id) FILTER (WHERE di.interview_result = 'Pass')  AS interviews_passed,
            COUNT(di.interview_id) FILTER (WHERE di.interview_result = 'Fail')  AS interviews_failed,
            COUNT(di.interview_id) FILTER (WHERE di.interview_result IS NULL)   AS interviews_pending,

            COUNT(s.screening_id)                                             AS screenings_total,
            COUNT(s.screening_id) FILTER (WHERE s.screening_result = 'Eligible') AS screenings_eligible,
            COUNT(s.screening_id) FILTER (WHERE s.screening_result = 'Deferred') AS screenings_deferred,

            COUNT(dn.donation_id)                                             AS donations_total,
            COUNT(dn.donation_id) FILTER (WHERE dn.is_qns = true)            AS donations_qns,
            COUNT(dn.donation_id) FILTER (WHERE dn.is_qns = false)           AS donations_valid,

            COUNT(bc.collection_id)                                           AS collections_total,
            COUNT(bc.collection_id) FILTER (WHERE bc.status = 'Pending')     AS collections_pending,
            COUNT(bc.collection_id) FILTER (WHERE bc.status = 'Safe')        AS collections_safe,
            COUNT(bc.collection_id) FILTER (WHERE bc.status = 'Rejected')    AS collections_rejected

         FROM donor_interviews di
         JOIN blood_drives bd
                ON bd.drive_id    = di.drive_id
         JOIN donors d
                ON d.donor_id     = di.donor_id
         LEFT JOIN screening s
                ON s.interview_id = di.interview_id
         LEFT JOIN donations dn
                ON dn.drive_id    = di.drive_id
               AND dn.donor_id    = di.donor_id
         LEFT JOIN blood_collections bc
                ON bc.drive_id    = di.drive_id
               AND bc.donor_id    = di.donor_id
         WHERE di.drive_id = $1`,
        [drive_id]
    );

    return result.rows[0];
};

module.exports = {
    getAllDrives,
    getDriveById,
    getDrivesByBranch,
    createDrive,
    updateDrive,
    updateDriveStatus,
    cancelDrive,
    getParticipantsByDrive,
    getParticipant,
    getActiveDriveForUser,
    getAssignmentsByUser,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
    setConfirmationToken,
    getParticipantByToken,
    clearConfirmationToken,
    getDriveStats,
};