let db = null;

// Only load native SQLite in local dev environments.
// Native binaries like better-sqlite3 cannot run in serverless runtimes.
const isServerless = !!(
  process.env.VERCEL ||
  process.env.NOW_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

if (!isServerless) {
  try {
    // Use Function-based dynamic require so bundlers don't trace/include this
    const dynamicRequire = new Function('m', 'return require(m)');
    const Database = dynamicRequire('better-sqlite3');
    const path = require('path');
    const fs = require('fs');

    const dbDir = path.join(__dirname);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'success_mantra.db');
    db = new Database(dbPath);

    try {
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
    } catch (pErr) {}
  } catch (e) {
    db = null;
  }
}

// No-op shim for Vercel/Lambda: all operations silently succeed
// Actual data persistence is handled by Firebase Firestore REST API
if (!db) {
  db = {
    prepare: () => ({
      run: () => ({ changes: 0, lastInsertRowid: null }),
      get: () => null,
      all: () => []
    }),
    exec: () => {},
    pragma: () => {}
  };
}

module.exports = db;
