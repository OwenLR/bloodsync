const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
});

pool.connect()
    .then(() => console.log('Connected to Neon PostgreSQL'))
    .catch(err => console.error('Database connection error:', err));

module.exports = pool;