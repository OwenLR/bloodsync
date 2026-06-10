// app/domain/inventoryRulesDomain.js

const { LOW_STOCK_THRESHOLD, NEAR_EXPIRY_DAYS } = require('../../constants/inventoryRulesConstant');

function isLowStock(count) {
  return count <= LOW_STOCK_THRESHOLD;
}

function isNearExpiry(expirationDate, component) {
  const thresholdDays = NEAR_EXPIRY_DAYS[component];
  if (thresholdDays === undefined) return false;

  const now = new Date();
  const expiry = new Date(expirationDate);
  const diffMs = expiry - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= thresholdDays;
}

module.exports = { isLowStock, isNearExpiry };