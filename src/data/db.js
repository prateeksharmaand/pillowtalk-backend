require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL environment variable is not set.');
  console.error('    Add it to your .env file or Render environment variables.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }   // required for Render / Heroku managed PG
    : false,
  max: 10,                 // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// Helper — run a query and return rows
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper — return first row or null
async function queryOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] ?? null;
}

// Helper — return all rows
async function queryAll(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

module.exports = { pool, query, queryOne, queryAll };
