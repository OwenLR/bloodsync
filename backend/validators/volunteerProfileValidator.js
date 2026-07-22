/**
 * volunteerProfileValidator.js — Technical input validation for
 * volunteer and phlebotomist self-profile updates.
 *
 * Identity fields are locked server-side here — not just on the frontend.
 * Locked: first_name, last_name, birthdate, sex.
 * Everything else (address, contact, emergency contact, etc.) is updatable.
 *
 * CHANGED this session: the "at least one field" empty-body check moved
 * OUT of this function and into volunteerProfileController.js's
 * updateMyProfile(), which can also see req.file — a photo-only update
 * legitimately has an empty req.body and is not an error. This function
 * now only validates whatever body fields ARE present; an empty body
 * with no field-level rules to check simply returns no errors, and the
 * controller has already ensured empty-body-AND-no-file was rejected
 * before this ever runs.
 */

const LOCKED_FIELDS = ['first_name', 'last_name', 'birthdate', 'sex'];

const validateUpdateVolunteerProfile = (data) => {
    const errors = [];

    // Reject identity fields — must contact admin to change these
    for (const field of LOCKED_FIELDS) {
        if (data[field] !== undefined) {
            errors.push(
                `${field} cannot be updated through this endpoint — ` +
                `contact an administrator to change identity information`
            );
        }
    }

    // Optional field validation — only if provided
    if (data.contact && !/^\d{7,15}$/.test(data.contact)) {
        errors.push('contact must be numbers only, 7 to 15 digits');
    }

    if (data.zip_code && !/^\d{4,10}$/.test(data.zip_code)) {
        errors.push('zip_code must be numbers only, 4 to 10 digits');
    }

    if (
        data.emergency_contact_phone &&
        !/^\d{7,15}$/.test(data.emergency_contact_phone)
    ) {
        errors.push(
            'emergency_contact_phone must be numbers only, 7 to 15 digits'
        );
    }

    return errors;
};

module.exports = { validateUpdateVolunteerProfile };