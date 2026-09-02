const { Database: _Database } = require('node-sqlite3-wasm');
const path = require('path');

// node-sqlite3-wasm requires named params to include the @ prefix in the key
// (e.g. { '@id': '...' }), unlike better-sqlite3 which accepts bare keys.
// This wrapper normalises plain-key objects automatically so the rest of the
// codebase can use the familiar better-sqlite3 style ({ id: '...' }).
function normParams(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return p;
  return Object.fromEntries(
    Object.entries(p).map(([k, v]) => [/^[@:$]/.test(k) ? k : `@${k}`, v])
  );
}

class Database extends _Database {
  prepare(sql) {
    const stmt = super.prepare(sql);
    const origRun = stmt.run.bind(stmt);
    const origGet = stmt.get.bind(stmt);
    const origAll = stmt.all.bind(stmt);
    stmt.run = (p) => origRun(normParams(p));
    stmt.get = (p) => origGet(normParams(p));
    stmt.all = (p) => origAll(normParams(p));
    return stmt;
  }
}

const DB_PATH = path.join(__dirname, 'rehab.db');
const db = new Database(DB_PATH);

db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('MINISTRY','MUNICIPALITY','APPRAISER')),
    settlementId TEXT
  );

  CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    settlementId TEXT NOT NULL,
    settlementName TEXT NOT NULL,
    reporterName TEXT NOT NULL,
    familyEmail TEXT NOT NULL,
    hasDamageImages INTEGER NOT NULL DEFAULT 0,
    hasEngineerReport INTEGER NOT NULL DEFAULT 0,
    hasEligibilityCheck INTEGER NOT NULL DEFAULT 0,
    apartmentsCount INTEGER NOT NULL DEFAULT 0,
    hasSocialApproval INTEGER NOT NULL DEFAULT 0,
    hasBudgetRequest INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'WAITING_FOR_VALIDATION'
      CHECK(status IN ('WAITING_FOR_VALIDATION','NEW','IN_REVIEW','COMPLETED')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    buildingId TEXT NOT NULL REFERENCES buildings(id),
    appraiserId TEXT NOT NULL REFERENCES users(id),
    damageLevel TEXT NOT NULL CHECK(damageLevel IN ('MINOR','MODERATE','SEVERE')),
    notes TEXT,
    inspectionDate TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS municipal_approvals (
    id TEXT PRIMARY KEY,
    buildingId TEXT NOT NULL REFERENCES buildings(id),
    municipalityUserId TEXT NOT NULL REFERENCES users(id),
    settlementId TEXT NOT NULL,
    waterOk INTEGER NOT NULL DEFAULT 0,
    electricityOk INTEGER NOT NULL DEFAULT 0,
    accessRoadsOk INTEGER NOT NULL DEFAULT 0,
    hazardRemovalOk INTEGER NOT NULL DEFAULT 0,
    approved INTEGER NOT NULL DEFAULT 0,
    approvalDate TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settlement_processes (
    id TEXT PRIMARY KEY,
    settlementId TEXT NOT NULL,
    settlementName TEXT NOT NULL,
    triggeredByUserId TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'PROCESSING'
      CHECK(status IN ('PROCESSING','COMPLETED','FAILED')),
    processedCount INTEGER NOT NULL DEFAULT 0,
    totalCount INTEGER NOT NULL DEFAULT 0,
    startedAt TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    buildingId TEXT REFERENCES buildings(id),
    userId TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    messageId TEXT,
    buildingId TEXT NOT NULL REFERENCES buildings(id),
    idempotencyKey TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('SENT','FAILED','ALREADY_SENT')),
    attemptNumber INTEGER NOT NULL DEFAULT 1,
    errorMessage TEXT,
    recipientEmail TEXT,
    subject TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
