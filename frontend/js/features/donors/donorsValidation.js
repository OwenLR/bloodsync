/**
 * Validates donor create/edit form data.
 * Returns { valid: boolean, errors: { field: message } }
 */
export function validateDonorForm(data, { requireAll = true } = {}) {
  const errors = {};

  // first_name
  if (requireAll || data.first_name !== undefined) {
    if (!data.first_name || !data.first_name.trim()) {
      errors.first_name = 'First name is required.';
    }
  }

  // last_name
  if (requireAll || data.last_name !== undefined) {
    if (!data.last_name || !data.last_name.trim()) {
      errors.last_name = 'Last name is required.';
    }
  }

  // birthdate — required, YYYY-MM-DD, not in the future
  if (requireAll || data.birthdate !== undefined) {
    if (!data.birthdate) {
      errors.birthdate = 'Birthdate is required.';
    } else {
      const date = new Date(data.birthdate);
      if (isNaN(date.getTime())) {
        errors.birthdate = 'Enter a valid date (YYYY-MM-DD).';
      } else if (date > new Date()) {
        errors.birthdate = 'Birthdate cannot be in the future.';
      }
    }
  }

  // sex
  if (requireAll || data.sex !== undefined) {
    if (!data.sex || !['Male', 'Female'].includes(data.sex)) {
      errors.sex = 'Select a valid sex (Male or Female).';
    }
  }

  // email — required per backend rules
  if (requireAll || data.email !== undefined) {
    if (!data.email || !data.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
  }

  // blood_type — optional but must be valid if provided
  const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (data.blood_type && !VALID_BLOOD_TYPES.includes(data.blood_type)) {
    errors.blood_type = 'Select a valid blood type.';
  }

  // contact — optional but must be digits only, 7–15 chars if provided
  if (data.contact && data.contact.trim()) {
    const digits = data.contact.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.contact = 'Contact number must be 7–15 digits.';
    }
  }

  return {
    valid:  Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates the search query — must be non-empty and at least 2 characters.
 * Returns { valid: boolean, message: string }
 */
export function validateSearchQuery(query) {
  if (!query || !query.trim()) {
    return { valid: false, message: 'Enter a name or ID number to search.' };
  }
  if (query.trim().length < 2) {
    return { valid: false, message: 'Enter at least 2 characters to search.' };
  }
  return { valid: true, message: '' };
}