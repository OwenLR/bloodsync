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

// Fixed whole blood donation volume — mirrors backend's
// WHOLE_BLOOD_VOLUME_ML in constants/inventoryRulesConstant.js.
// donorDonation.js locks the collection form's volume_ml field to this value.
export const WHOLE_BLOOD_VOLUME_ML = 450;

// Fixed volumes assigned to each of the 3 components produced when a Whole
// Blood unit is separated — mirrors backend's SEPARATION_VOLUME_ML in
// constants/inventoryRulesConstant.js. Values must sum to
// WHOLE_BLOOD_VOLUME_ML (450) — keep both files in sync if either changes.
// Not currently sent by the frontend (separation has no request body — see
// contract.md), but useful for display, e.g. showing expected split volumes
// before/after a separation action.
export const SEPARATION_VOLUME_ML = Object.freeze({
  'Packed Red Blood Cells': 250,
  'Fresh Frozen Plasma':    150,
  'Platelets':               50,
});