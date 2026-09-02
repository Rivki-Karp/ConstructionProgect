const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/authorizationPolicy');
const db = require('../../database/db');
const buildingsApi = require('../buildings/api');
const { v4: uuidv4 } = require('uuid');

router.use(authenticate);

// GET /api/assessments?buildingId=...
router.get('/', requireRole('MINISTRY', 'APPRAISER'), (req, res) => {
  const { buildingId } = req.query;
  let query = `
    SELECT a.*, u.fullName as appraiserName, b.address, b.settlementName
    FROM assessments a
    JOIN users u ON a.appraiserId = u.id
    JOIN buildings b ON a.buildingId = b.id
    WHERE 1=1
  `;
  const params = {};
  if (buildingId) { query += ' AND a.buildingId = @buildingId'; params.buildingId = buildingId; }
  query += ' ORDER BY a.createdAt DESC';
  res.json(db.prepare(query).all(params));
});

// POST /api/assessments - Appraisers only
router.post('/', requireRole('APPRAISER'), (req, res) => {
  const { buildingId, damageLevel, notes, inspectionDate } = req.body;
  if (!buildingId || !damageLevel || !inspectionDate) {
    return res.status(400).json({ error: 'שדות חובה חסרים: buildingId, damageLevel, inspectionDate' });
  }
  if (!['MINOR','MODERATE','SEVERE'].includes(damageLevel)) {
    return res.status(400).json({ error: 'רמת נזק לא חוקית' });
  }
  const building = buildingsApi.getBuildingById(buildingId);
  if (!building) return res.status(404).json({ error: 'מבנה לא נמצא' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO assessments (id, buildingId, appraiserId, damageLevel, notes, inspectionDate)
    VALUES (@id, @buildingId, @appraiserId, @damageLevel, @notes, @inspectionDate)
  `).run({ id, buildingId, appraiserId: req.user.id, damageLevel, notes: notes || null, inspectionDate });

  const levelMap = { MINOR: 'קל', MODERATE: 'בינוני', SEVERE: 'חמור' };
  buildingsApi.addAuditLog(buildingId, req.user.id, 'ASSESSMENT_CREATED', `הוגשה הערכת נזק: ${levelMap[damageLevel]}`);

  // Auto-advance status to IN_REVIEW if still NEW
  if (building.status === 'NEW' || building.status === 'WAITING_FOR_VALIDATION') {
    buildingsApi.updateBuildingStatus(buildingId, 'IN_REVIEW', req.user.id);
  }

  const created = db.prepare(`
    SELECT a.*, u.fullName as appraiserName FROM assessments a
    JOIN users u ON a.appraiserId = u.id WHERE a.id = ?
  `).get(id);
  res.status(201).json(created);
});

// GET /api/assessments/:id
router.get('/:id', requireRole('MINISTRY', 'APPRAISER'), (req, res) => {
  const a = db.prepare(`
    SELECT a.*, u.fullName as appraiserName FROM assessments a
    JOIN users u ON a.appraiserId = u.id WHERE a.id = ?
  `).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'הערכה לא נמצאה' });
  res.json(a);
});

module.exports = router;
