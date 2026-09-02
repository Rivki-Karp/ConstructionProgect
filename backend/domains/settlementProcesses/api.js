const db = require('../../database/db');

function getProcessesBySettlement(settlementId) {
  return db.prepare(`SELECT * FROM settlement_processes WHERE settlementId = ? ORDER BY startedAt DESC`).all(settlementId);
}

module.exports = { getProcessesBySettlement };
