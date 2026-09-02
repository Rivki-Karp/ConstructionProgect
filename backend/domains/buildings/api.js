// Public API — the only surface other domains may call into the Buildings domain
const svc = require('./service');

module.exports = {
  getBuildingById: (id) => svc.getBuildingById(id),
  getBuildingForSettlementCalculation: (id) => svc.getBuildingForSettlementCalculation(id),
  updateBuildingStatus: (id, status, userId) => svc.updateBuildingStatus(id, status, userId),
  addAuditLog: (buildingId, userId, action, details) => svc.addAuditLog(buildingId, userId, action, details),
};
