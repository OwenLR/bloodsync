// Client-side validation for blood drive forms.
// Returns { valid: true } or { valid: false, message: '...' }

const VENUE_TYPES = ['School', 'Hospital', 'Community Center', 'Church', 'Government', 'Other'];

export function validateDriveForm(fields) {
  const {
    name,
    branch_id,
    start_datetime,
    end_datetime,
    slots_available,
    contact_number,
    contact_email,
    postal_code,
    venue_type,
  } = fields;

  if (!name || !name.trim()) {
    return { valid: false, field: 'name', message: 'Drive name is required.' };
  }

  if (!branch_id) {
    return { valid: false, field: 'branch_id', message: 'Branch is required.' };
  }

  if (!start_datetime) {
    return { valid: false, field: 'start_datetime', message: 'Start date and time is required.' };
  }

  if (!end_datetime) {
    return { valid: false, field: 'end_datetime', message: 'End date and time is required.' };
  }

  const start = new Date(start_datetime);
  const end = new Date(end_datetime);

  if (isNaN(start.getTime())) {
    return { valid: false, field: 'start_datetime', message: 'Start date and time is not valid.' };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, field: 'end_datetime', message: 'End date and time is not valid.' };
  }

  if (end <= start) {
    return { valid: false, field: 'end_datetime', message: 'End date and time must be after the start.' };
  }

  if (slots_available !== '' && slots_available !== undefined && slots_available !== null) {
    const slots = Number(slots_available);
    if (!Number.isInteger(slots) || slots < 1) {
      return { valid: false, field: 'slots_available', message: 'Slots available must be a whole number of at least 1.' };
    }
  }

  if (venue_type && !VENUE_TYPES.includes(venue_type)) {
    return { valid: false, field: 'venue_type', message: 'Please select a valid venue type.' };
  }

  if (contact_number && contact_number.trim()) {
    const digits = contact_number.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return { valid: false, field: 'contact_number', message: 'Contact number must be 7 to 15 digits.' };
    }
  }

  if (contact_email && contact_email.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(contact_email.trim())) {
      return { valid: false, field: 'contact_email', message: 'Contact email is not a valid email address.' };
    }
  }

  if (postal_code && postal_code.trim()) {
    const digits = postal_code.replace(/\D/g, '');
    if (digits.length < 4 || digits.length > 10) {
      return { valid: false, field: 'postal_code', message: 'Postal code must be 4 to 10 digits.' };
    }
  }

  return { valid: true };
}

export function validateCancelForm(fields) {
  const { cancellation_reason } = fields;

  if (!cancellation_reason || !cancellation_reason.trim()) {
    return { valid: false, field: 'cancellation_reason', message: 'A cancellation reason is required.' };
  }

  return { valid: true };
}