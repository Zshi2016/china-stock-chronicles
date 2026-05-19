/**
 * SQLite connection singleton.
 * Opens the database once, enables WAL mode, and runs schema migrations.
 * Returns the same database instance on every call.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;

/**
 * Get (or create) the SQLite database instance.
 * @param {string} [dbPath] — override path; defaults to env.DB_PATH or ./data/chronicles.db
 * @returns {import('better-sqlite3').Database}
 */
function getConnection(dbPath) {
  if (db) return db;

  const resolvedPath = dbPath
    || process.env.DB_PATH
    || path.join(__dirname, '..', 'data', 'chronicles.db');

  // Ensure the data directory exists.
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);

  // Performance / reliability pragmas.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Run schema DDL.
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  } else {
    console.warn('[db] schema.sql not found — skipping DDL');
  }

  console.log(`[db] Connected to ${resolvedPath}`);
  return db;
}

/**
 * Close the database connection gracefully.
 */
function closeConnection() {
  if (db) {
    db.close();
    db = null;
    console.log('[db] Connection closed');
  }
}

module.exports = { getConnection, closeConnection };
