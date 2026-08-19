// check-inventory.js
// Read-only — makes no changes. Shows current blood_units status counts
// for O+ Whole Blood at branch_id=1 (Lipa), the exact combo PT07-09/16-21
// hammer on every run, so you can tell at a glance whether a run of 400s
// is inventory exhaustion vs an actual bug.
//
// Usage: node check-inventory.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    const { rows } = await pool.query(
        `SELECT status, COUNT(*) AS count
         FROM blood_units
         WHERE branch_id = 1
         AND blood_type = 'O+'
         AND component = 'Whole Blood'
         GROUP BY status
         ORDER BY status`
    );

    console.log('\nO+ Whole Blood @ branch_id=1 (Lipa):');
    if (rows.length === 0) {
        console.log('  No units found at all for this blood_type/component/branch combo.');
    } else {
        rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));
    }

    const available = rows.find(r => r.status === 'Available');
    const availableCount = available ? parseInt(available.count, 10) : 0;

    console.log(`\nAvailable right now: ${availableCount}`);
    console.log('PT07-09 arrivalRates: Low=10, Average=25, Peak=50 concurrent submissions.');
    console.log('PT19-21 approval tests need at least this many O+ Whole Blood units');
    console.log('AVAILABLE at the moment they run, or approvals will 400 on insufficient stock.');

    await pool.end();
}

main().catch((err) => {
    console.error('Check failed:', err.message);
    process.exit(1);
});
