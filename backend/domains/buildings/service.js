const repo = require('./repository');
const db = require('../../database/db');
const { v4: uuidv4 } = require('uuid');

const STATUS_FLOW = ['WAITING_FOR_VALIDATION', 'NEW', 'IN_REVIEW', 'COMPLETED'];

// Determines if building meets all criteria for "ready for settlement opening"
function computeReadiness(building, assessment, municipalApproval) {
  const checks = {
    hasDamageImages: !!building.hasDamageImages,
    hasEngineerReport: !!building.hasEngineerReport,
    hasEligibilityCheck: !!building.hasEligibilityCheck,
    hasBudgetRequest: !!building.hasBudgetRequest,
    hasSocialApproval: building.apartmentsCount >= 24 ? !!building.hasSocialApproval : true,
    hasRelocationPackage: building.status === 'COMPLETED',
    damageOk: assessment ? ['MINOR', 'MODERATE'].includes(assessment.damageLevel) : false,
    municipalApproved: municipalApproval ? !!municipalApproval.approved : false,
  };
  const isReady = Object.values(checks).every(Boolean);
  return { isReady, checks };
}

function getAll(filters) {
  const buildings = repo.findAll(filters);
  return buildings.map(b => enrichBuilding(b));
}

function enrichBuilding(building) {
  const assessment = db.prepare(
    `SELECT * FROM assessments WHERE buildingId = ? ORDER BY createdAt DESC LIMIT 1`
  ).get(building.id);
  const municipalApproval = db.prepare(
    `SELECT * FROM municipal_approvals WHERE buildingId = ? ORDER BY createdAt DESC LIMIT 1`
  ).get(building.id);
  const { isReady, checks } = computeReadiness(building, assessment, municipalApproval);
  return { ...building, assessment, municipalApproval, isReady, readinessChecks: checks };
}

function getById(id) {
  const building = repo.findById(id);
  if (!building) return null;
  const assessment = db.prepare(
    `SELECT a.*, u.fullName as appraiserName FROM assessments a JOIN users u ON a.appraiserId = u.id WHERE a.buildingId = ? ORDER BY a.createdAt DESC`
  ).all(id);
  const municipalApproval = db.prepare(
    `SELECT ma.*, u.fullName as municipalityUserName FROM municipal_approvals ma JOIN users u ON ma.municipalityUserId = u.id WHERE ma.buildingId = ? ORDER BY ma.createdAt DESC LIMIT 1`
  ).get(id);
  const auditLog = db.prepare(
    `SELECT al.*, u.fullName as userName, u.role as userRole FROM audit_logs al LEFT JOIN users u ON al.userId = u.id WHERE al.buildingId = ? ORDER BY al.createdAt DESC`
  ).all(id);
  const notifications = db.prepare(
    `SELECT * FROM notification_logs WHERE buildingId = ? ORDER BY timestamp DESC`
  ).all(id);
  const { isReady, checks } = computeReadiness(building, assessment[0], municipalApproval);
  return { ...building, assessments: assessment, municipalApproval, auditLog, notifications, isReady, readinessChecks: checks };
}

function updateBuilding(id, fields, userId) {
  const building = repo.update(id, fields);
  if (fields.status) {
    addAuditLog(id, userId, 'STATUS_UPDATED', `סטטוס עודכן ל: ${fields.status}`);
  }
  return building;
}

function updateConditions(id, conditions, userId) {
  const building = repo.update(id, conditions);
  addAuditLog(id, userId, 'CONDITIONS_UPDATED', `עדכון תנאי זכאות: ${JSON.stringify(conditions)}`);
  return building;
}

function addAuditLog(buildingId, userId, action, details) {
  db.prepare(`INSERT INTO audit_logs (id, buildingId, userId, action, details) VALUES (?, ?, ?, ?, ?)`)
    .run(uuidv4(), buildingId, userId, action, details);
}

function getStats() {
  return repo.getStats();
}

function getSettlements() {
  return repo.getSettlements();
}

// Public API for cross-domain use
function getBuildingById(id) {
  return repo.findById(id);
}

function getBuildingForSettlementCalculation(id) {
  const b = repo.findById(id);
  if (!b) return null;
  const assessment = db.prepare(`SELECT damageLevel FROM assessments WHERE buildingId = ? ORDER BY createdAt DESC LIMIT 1`).get(id);
  const approval = db.prepare(`SELECT approved FROM municipal_approvals WHERE buildingId = ? ORDER BY createdAt DESC LIMIT 1`).get(id);
  return { ...b, damageLevel: assessment?.damageLevel, municipalApproved: !!approval?.approved };
}

function updateBuildingStatus(id, status, userId) {
  if (!STATUS_FLOW.includes(status)) throw new Error('Invalid status');
  return updateBuilding(id, { status }, userId);
}

module.exports = {
  getAll, getById, updateBuilding, updateConditions, getStats, getSettlements,
  addAuditLog,
  // Public API
  getBuildingById, getBuildingForSettlementCalculation, updateBuildingStatus,
};
