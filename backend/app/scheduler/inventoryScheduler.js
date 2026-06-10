// app/scheduler/inventoryScheduler.js

const cron = require('node-cron');
const inventoryCheckService = require('../services/inventoryCheckService');

function startScheduler() {
  // 8AM PHT daily = 0AM UTC (Railway runs UTC)
  cron.schedule('0 0 * * *', async () => {
    try {
      await inventoryCheckService.runDailyCheck();
    } catch (error) {
      console.error('Inventory check failed:', error);
    }
  });
}

module.exports = { startScheduler };