// constants/inventoryRules.js

const LOW_STOCK_THRESHOLD = 5;

const NEAR_EXPIRY_DAYS = {
  'Whole Blood': 7,
  'Packed Red Blood Cells': 7,
  'Platelets': 2,
  'Fresh Frozen Plasma': 30,
};

// Fixed whole blood donation volume — standard single-donation protocol.
// donorDonation.js locks the Whole Blood collection form's volume_ml input
// to this exact value (non-editable) at donation time.
const WHOLE_BLOOD_VOLUME_ML = 450;

// Fixed volumes assigned to each of the 3 components produced when a Whole
// Blood unit is separated (POST /api/blood-units/:id/separate). These are
// intentionally fixed amounts, not a computed ratio of the source unit's
// own volume_ml — every Whole Blood unit is itself a fixed 450 mL (see
// WHOLE_BLOOD_VOLUME_ML above), so a fixed split is equivalent to a ratio
// split here. Values below MUST sum to WHOLE_BLOOD_VOLUME_ML (450) — keep
// both in sync if either ever changes.
const SEPARATION_VOLUME_ML = {
  'Packed Red Blood Cells': 250,
  'Fresh Frozen Plasma':    150,
  'Platelets':               50,
};

module.exports = {
  LOW_STOCK_THRESHOLD,
  NEAR_EXPIRY_DAYS,
  WHOLE_BLOOD_VOLUME_ML,
  SEPARATION_VOLUME_ML,
};