const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let pool = null;
const usePg = !!(process.env.DATABASE_URL || process.env.PGUSER);

if (usePg) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    console.log('Database connected to PostgreSQL.');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool, falling back to JSON db.', err.message);
  }
} else {
  console.log('PostgreSQL configuration not found. Running with local file-based JSON DB store.');
}

const dbStorePath = path.join(__dirname, '../db/db_store.json');

function loadJsonDb() {
  if (!fs.existsSync(dbStorePath)) {
    // Attempt to initialize if seed module is present
    try {
      const initializer = require('../db/db_initializer');
      initializer.run();
    } catch (e) {
      console.error('Database store does not exist and could not run initializer:', e.message);
      return {};
    }
  }
  const data = fs.readFileSync(dbStorePath, 'utf8');
  return JSON.parse(data);
}

function saveJsonDb(data) {
  fs.writeFileSync(dbStorePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  isPg: usePg && !!pool,
  pool,
  
  // Generic query runner for direct SQL execution (PostgreSQL only)
  query: async (text, params) => {
    if (usePg && pool) {
      return pool.query(text, params);
    }
    throw new Error('PostgreSQL database not configured. Operation requires Postgres mode.');
  },

  // JSON database helpers
  getJsonDb: () => loadJsonDb(),
  saveJsonDb: (data) => saveJsonDb(data)
};
