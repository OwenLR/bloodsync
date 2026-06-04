const VALID_SEX = ['Male', 'Female'];

const validateRegistration = (data) => {
    const errors = [];
    const {
        first_name, last_name, email, password,
        sex, contact, birthdate,
        zip_code, id_number,
        emergency_contact_phone
    } = data;

    // Required fields
    if (!first_name || first_name.trim() === '') errors.push('first_name is required');
    if (!last_name || last_name.trim() === '') errors.push('last_name is required');

    if (!email || email.trim() === '') {
        errors.push('email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('email is invalid');
    }

    if (!password || password.trim() === '') {
        errors.push('password is required');
    } else if (password.length < 8) {
        errors.push('password must be at least 8 characters');
    }

    // Optional fields — only validate if provided
    if (sex && !VALID_SEX.includes(sex)) {
        errors.push(`sex must be one of: ${VALID_SEX.join(', ')}`);
    }

    if (contact && !/^\d{7,15}$/.test(contact)) {
        errors.push('contact must be numbers only, 7 to 15 digits');
    }

    if (birthdate) {
        const date = new Date(birthdate);
        if (isNaN(date.getTime())) {
            errors.push('birthdate is invalid, use YYYY-MM-DD format');
        } else if (date > new Date()) {
            errors.push('birthdate cannot be in the future');
        }
    }

    if (zip_code && !/^\d{4,10}$/.test(zip_code)) {
        errors.push('zip_code must be numbers only, 4 to 10 digits');
    }

    if (id_number && id_number.trim().length < 3) {
        errors.push('id_number is too short');
    }

    if (emergency_contact_phone && !/^\d{7,15}$/.test(emergency_contact_phone)) {
        errors.push('emergency_contact_phone must be numbers only, 7 to 15 digits');
    }

    return errors;
};

module.exports = { validateRegistration };