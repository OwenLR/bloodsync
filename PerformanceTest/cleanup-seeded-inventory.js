// cleanup-seeded-inventory.js
// Removes ONLY the synthetic donor->interview->screening->donation->
// collection->unit chains created by seed-inventory.js (identified by
// donors.last_name = 'SeedInventory'). Never touches real donor data.
//
// Run this AFTER cleanup-test-data.js, not before — cleanup-test-data.js
// releases blood_requests-side reservations first; this script releases
// any reservations still pointing at seeded units regardless of source,
// since a seeded unit is entirely ours to remove.
//
// Usage:
//   node cleanup-seeded-inventory.js            -> dry run, lists what would go
//   node cleanup-seeded-inventory.js --confirm  -> actually deletes

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { Pool } = require('pg');

const isConfirmed = process.argv.includes('--confirm');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    const client = await pool.connect();

    try {
        const { rows: donors } = await client.query(
            `SELECT donor_id FROM donors WHERE last_name = 'SeedInventory'`
        );

        if (donors.length === 0) {
            console.log('No seeded donors found (last_name = "SeedInventory"). Nothing to clean.');
            return;
        }

        const donorIds = donors.map(d => d.donor_id);

        const { rows: units } = await client.query(
            `SELECT unit_id, status FROM blood_units WHERE donor_id = ANY($1::int[])`,
            [donorIds]
        );
        const unitIds = units.map(u => u.unit_id);

        const statusCounts = units.reduce((acc, u) => {
            acc[u.status] = (acc[u.status] || 0) + 1;
            return acc;
        }, {});

        console.log(`Found ${donors.length} seeded donor(s), ${units.length} seeded unit(s):`, statusCounts);

        const { rows: reservations } = unitIds.length > 0
            ? await client.query(
                `SELECT reservation_id FROM reservations WHERE unit_id = ANY($1::int[])`,
                [unitIds]
              )
            : { rows: [] };

        if (reservations.length > 0) {
            console.log(`${reservations.length} reservation(s) still point at these units — will be removed too.`);
        }

        if (!isConfirmed) {
            console.log('\nDry run only — no changes made.');
            console.log('Re-run with --confirm to actually delete:');
            console.log('  node cleanup-seeded-inventory.js --confirm');
            return;
        }

        await client.query('BEGIN');

        // Reverse FK order: reservations -> blood_units -> blood_collections
        // -> donations -> screening -> donor_interviews -> donors
        const delReservations = unitIds.length > 0
            ? await client.query(`DELETE FROM reservations WHERE unit_id = ANY($1::int[])`, [unitIds])
            : { rowCount: 0 };

        const delUnits = await client.query(
            `DELETE FROM blood_units WHERE donor_id = ANY($1::int[])`, [donorIds]
        );
        const delCollections = await client.query(
            `DELETE FROM blood_collections WHERE donor_id = ANY($1::int[])`, [donorIds]
        );
        const delDonations = await client.query(
            `DELETE FROM donations WHERE donor_id = ANY($1::int[])`, [donorIds]
        );
        const delScreenings = await client.query(
            `DELETE FROM screening WHERE donor_id = ANY($1::int[])`, [donorIds]
        );
        const delInterviews = await client.query(
            `DELETE FROM donor_interviews WHERE donor_id = ANY($1::int[])`, [donorIds]
        );
        const delDonors = await client.query(
            `DELETE FROM donors WHERE donor_id = ANY($1::int[])`, [donorIds]
        );

        await client.query('COMMIT');

        console.log('\nCleanup complete:');
        console.log(`  ${delDonors.rowCount} donors deleted`);
        console.log(`  ${delInterviews.rowCount} donor_interviews deleted`);
        console.log(`  ${delScreenings.rowCount} screening rows deleted`);
        console.log(`  ${delDonations.rowCount} donations deleted`);
        console.log(`  ${delCollections.rowCount} blood_collections deleted`);
        console.log(`  ${delUnits.rowCount} blood_units deleted`);
        console.log(`  ${delReservations.rowCount} reservations deleted`);

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
