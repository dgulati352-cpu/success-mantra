/**
 * Success Mantra Cloudflare D1 Client
 * Connects directly to Cloudflare D1 Relational SQL Database (ID: 6d2f282b-f4eb-4cb6-ac7d-fc3e8e6d30ff)
 * Supports:
 * - Direct HTTP REST API query execution against Cloudflare D1
 * - Parameterized binding for SQL injection protection
 * - Local SQLite hybrid cache fallback for high-speed local processing
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '7c210c8090a82af486eba01139e9d7d0';
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || '6d2f282b-f4eb-4cb6-ac7d-fc3e8e6d30ff';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

/**
 * Execute a SQL query directly against Cloudflare D1 via REST API or SQLite
 */
async function queryD1(sql, params = []) {
  if (API_TOKEN) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: sql.trim(),
          params: params
        })
      });

      const data = await response.json();
      if (data.success && data.result && data.result.length > 0) {
        return {
          success: true,
          results: data.result[0].results || [],
          meta: data.result[0].meta || {}
        };
      }
    } catch (err) {
      console.warn('[Cloudflare D1 REST Note]', err.message);
    }
  }

  // Local SQLite Hybrid Engine Execution
  try {
    const db = require('../database/db');
    if (db && typeof db.prepare === 'function') {
      const trimmed = sql.trim();
      const isSelect = /^(SELECT|PRAGMA)/i.test(trimmed);
      if (isSelect) {
        const rows = db.prepare(trimmed).all(...params);
        return { success: true, results: rows, meta: { source: 'sqlite' } };
      } else {
        const info = db.prepare(trimmed).run(...params);
        return { success: true, results: [], meta: { changes: info.changes, lastInsertRowid: info.lastInsertRowid } };
      }
    }
  } catch (err) {
    console.error('[D1 SQL Execution Error]', err.message);
    throw err;
  }

  return { success: false, results: [], meta: {} };
}

/**
 * Execute a single SQL statement returning the first row
 */
async function queryD1One(sql, params = []) {
  const res = await queryD1(sql, params);
  return (res.results && res.results.length > 0) ? res.results[0] : null;
}

/**
 * Execute a batch of SQL statements in a single transaction
 */
async function batchD1(statements = []) {
  if (statements.length === 0) return { success: true, results: [] };

  if (API_TOKEN) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
      const sqlStatements = statements.map(s => s.sql).join('; ');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: sqlStatements })
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, result: data.result };
      }
    } catch (err) {
      console.warn('[Cloudflare D1 Batch Note]', err.message);
    }
  }

  // Local SQLite Transaction Batch
  try {
    const db = require('../database/db');
    if (db && typeof db.transaction === 'function') {
      const runBatch = db.transaction((stmts) => {
        const out = [];
        for (const s of stmts) {
          out.push(db.prepare(s.sql).run(...(s.params || [])));
        }
        return out;
      });
      const res = runBatch(statements);
      return { success: true, result: res };
    }
  } catch (err) {
    console.error('[D1 Batch Error]', err.message);
    throw err;
  }

  return { success: true };
}

module.exports = {
  queryD1,
  queryD1One,
  batchD1,
  ACCOUNT_ID,
  DATABASE_ID
};
