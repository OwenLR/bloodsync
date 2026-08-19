// cleanup-test-data.js
// Removes ONLY blood_requests created by the Artillery PT07-24 test suite
// (identified by patient_name = 'Load Test Patient' — the fixed marker
// every pt*.yml config uses). Never touches real requestor data.
//
// Also reverts any blood_units that PT19-21's approval step reserved via
// FEFO auto-assignment (approveRequest in bloodRequestService.js) back to
// 'Available' — otherwise test runs silently eat real inventory.
//
// Usage:
//   node cleanup-test-data.js            → dry run, lists what WOULD be deleted
//   node cleanup-test-data.js --confirm  → actually deletes
//
// Requires DATABASE_URL in .env (same as the rest of the backend).

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { Pool } = require('pg');

const MARKER = 'Load Test Patient';
const isConfirmed = process.argv.includes('--confirm');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

async function main() {
    const client = await pool.connect();

    try {
        const { rows: requests } = await client.query(
            `SELECT request_id, status, created_at
             FROM blood_requests
             WHERE patient_name = $1
             ORDER BY created_at ASC`,
            [MARKER]
        );

        if (requests.length === 0) {
            console.log('No test data found (patient_name = "Load Test Patient"). Nothing to clean.');
            return;
        }

        const requestIds = requests.map(r => r.request_id);

        const { rows: reservations } = await client.query(
            `SELECT reservation_id, unit_id FROM reservations WHERE request_id = ANY($1::int[])`,
            [requestIds]
        );

        const statusCounts = requests.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});

        console.log(`Found ${requests.length} test request(s):`, statusCounts);
        console.log(`Found ${reservations.length} reservation(s) on those requests (will revert units to Available).`);

        if (!isConfirmed) {
            console.log('\nDry run only — no changes made.');
            console.log('Re-run with --confirm to actually delete:');
            console.log('  node cleanup-test-data.js --confirm');
            return;
        }

        await client.query('BEGIN');

        // Revert reserved units back to Available — only units still
        // 'Reserved' are touched, so a unit that's since moved further
        // in its own lifecycle for an unrelated reason isn't clobbered.
        if (reservations.length > 0) {
            const unitIds = reservations.map(r => r.unit_id).filter(Boolean);
            if (unitIds.length > 0) {
                const result = await client.query(
                    `UPDATE blood_units
                     SET status = 'Available'
                     WHERE unit_id = ANY($1::int[])
                     AND status = 'Reserved'
                     RETURNING unit_id`,
                    [unitIds]
                );
                console.log(`Reverted ${result.rowCount} blood unit(s) to Available.`);
            }
        }

        const delReservations = await client.query(
            `DELETE FROM reservations WHERE request_id = ANY($1::int[])`,
            [requestIds]
        );
        const delLogs = await client.query(
            `DELETE FROM request_status_logs WHERE request_id = ANY($1::int[])`,
            [requestIds]
        );
        const delItems = await client.query(
            `DELETE FROM request_items WHERE request_id = ANY($1::int[])`,
            [requestIds]
        );
        const delRequests = await client.query(
            `DELETE FROM blood_requests WHERE request_id = ANY($1::int[])`,
            [requestIds]
        );

        await client.query('COMMIT');

        console.log('\nCleanup complete:');
        console.log(`  ${delRequests.rowCount} blood_requests deleted`);
        console.log(`  ${delItems.rowCount} request_items deleted`);
        console.log(`  ${delLogs.rowCount} request_status_logs deleted`);
        console.log(`  ${delReservations.rowCount} reservations deleted`);
        console.log('\nNote: request_form_path files uploaded to Cloudinary during');
        console.log('these tests are NOT deleted by this script — Cloudinary cleanup');
        console.log('would need a separate pass using the Admin API if storage matters.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Cleanup failed, rolled back:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
