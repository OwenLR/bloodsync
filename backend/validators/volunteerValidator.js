const VALID_ROLES = [5, 6]; // 5 = Volunteer, 6 = Phlebotomist

const validateVolunteerRegister = (data) => {
    const errors = [];
    const { first_name, last_name, email, password } = data;

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

    return errors;
};

module.exports = { validateVolunteerRegister };