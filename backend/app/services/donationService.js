/**
 * donationService.js — Donation creation business logic.
 *
 * Enforces:
 * - Screening must be Eligible
 * - Hemoglobin within thresholds (via domain)
 * - No active deferral
 * - Cross-drive ownership: Volunteers/Phlebotomists can only record
 *   donations for donors from their own assigned blood drive
 * - phlebotomist_id (optional): if provided, must be a user with role_id 6
 *   assigned to the same drive. For Admin/Staff walk-ins (drive_id = null),
 *   any phlebotomist_id is accepted without drive-assignment check.
 *
 * Auto-fills donor_id, branch_id, drive_id from screening record.
 */

const pool            = require('../../config/db');
const donationModel   = require('../repositories/donationModel');
const screeningModel  = require('../repositories/screeningModel');
const donorModel      = require('../repositories/donorModel');
const deferralModel   = require('../repositories/deferralModel');
const BusinessError   = require('../../utils/businessError');
const { checkHemoglobinEligibility } = require('../domain/donorEligibility');
const ROLES = require('../../constants/roles');

const FIELD_ROLES = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

/**
 * Create a donation record after passing all eligibility checks.
 *
 * @param {object} data       - { screening_id, phlebotomist_id?, reaction_notes?, blood_volume_ml?, extraction_time? }
 * @param {number} user_id    - From JWT (extracted_by — the submitter)
 * @param {object} reqUser    - Full { user_id, role_id, branch_id } from JWT
 * @param {number|null} reqDriveId - Active drive_id from bloodDriveMiddleware
 */
const createDonation = async (data, user_id, reqUser, reqDriveId) => {
    const {
        screening_id,
        phlebotomist_id,
        reaction_notes,
        blood_volume_ml,
        extraction_time,
    } = data;

    // ── Screening validation ──────────────────────────────────────────────────
    const screening = await screeningModel.getScreeningById(screening_id);
    if (!screening) throw new BusinessError('Screening record not found', 404);

    if (screening.screening_result !== 'Eligible') {
        throw new BusinessError(
            screening.screening_result
                ? `Cannot create donation — donor screening result is ${screening.screening_result}`
                : 'Cannot create donation — screening result not yet determined',
            400
        );
    }

    // ── Cross-drive ownership (field roles only) ──────────────────────────────
    if (FIELD_ROLES.includes(reqUser.role_id)) {
        if (screening.drive_id !== reqDriveId) {
            throw new BusinessError(
                'You can only record donations for donors from your assigned blood drive',
                403
            );
        }
    }

    // ── Donor checks ──────────────────────────────────────────────────────────
    const donor = await donorModel.getDonorById(screening.donor_id);
    if (!donor) throw new BusinessError('Donor not found', 404);

    if (!donor.email) {
        throw new BusinessError(
            'Donor has no email on record. Please update contact info before recording a donation.',
            400
        );
    }

    try {
        checkHemoglobinEligibility(screening.hemoglobin, donor.sex);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    const activeDeferral = await deferralModel.checkActiveDeferral(screening.donor_id);
    if (activeDeferral) {
        throw new BusinessError('Donor has an active deferral and cannot donate', 400);
    }

    // ── Phlebotomist validation (optional field) ──────────────────────────────
    let resolvedPhlebotomistId = null;

    if (phlebotomist_id) {
        const pid = parseInt(phlebotomist_id, 10);
        if (isNaN(pid)) {
            throw new BusinessError('Invalid phlebotomist_id — must be a number', 400);
        }

        if (reqDriveId) {
            // Field roles: verify the phlebotomist is assigned to this drive
            const participantResult = await pool.query(
                `SELECT bdp.user_id
                 FROM blood_drive_participants bdp
                 JOIN users u ON bdp.user_id = u.user_id
                 WHERE bdp.drive_id = $1
                   AND bdp.user_id  = $2
                   AND u.role_id    = $3
                   AND bdp.assignment_status IN ('Assigned', 'Confirmed')`,
                [reqDriveId, pid, ROLES.PHLEBOTOMIST]
            );

            if (participantResult.rows.length === 0) {
                throw new BusinessError(
                    'The selected phlebotomist is not assigned to this blood drive',
                    400
                );
            }
        }
        // Admin/Staff walk-ins (reqDriveId = null): accept without drive check

        resolvedPhlebotomistId = pid;
    }

    // ── QNS detection ─────────────────────────────────────────────────────────
    const extractionMinutes = extraction_time ? parseInt(extraction_time, 10) : null;
    const isQns = extractionMinutes !== null && extractionMinutes > 15;

    // ── Create record ─────────────────────────────────────────────────────────
    const donation = await donationModel.createDonation({
        donor_id:                screening.donor_id,
        screening_id,
        branch_id:               screening.branch_id,
        extracted_by:            user_id,
        phlebotomist_id:         resolvedPhlebotomistId,
        blood_volume_ml:         blood_volume_ml || 450,
        extraction_time_minutes: extractionMinutes,
        reaction_notes:          reaction_notes || null,
        is_qns:                  isQns,
        qns_reason:              isQns
            ? `Extraction time ${extractionMinutes} min exceeded 15 min threshold`
            : null,
        drive_id:                screening.drive_id || null,
    });

    return donation;
};

module.exports = { createDonation };