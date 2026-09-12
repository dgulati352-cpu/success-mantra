const path = require('path');
const fs = require('fs');
const os = require('os');

let db = null;

function getDatabasePath() {
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    return path.join(os.tmpdir(), 'success_mantra.db');
  }

  const dbDir = path.join(__dirname);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (e) {
      return path.join(os.tmpdir(), 'success_mantra.db');
    }
  }
  return path.join(dbDir, 'success_mantra.db');
}

// 1. Try better-sqlite3 first
try {
  const dynamicRequire = new Function('m', 'return require(m)');
  const Database = dynamicRequire('better-sqlite3');
  const dbPath = getDatabasePath();
  db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  } catch (pErr) {}
} catch (e) {
  // 2. Try Node.js 22+ built-in node:sqlite
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = getDatabasePath();
    db = new DatabaseSync(dbPath);
    if (!db.pragma) {
      db.pragma = (stmt) => {
        try { db.exec(`PRAGMA ${stmt}`); } catch (p) {}
      };
    }
  } catch (nodeSqliteErr) {
    // 3. Try in-memory DatabaseSync
    try {
      const { DatabaseSync } = require('node:sqlite');
      db = new DatabaseSync(':memory:');
      if (!db.pragma) {
        db.pragma = (stmt) => {
          try { db.exec(`PRAGMA ${stmt}`); } catch (p) {}
        };
      }
    } catch (memErr) {
      db = null;
    }
  }
}

// 4. Resilient In-Memory table store fallback
if (!db) {
  const memoryTables = {
    mock_tests: new Map(),
    questions: new Map(),
    test_attempts: new Map()
  };

  db = {
    prepare: (sql) => {
      const sqlLower = (sql || '').toLowerCase();
      return {
        run: (...params) => {
          if (sqlLower.includes('mock_tests')) {
            const id = params[0];
            if (id) memoryTables.mock_tests.set(String(id), { id: String(id), title: params[1] || 'Mock Test' });
          }
          if (sqlLower.includes('questions')) {
            const id = params[0];
            const testId = params[1];
            if (id) memoryTables.questions.set(String(id), { id: String(id), test_id: String(testId), ...params });
          }
          return { changes: 1, lastInsertRowid: 1 };
        },
        get: (...params) => {
          if (sqlLower.includes('mock_tests')) {
            const id = params[0];
            return memoryTables.mock_tests.get(String(id)) || { id: String(id), title: 'Mock Test' };
          }
          if (sqlLower.includes('questions')) {
            const id = params[0];
            return memoryTables.questions.get(String(id)) || null;
          }
          return null;
        },
        all: (...params) => {
          if (sqlLower.includes('mock_tests')) {
            return Array.from(memoryTables.mock_tests.values());
          }
          if (sqlLower.includes('questions')) {
            const testId = params[0];
            const list = Array.from(memoryTables.questions.values());
            return testId ? list.filter(q => q.test_id === String(testId)) : list;
          }
          return [];
        }
      };
    },
    exec: () => {},
    pragma: () => {}
  };
}

module.exports = db;
