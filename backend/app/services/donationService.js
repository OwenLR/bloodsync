/**
 * donationService.js — Donation creation business logic.
 *
 * Enforces:
 * - Screening must be Eligible
 * - Hemoglobin within thresholds (via domain)
 * - No active deferral
 * - Cross-drive ownership: Volunteers/Phlebotomists can only record
 *   donations for donors from their own assigned blood drive
 *
 * Auto-fills donor_id, branch_id, drive_id from screening record.
 */

const donationModel  = require('../repositories/donationModel');
const screeningModel = require('../repositories/screeningModel');
const donorModel     = require('../repositories/donorModel');
const deferralModel  = require('../repositories/deferralModel');
const BusinessError  = require('../../utils/businessError');
const { checkHemoglobinEligibility } = require('../domain/donorEligibility');
const ROLES = require('../../constants/roles');

const FIELD_ROLES = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

/**
 * Create a donation record after passing all eligibility checks.
 *
 * @param {object} data      - { screening_id, reaction_notes?, blood_volume_ml? }
 * @param {number} user_id   - From JWT (extracted_by)
 * @param {object} reqUser   - Full { user_id, role_id, branch_id } from JWT
 * @param {number|null} reqDriveId - Active drive_id from bloodDriveMiddleware
 */
const createDonation = async (data, user_id, reqUser, reqDriveId) => {
    const { screening_id, reaction_notes, blood_volume_ml } = data;

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

    // Cross-drive ownership check
    if (FIELD_ROLES.includes(reqUser.role_id)) {
        if (screening.drive_id !== reqDriveId) {
            throw new BusinessError(
                'You can only record donations for donors from your assigned blood drive',
                403
            );
        }
    }

    const donor = await donorModel.getDonorById(screening.donor_id);
    if (!donor) throw new BusinessError('Donor not found', 404);

    // Domain rule — throws plain Error, wrap as BusinessError
    try {
        checkHemoglobinEligibility(screening.hemoglobin, donor.sex);
    } catch (err) {
        throw new BusinessError(err.message, 400);
    }

    const activeDeferral = await deferralModel.checkActiveDeferral(screening.donor_id);
    if (activeDeferral) {
        throw new BusinessError('Donor has an active deferral and cannot donate', 400);
    }

    const donation = await donationModel.createDonation({
        donor_id:        screening.donor_id,
        screening_id,
        branch_id:       screening.branch_id,
        extracted_by:    user_id,
        blood_volume_ml: blood_volume_ml || 450,
        reaction_notes:  reaction_notes || null,
        is_qns:          false,
        drive_id:        screening.drive_id || null,
    });

    return donation;
};

module.exports = { createDonation };