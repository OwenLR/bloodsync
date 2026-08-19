const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // max was 10 — too low for concurrent load. Confirmed via PT19-21
    // (blood request approval) load testing: a burst of 25 concurrent
    // requests exhausted the pool almost immediately, since approveRequest()
    // holds one connection per virtual user for the full duration of its
    // transaction (row lock + FEFO unit loop + reservation inserts, all
    // sequential awaited queries before COMMIT). Requests queued past
    // connectionTimeoutMillis and surfaced as socket timeouts client-side.
    // Raised to 50 to comfortably cover the Peak load level (50 concurrent
    // users, per Chapter 3's stated 50-100 concurrent ceiling). Safe to
    // raise because DATABASE_URL uses Neon's POOLED endpoint (PgBouncer in
    // front) — this setting only bounds how many connections THIS Node
    // process's pg.Pool holds, not Neon's actual Postgres capacity, which
    // the pooler is already managing separately. Would need reconsidering
    // if ever pointed at Neon's direct (non-pooled) endpoint instead.
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
});

pool.connect()
    .then(() => console.log('Connected to Neon PostgreSQL'))
    .catch(err => console.error('Database connection error:', err));

module.exports = pool;