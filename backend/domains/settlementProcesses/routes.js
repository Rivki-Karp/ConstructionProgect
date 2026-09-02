const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/authorizationPolicy');
const db = require('../../database/db');
const buildingsApi = require('../buildings/api');
const assessmentsApi = require('../assessments/api');
const municipalApi = require('../municipalApprovals/api');
const notificationService = require('../../notifications/notificationService');
const { v4: uuidv4 } = require('uuid');

router.use(authenticate, requireRole('MINISTRY'));

// GET /api/settlement-processes
router.get('/', (req, res) => {
  const processes = db.prepare(`
    SELECT sp.*, u.fullName as triggeredByName
    FROM settlement_processes sp
    JOIN users u ON sp.triggeredByUserId = u.id
    ORDER BY sp.startedAt DESC
  `).all();
  res.json(processes);
});

// POST /api/settlement-processes/trigger - trigger mass processing for a settlement
router.post('/trigger', async (req, res) => {
  const { settlementId } = req.body;
  if (!settlementId) return res.status(400).json({ error: 'settlementId חסר' });

  const settlementInfo = db.prepare(`SELECT DISTINCT settlementId, settlementName FROM buildings WHERE settlementId = ?`).get(settlementId);
  if (!settlementInfo) return res.status(404).json({ error: 'ישוב לא נמצא' });

  // Get all buildings for this settlement that are ready
  const buildings = db.prepare(`SELECT * FROM buildings WHERE settlementId = ?`).all(settlementId);

  const processId = uuidv4();
  db.prepare(`
    INSERT INTO settlement_processes (id, settlementId, settlementName, triggeredByUserId, status, processedCount, totalCount)
    VALUES (@id, @settlementId, @settlementName, @triggeredByUserId, 'PROCESSING', 0, @totalCount)
  `).run({ id: processId, settlementId, settlementName: settlementInfo.settlementName, triggeredByUserId: req.user.id, totalCount: buildings.length });

  // Process asynchronously
  setImmediate(async () => {
    let processed = 0;
    for (const building of buildings) {
      const assessment = assessmentsApi.getLatestAssessmentForBuilding(building.id);
      const approval = municipalApi.getApprovalForBuilding(building.id);
      const allConditions = building.hasDamageImages && building.hasEngineerReport &&
        building.hasEligibilityCheck && building.hasBudgetRequest &&
        (building.apartmentsCount >= 24 ? building.hasSocialApproval : true) &&
        assessment && ['MINOR','MODERATE'].includes(assessment.damageLevel) &&
        approval && approval.approved;

      if (allConditions) {
        const idempotencyKey = `${building.id}:RETURN_HOME:${processId}`;
        await notificationService.sendNotification({
          buildingId: building.id,
          recipientEmail: building.familyEmail,
          subject: `הודעת חזרה לבית - ${building.address}`,
          body: `משפחה יקרה,\n\nנשמח לבשר לכם כי הבניין ב${building.address} אושר לחזרה לבית.\n\nבברכה,\nמשרד הבינוי`,
          idempotencyKey,
          userId: req.user.id,
        });
        buildingsApi.updateBuildingStatus(building.id, 'COMPLETED', req.user.id);
        buildingsApi.addAuditLog(building.id, req.user.id, 'RETURN_HOME_PACKAGE_SENT', `חבילת חזרה לבית נשלחה - תהליך ישוב ${settlementInfo.settlementName}`);
        processed++;
      }
    }

    db.prepare(`
      UPDATE settlement_processes SET status = 'COMPLETED', processedCount = @processed, completedAt = datetime('now')
      WHERE id = @id
    `).run({ processed, id: processId });
  });

  res.status(202).json({
    processId,
    message: `תהליך עיבוד הושק עבור ${settlementInfo.settlementName}`,
    totalBuildings: buildings.length,
  });
});

// POST /api/settlement-processes/send-package/:buildingId - individual package
router.post('/send-package/:buildingId', async (req, res) => {
  const { buildingId } = req.params;
  const building = buildingsApi.getBuildingById(buildingId);
  if (!building) return res.status(404).json({ error: 'מבנה לא נמצא' });

  const idempotencyKey = `${buildingId}:RETURN_HOME:individual`;
  const result = await notificationService.sendNotification({
    buildingId,
    recipientEmail: building.familyEmail,
    subject: `הודעת חזרה לבית - ${building.address}`,
    body: `משפחה יקרה,\n\nנשמח לבשר לכם כי הבניין ב${building.address} אושר לחזרה לבית.\n\nבברכה,\nמשרד הבינוי`,
    idempotencyKey,
    userId: req.user.id,
  });

  if (result.status === 'SENT') {
    buildingsApi.updateBuildingStatus(buildingId, 'COMPLETED', req.user.id);
    buildingsApi.addAuditLog(buildingId, req.user.id, 'RETURN_HOME_PACKAGE_SENT', 'חבילת חזרה לבית נשלחה למשפחה');
  }

  res.json(result);
});

module.exports = router;
