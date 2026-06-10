// app/services/inventoryCheckService.js

const pool = require('../../config/db');
const { isLowStock, isNearExpiry } = require('../domain/inventoryRulesDomain');
const notificationService = require('./notificationService');

async function checkLowStock() {
  const result = await pool.query(
    `SELECT bu.branch_id, b.branch_name, bu.blood_type, bu.component,
            COUNT(*) AS count
     FROM blood_units bu
     JOIN branches b ON b.branch_id = bu.branch_id
     WHERE bu.status = 'Available'
     GROUP BY bu.branch_id, b.branch_name, bu.blood_type, bu.component`
  );

  const lowByBranch = {};

  for (const row of result.rows) {
    if (isLowStock(parseInt(row.count))) {
      const key = row.branch_id;
      if (!lowByBranch[key]) {
        lowByBranch[key] = { branch_id: row.branch_id, branch_name: row.branch_name, items: [] };
      }
      lowByBranch[key].items.push({
        blood_type: row.blood_type,
        component: row.component,
        count: parseInt(row.count),
      });
    }
  }

  for (const entry of Object.values(lowByBranch)) {
    await notificationService.notifyInventoryLow(entry.branch_id, entry.branch_name, entry.items);
  }
}

async function checkNearExpiry() {
  const result = await pool.query(
    `SELECT bu.unit_id, bu.branch_id, b.branch_name, bu.blood_type,
            bu.component, bu.expiration_date
     FROM blood_units bu
     JOIN branches b ON b.branch_id = bu.branch_id
     WHERE bu.status = 'Available'`
  );

  const expiringByBranch = {};

  for (const row of result.rows) {
    if (isNearExpiry(row.expiration_date, row.component)) {
      const key = row.branch_id;
      if (!expiringByBranch[key]) {
        expiringByBranch[key] = { branch_id: row.branch_id, branch_name: row.branch_name, items: [] };
      }

      const expiry = new Date(row.expiration_date);
      const now = new Date();
      const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      expiringByBranch[key].items.push({
        blood_type: row.blood_type,
        component: row.component,
        expiration_date: expiry.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }),
        days_remaining: daysRemaining,
      });
    }
  }

  for (const entry of Object.values(expiringByBranch)) {
    await notificationService.notifyInventoryExpiring(entry.branch_id, entry.branch_name, entry.items);
  }
}

async function runDailyCheck() {
  await checkLowStock();
  await checkNearExpiry();
}

module.exports = { checkLowStock, checkNearExpiry, runDailyCheck };