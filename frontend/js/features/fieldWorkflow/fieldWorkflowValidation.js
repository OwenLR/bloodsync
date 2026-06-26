/**
 * fieldWorkflowValidation.js
 *
 * Client-side input validation for all five field workflow steps.
 * No API calls, no DOM manipulation here.
 *
 * Each function returns { valid: boolean, errors: { field: message } }
 */

const VALID_BLOOD_TYPES  = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_COMPONENTS   = ['Whole Blood', 'Packed Red Blood Cells', 'Platelets', 'Fresh Frozen Plasma'];
const VALID_SEX          = ['Male', 'Female'];

// ─── Step 1: Donor Registration ───────────────────────────────────────────────

/**
 * Validate new donor registration form.
 * All required fields must be present.
 */
export function validateDonorRegistration(data) {
  const errors = {};

  if (!data.first_name || !data.first_name.trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!data.last_name || !data.last_name.trim()) {
    errors.last_name = 'Last name is required.';
  }

  if (!data.birthdate) {
    errors.birthdate = 'Birthdate is required.';
  } else {
    const d     = new Date(data.birthdate);
    const today = new Date();
    if (isNaN(d.getTime())) {
      errors.birthdate = 'Enter a valid date.';
    } else if (d > today) {
      errors.birthdate = 'Birthdate cannot be in the future.';
    } else {
      const minAge = new Date(today);
      minAge.setFullYear(minAge.getFullYear() - 18);
      if (d > minAge) {
        errors.birthdate = 'Donor must be at least 18 years old.';
      }
    }
  }

  if (!data.sex || !VALID_SEX.includes(data.sex)) {
    errors.sex = 'Select Male or Female.';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required for post-donation notifications.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (data.blood_type && !VALID_BLOOD_TYPES.includes(data.blood_type)) {
    errors.blood_type = 'Select a valid blood type.';
  }

  if (data.contact && data.contact.trim()) {
    const digits = data.contact.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.contact = 'Contact number must be 7 to 15 digits.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate contact-only update (email and/or contact — at least one required).
 */
export function validateContactUpdate(data) {
  const errors = {};

  if (!data.email && !data.contact) {
    errors.general = 'Provide an updated email or contact number.';
    return { valid: false, errors };
  }

  if (data.email !== undefined && data.email !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
  }

  if (data.contact !== undefined && data.contact !== '') {
    const digits = data.contact.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.contact = 'Contact number must be 7 to 15 digits.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate search query — at least 2 characters.
 */
export function validateSearchQuery(query) {
  if (!query || !query.trim()) {
    return { valid: false, message: 'Enter a name or ID number to search.' };
  }
  if (query.trim().length < 2) {
    return { valid: false, message: 'Enter at least 2 characters.' };
  }
  return { valid: true, message: '' };
}

// ─── Step 2: Interview ────────────────────────────────────────────────────────

/**
 * Validate interview creation.
 * donor_id and branch_id are required. drive_id is set by middleware.
 */
export function validateInterview(data) {
  const errors = {};

  if (!data.donor_id) {
    errors.donor_id = 'Select a donor to continue.';
  }

  if (!data.branch_id) {
    errors.branch_id = 'Branch is required.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate interview answers.
 * All questions must be answered with exactly "YES" or "NO".
 */
export function validateAnswers(answers) {
  const errors = {};

  if (!answers || answers.length === 0) {
    errors.general = 'All questions must be answered before submitting.';
    return { valid: false, errors };
  }

  answers.forEach((a, i) => {
    if (a.answer !== 'YES' && a.answer !== 'NO') {
      errors[`question_${i}`] = `Question ${i + 1} must be answered.`;
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Step 3: Screening ────────────────────────────────────────────────────────

/**
 * Validate screening form.
 */
export function validateScreening(data) {
  const errors = {};

  if (!data.interview_id) {
    errors.interview_id = 'Select a donor with a completed interview.';
  }

  if (data.hemoglobin === undefined || data.hemoglobin === '') {
    errors.hemoglobin = 'Hemoglobin level is required.';
  } else {
    const val = parseFloat(data.hemoglobin);
    if (isNaN(val) || val < 5 || val > 25) {
      errors.hemoglobin = 'Enter a valid hemoglobin level (5 to 25 g/dL).';
    }
  }

  // screening_result is auto-computed by the UI from hemoglobin + donor sex.
  // Only validate that the computed value is one of the two accepted strings.
  if (data.screening_result && !['Eligible', 'Deferred'].includes(data.screening_result)) {
    errors.screening_result = 'Invalid screening result.';
  }

  // blood_type_confirmed is required at screening — this is where blood type
  // is confirmed for the record.
  if (!data.blood_type_confirmed || !VALID_BLOOD_TYPES.includes(data.blood_type_confirmed)) {
    errors.blood_type_confirmed = 'Blood type confirmation is required.';
  }

  if (data.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(data.blood_pressure.trim())) {
    errors.blood_pressure = 'Enter blood pressure in NNN/NN format (e.g. 120/80).';
  }

  if (data.pulse_rate !== undefined && data.pulse_rate !== '') {
    const val = parseInt(data.pulse_rate, 10);
    if (isNaN(val) || val < 30 || val > 200) {
      errors.pulse_rate = 'Enter a valid pulse rate (30 to 200 bpm).';
    }
  }

  if (data.weight !== undefined && data.weight !== '') {
    const val = parseFloat(data.weight);
    if (isNaN(val) || val < 20 || val > 300) {
      errors.weight = 'Enter a valid weight (20 to 300 kg).';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Step 4: Donation ─────────────────────────────────────────────────────────

/**
 * Validate donation form.
 * extraction_time in minutes — backend flags > 15 min as QNS automatically.
 */
export function validateDonation(data) {
  const errors = {};

  if (!data.screening_id) {
    errors.screening_id = 'Select a donor with an Eligible screening.';
  }

  if (data.extraction_time === undefined || data.extraction_time === '') {
    errors.extraction_time = 'Extraction time is required.';
  } else {
    const val = parseInt(data.extraction_time, 10);
    if (isNaN(val) || val < 1 || val > 120) {
      errors.extraction_time = 'Enter extraction time in minutes (1 to 120).';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Step 5: Blood Collection ─────────────────────────────────────────────────

/**
 * Validate blood collection form.
 */
export function validateCollection(data) {
  const errors = {};

  if (!data.donation_id) {
    errors.donation_id = 'Select a donor with a completed donation.';
  }

  if (!data.blood_type || !VALID_BLOOD_TYPES.includes(data.blood_type)) {
    errors.blood_type = 'Select a valid blood type.';
  }

  if (!data.component || !VALID_COMPONENTS.includes(data.component)) {
    errors.component = 'Select a valid blood component.';
  }

  if (data.volume_ml === undefined || data.volume_ml === '') {
    errors.volume_ml = 'Volume is required.';
  } else {
    const val = parseInt(data.volume_ml, 10);
    if (isNaN(val) || val < 50 || val > 600) {
      errors.volume_ml = 'Enter a valid volume (50 to 600 mL).';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}