const db = require('../../database/db');

function getApprovalForBuilding(buildingId) {
  return db.prepare(`SELECT * FROM municipal_approvals WHERE buildingId = ? ORDER BY createdAt DESC LIMIT 1`).get(buildingId);
}

module.exports = { getApprovalForBuilding };
