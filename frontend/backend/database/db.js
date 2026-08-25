let db = null;
try {
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');

  const dbDir = path.join(__dirname);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'success_mantra.db');
  db = new Database(dbPath);

  // Enable WAL mode and foreign keys for high performance and integrity
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (e) {
  console.warn('SQLite not available in this environment (using Firestore REST):', e.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {},
    pragma: () => {}
  };
}

module.exports = db;
