/**
 * screeningService.js — Screening creation business logic.
 *
 * Enforces:
 * - Interview must have Passed before screening is allowed
 * - No duplicate screening per interview
 * - Cross-drive ownership: Volunteers/Phlebotomists can only screen
 *   donors from their own assigned blood drive
 *
 * Auto-fills donor_id, branch_id, drive_id from interview record.
 */

const screeningModel      = require('../repositories/screeningModel');
const donorInterviewModel = require('../repositories/donorInterviewModel');
const donorModel          = require('../repositories/donorModel');
const BusinessError       = require('../../utils/businessError');
const ROLES               = require('../../constants/roles');

const FIELD_ROLES = [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST];

/**
 * Create a screening record.
 *
 * @param {object} data    - Validated screening fields (interview_id required)
 * @param {number} user_id - From JWT (screened_by)
 * @param {object} reqUser - Full { user_id, role_id, branch_id } from JWT
 * @param {number|null} reqDriveId - Active drive_id from bloodDriveMiddleware
 */
const createScreening = async (data, user_id, reqUser, reqDriveId) => {
    const { interview_id } = data;

    const interview = await donorInterviewModel.getInterviewById(interview_id);
    if (!interview) throw new BusinessError('Interview session not found', 404);

    if (interview.interview_result !== 'Passed') {
        throw new BusinessError(
            interview.interview_result === 'Failed'
                ? 'Cannot create screening — donor did not pass the interview'
                : 'Cannot create screening — interview answers not yet submitted',
            400
        );
    }

    // Cross-drive ownership check:
    // Volunteers and Phlebotomists can only act on interviews from their drive.
    // Admin and PRC Staff are exempt — they operate independently.
    if (FIELD_ROLES.includes(reqUser.role_id)) {
        if (interview.drive_id !== reqDriveId) {
            throw new BusinessError(
                'You can only screen donors from your assigned blood drive',
                403
            );
        }
    }

    const existing = await screeningModel.getScreeningByInterviewId(interview_id);
    if (existing) {
        throw new BusinessError(
            'Screening already exists for this interview session',
            400
        );
    }

    const screening = await screeningModel.createScreening({
        ...data,
        donor_id:    interview.donor_id,
        branch_id:   interview.branch_id,
        screened_by: user_id,
        drive_id:    interview.drive_id || null,
    });

    // Screening is the authoritative point where blood type is confirmed —
    // sync it onto the donor record so every other page (donation, unit
    // records, donor search/dropdowns) reflects the real value instead of
    // whatever was (optionally, often blank) entered at registration.
    if (screening.blood_type_confirmed) {
        await donorModel.updateDonor(interview.donor_id, {
            blood_type: screening.blood_type_confirmed,
        });
    }

    return screening;
};

const updateScreening = async (id, data) => {
    const screening = await screeningModel.getScreeningById(id);
    if (!screening) throw new BusinessError('Screening not found', 404);

    return screeningModel.updateScreening(id, data);
};

module.exports = {
    createScreening,
    updateScreening,
};