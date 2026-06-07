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
    } = data;

    const result = await pool.query(
        `INSERT INTO blood_drives (
            branch_id, created_by, name, description,
            venue_name, venue_type, building, floor_room,
            street_address, city, province, postal_code,
            slots_available, contact_person, contact_number,
            contact_email, start_datetime, end_datetime,
            status
         ) VALUES (
            $1,  $2,  $3,  $4,
            $5,  $6,  $7,  $8,
            $9,  $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18,
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
            updated_at       = NOW()
         WHERE drive_id = $17
         RETURNING *`,
        [
            name || null, description || null,
            venue_name || null, venue_type || null,
            building || null, floor_room || null,
            street_address || null, city || null,
            province || null, postal_code || null,
            slots_available || null, contact_person || null,
            contact_number || null, contact_email || null,
            start_datetime || null, end_datetime || null,
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
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
};