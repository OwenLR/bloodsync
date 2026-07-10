/**
 * donorInterviewValidator.js — Technical input validation for donor-interview creation.
 *
 * branch_id is intentionally NOT validated here — it is never accepted from
 * the client. donorInterviewController.createInterview resolves it server-side
 * from the active drive (Volunteer/Phlebotomist) or the user's own JWT
 * branch_id (Admin/PRC Staff walk-in). See that controller for details.
 */
const validateCreateInterview = (data) => {
    const errors = [];
    const { donor_id } = data;

    if (!donor_id) errors.push('donor_id is required');

    if (donor_id && (isNaN(donor_id) || Number(donor_id) < 1)) {
        errors.push('donor_id must be a positive integer');
    }

    return errors;
};

module.exports = { validateCreateInterview };