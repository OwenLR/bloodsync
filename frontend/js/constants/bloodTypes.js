/**
 * bloodTypes.js — Blood type and component constants.
 * Mirrors backend/constants/bloodTypes.js and NEAR_EXPIRY_DAYS keys.
 */

export const BLOOD_TYPES = Object.freeze([
  'A+', 'A-',
  'B+', 'B-',
  'AB+', 'AB-',
  'O+', 'O-',
]);

export const COMPONENTS = Object.freeze([
  'Whole Blood',
  'Packed Red Blood Cells',
  'Platelets',
  'Fresh Frozen Plasma',
]);