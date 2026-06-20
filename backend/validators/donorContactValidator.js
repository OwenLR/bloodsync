const validator = require('validator');

/**
 * validateUpdateDonorContact — used by PATCH /api/donors/:id/contact only.
 *
 * Deliberately narrower than validateUpdateDonor (donorValidator.js).
 * This endpoint is for Volunteer/Phlebotomist self-service correction of a
 * donor's email/contact (e.g. the donor no longer uses their old number,
 * and accurate contact info matters because post-extraction confirmation
 * emails are sent automatically — see donationService/emailService).
 *
 * Only email and contact are accepted. Any other field present in the body
 * (blood_type, sex, birthdate, first_name, etc.) is rejected outright —
 * this is intentional, not an oversight. Volunteer/Phlebotomist must NOT
 * be able to widen this into a full donor edit by sending extra fields.
 */

const ALLOWED_FIELDS = ['email', 'contact'];

const validateUpdateDonorContact = (data) => {
    const errors = [];
    const { email, contact } = data;

    const extraFields = Object.keys(data).filter(
        (key) => !ALLOWED_FIELDS.includes(key)
    );
    if (extraFields.length > 0) {
        errors.push(`Only email and contact can be updated here. Not allowed: ${extraFields.join(', ')}`);
    }

    if (email === undefined && contact === undefined) {
        errors.push('At least one of email or contact is required');
    }

    if (email !== undefined && !validator.isEmail(email)) {
        errors.push('Invalid email format');
    }

    if (contact !== undefined && !/^\d{7,15}$/.test(contact)) {
        errors.push('contact must be numbers only, 7 to 15 digits');
    }

    return errors;
};

module.exports = {
    validateUpdateDonorContact,
};