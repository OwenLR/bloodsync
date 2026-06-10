// constants/inventoryRules.js

const LOW_STOCK_THRESHOLD = 5;

const NEAR_EXPIRY_DAYS = {
  'Whole Blood': 7,
  'Packed Red Blood Cells': 7,
  'Platelets': 2,
  'Fresh Frozen Plasma': 30,
};

module.exports = { LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS };