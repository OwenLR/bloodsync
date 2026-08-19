// seed-inventory.js
// Creates N full, valid donor->interview->screening->donation->collection->unit
// chains so blood_units has real inventory to test PT07-24 against, without
// manually walking the 6-step UI workflow N times.
//
// All synthetic donors are tagged (last_name='SeedInventory', national_id_number
// prefixed 'SEED-') so they're identifiable in the real app and removable via
// cleanup-seeded-inventory.js. These WILL appear in donor search, workflow
// dropdowns, etc. until cleaned up — dev DB only, never point this at anything
// resembling production data.
//
// Usage:
//   node seed-inventory.js <count> [blood_type] [component] [branch_id]
//   node seed-inventory.js 20                      -> 20x O+ Whole Blood @ branch 1
//   node seed-inventory.js 30 O+ "Whole Blood" 1    -> same, explicit
//
// Whole batch runs in a single transaction — all N chains commit together,
// or none do.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const count     = parseInt(process.argv[2], 10) || 20;
const bloodType = process.argv[3] || 'O+';
const component = process.argv[4] || 'Whole Blood';
const branchId  = parseInt(process.argv[5], 10) || 1;

async function main() {
    const client = await pool.connect();
    const seedTag = Date.now(); // groups this batch, also keeps barcodes/id_numbers unique

    try {
        await client.query('BEGIN');

        // Look up expiry_days ONCE — component is fixed for the whole run,
        // so no need to re-query per row. This also avoids a real Postgres
        // bug: reusing the same $N parameter as both a plain INSERT value
        // and inside a subquery's WHERE clause against a different table's
        // column makes Postgres try to unify two different varchar length
        // types for that one placeholder, which fails with "inconsistent
        // types deduced". Isolating the lookup sidesteps it entirely.
        const expiryRes = await client.query(
            `SELECT expiry_days FROM component_expiry_days WHERE component = $1`,
            [component]
        );
        if (expiryRes.rows.length === 0) {
            throw new Error(`No expiry_days configured for component "${component}" in component_expiry_days table.`);
        }
        const expiryDays = expiryRes.rows[0].expiry_days;

        const createdUnitIds = [];

        for (let i = 1; i <= count; i++) {
            // 1. Donor
            const donorRes = await client.query(
                `INSERT INTO donors
                    (first_name, last_name, birthdate, sex, blood_type, email,
                     branch_id, status, national_id_type, national_id_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING donor_id`,
                [
                    `SeedUnit${i}`, 'SeedInventory', '1995-01-01', 'Male', bloodType,
                    `seed-${seedTag}-${i}@bloodsync.test`,
                    branchId, 'Active', 'Test', `SEED-${seedTag}-${i}`,
                ]
            );
            const donorId = donorRes.rows[0].donor_id;

            // 2. Interview
            const interviewRes = await client.query(
                `INSERT INTO donor_interviews (donor_id, branch_id, interview_result)
                 VALUES ($1, $2, $3)
                 RETURNING interview_id`,
                [donorId, branchId, 'Passed']
            );
            const interviewId = interviewRes.rows[0].interview_id;

            // 3. Screening
            const screeningRes = await client.query(
                `INSERT INTO screening
                    (interview_id, donor_id, branch_id, weight, blood_pressure,
                     pulse_rate, temperature, hemoglobin, blood_type_confirmed,
                     hemoglobin_status, screening_result)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING screening_id`,
                [interviewId, donorId, branchId, 65.0, '120/80', 75, 36.5, 14.0,
                 bloodType, 'Allowed', 'Eligible']
            );
            const screeningId = screeningRes.rows[0].screening_id;

            // 4. Donation
            const donationRes = await client.query(
                `INSERT INTO donations
                    (donor_id, screening_id, branch_id, blood_volume_ml, extraction_time_seconds)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING donation_id`,
                [donorId, screeningId, branchId, 450, 480]
            );
            const donationId = donationRes.rows[0].donation_id;

            // 5. Collection — status 'Safe' since this is standing in for a
            // collection that already passed Blood Testing.
            const collectionBarcode = `SEED-BC-${seedTag}-${i}`;
            const collectionRes = await client.query(
                `INSERT INTO blood_collections
                    (donation_id, donor_id, branch_id, blood_type, component,
                     volume_ml, barcode, status, approved_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                 RETURNING collection_id`,
                [donationId, donorId, branchId, bloodType, component, 450, collectionBarcode, 'Safe']
            );
            const collectionId = collectionRes.rows[0].collection_id;

            // 6. Blood unit — expiration_date computed from expiryDays
            // fetched once above, not via a reused $6 subquery.
            const unitBarcode = `SEED-BU-${seedTag}-${i}`;
            const unitRes = await client.query(
                `INSERT INTO blood_units
                    (collection_id, donation_id, donor_id, branch_id, blood_type,
                     component, volume_ml, barcode, collection_date, expiration_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(),
                    NOW() + ($9 * INTERVAL '1 day'),
                    'Available')
                 RETURNING unit_id`,
                [collectionId, donationId, donorId, branchId, bloodType, component, 450, unitBarcode, expiryDays]
            );
            createdUnitIds.push(unitRes.rows[0].unit_id);
        }

        await client.query('COMMIT');

        console.log(`\nSeeded ${count}x ${bloodType} ${component} @ branch_id=${branchId}`);
        console.log(`Batch tag: ${seedTag}`);
        console.log(`Unit IDs: ${createdUnitIds.join(', ')}`);
        console.log(`\nTagged for identification/cleanup: donors.last_name = 'SeedInventory'`);
        console.log(`Run check-inventory.js to confirm the new Available count.`);
        console.log(`Run cleanup-seeded-inventory.js when done testing to remove this batch.`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed failed, rolled back:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
