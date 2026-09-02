const db = require('../../database/db');

function getLatestAssessmentForBuilding(buildingId) {
  return db.prepare(`SELECT * FROM assessments WHERE buildingId = ? ORDER BY createdAt DESC LIMIT 1`).get(buildingId);
}

module.exports = { getLatestAssessmentForBuilding };
