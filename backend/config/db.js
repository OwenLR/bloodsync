const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Connection pool settings
    max: 10,                  // maximum connections
    idleTimeoutMillis: 30000, // close idle connections after 30s
    connectionTimeoutMillis: 2000, // timeout if cant connect after 2s
});

// Handle unexpected errors without crashing
pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
    // Log but do NOT crash
});

pool.connect()
    .then(() => console.log('Connected to Neon PostgreSQL'))
    .catch(err => console.error('Database connection error:', err));

module.exports = pool;