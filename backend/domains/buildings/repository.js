const db = require('../../database/db');

const SELECT_FIELDS = `
  b.id, b.address, b.settlementId, b.settlementName, b.reporterName, b.familyEmail,
  b.hasDamageImages, b.hasEngineerReport, b.hasEligibilityCheck, b.apartmentsCount,
  b.hasSocialApproval, b.hasBudgetRequest, b.status, b.createdAt, b.updatedAt
`;

function findAll({ settlementId, status } = {}) {
  let query = `SELECT ${SELECT_FIELDS} FROM buildings b WHERE 1=1`;
  const params = {};
  if (settlementId) { query += ' AND b.settlementId = @settlementId'; params.settlementId = settlementId; }
  if (status) { query += ' AND b.status = @status'; params.status = status; }
  query += ' ORDER BY b.updatedAt DESC';
  return db.prepare(query).all(params);
}

function findById(id) {
  return db.prepare(`SELECT ${SELECT_FIELDS} FROM buildings b WHERE b.id = ?`).get(id);
}

function create(data) {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  db.prepare(`
    INSERT INTO buildings (id, address, settlementId, settlementName, reporterName, familyEmail,
      hasDamageImages, hasEngineerReport, hasEligibilityCheck, apartmentsCount,
      hasSocialApproval, hasBudgetRequest, status)
    VALUES (@id, @address, @settlementId, @settlementName, @reporterName, @familyEmail,
      @hasDamageImages, @hasEngineerReport, @hasEligibilityCheck, @apartmentsCount,
      @hasSocialApproval, @hasBudgetRequest, @status)
  `).run({ id, ...data, status: data.status || 'WAITING_FOR_VALIDATION' });
  return findById(id);
}

function update(id, fields) {
  const allowed = ['hasDamageImages','hasEngineerReport','hasEligibilityCheck','apartmentsCount',
    'hasSocialApproval','hasBudgetRequest','status','familyEmail'];
  const sets = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');
  if (!sets) return findById(id);
  db.prepare(`UPDATE buildings SET ${sets}, updatedAt = datetime('now') WHERE id = @id`)
    .run({ ...fields, id });
  return findById(id);
}

function getStats() {
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'WAITING_FOR_VALIDATION' THEN 1 ELSE 0 END) as waitingCount,
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as newCount,
      SUM(CASE WHEN status = 'IN_REVIEW' THEN 1 ELSE 0 END) as inReviewCount,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount
    FROM buildings
  `).get();
}

function getSettlements() {
  return db.prepare(`SELECT DISTINCT settlementId, settlementName FROM buildings ORDER BY settlementName`).all();
}

module.exports = { findAll, findById, create, update, getStats, getSettlements };
