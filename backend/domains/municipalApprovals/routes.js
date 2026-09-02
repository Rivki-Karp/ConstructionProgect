const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/authorizationPolicy');
const db = require('../../database/db');
const buildingsApi = require('../buildings/api');
const { v4: uuidv4 } = require('uuid');

router.use(authenticate);

// GET /api/municipal-approvals?buildingId=&settlementId=
router.get('/', requireRole('MINISTRY', 'MUNICIPALITY'), (req, res) => {
  const { buildingId, settlementId } = req.query;
  let query = `
    SELECT ma.*, u.fullName as municipalityUserName, b.address, b.settlementName
    FROM municipal_approvals ma
    JOIN users u ON ma.municipalityUserId = u.id
    JOIN buildings b ON ma.buildingId = b.id
    WHERE 1=1
  `;
  const params = {};
  // Municipalities see only their settlement
  const effectiveSettlement = req.user.role === 'MUNICIPALITY' ? req.user.settlementId : settlementId;
  if (effectiveSettlement) { query += ' AND ma.settlementId = @settlementId'; params.settlementId = effectiveSettlement; }
  if (buildingId) { query += ' AND ma.buildingId = @buildingId'; params.buildingId = buildingId; }
  query += ' ORDER BY ma.updatedAt DESC';
  res.json(db.prepare(query).all(params));
});

// POST /api/municipal-approvals - Municipalities only
router.post('/', requireRole('MUNICIPALITY'), (req, res) => {
  const { buildingId, waterOk, electricityOk, accessRoadsOk, hazardRemovalOk, notes } = req.body;
  if (!buildingId) return res.status(400).json({ error: 'buildingId חסר' });

  const building = buildingsApi.getBuildingById(buildingId);
  if (!building) return res.status(404).json({ error: 'מבנה לא נמצא' });
  if (building.settlementId !== req.user.settlementId) {
    return res.status(403).json({ error: 'גישה אסורה - המבנה אינו בישוב שלך' });
  }

  // Upsert: delete existing and insert fresh
  db.prepare(`DELETE FROM municipal_approvals WHERE buildingId = ?`).run(buildingId);

  const allOk = waterOk && electricityOk && accessRoadsOk && hazardRemovalOk;
  const id = uuidv4();
  const approvalDate = allOk ? new Date().toISOString().split('T')[0] : null;

  db.prepare(`
    INSERT INTO municipal_approvals
      (id, buildingId, municipalityUserId, settlementId, waterOk, electricityOk, accessRoadsOk, hazardRemovalOk, approved, approvalDate, notes)
    VALUES
      (@id, @buildingId, @municipalityUserId, @settlementId, @waterOk, @electricityOk, @accessRoadsOk, @hazardRemovalOk, @approved, @approvalDate, @notes)
  `).run({
    id, buildingId,
    municipalityUserId: req.user.id,
    settlementId: req.user.settlementId,
    waterOk: waterOk ? 1 : 0,
    electricityOk: electricityOk ? 1 : 0,
    accessRoadsOk: accessRoadsOk ? 1 : 0,
    hazardRemovalOk: hazardRemovalOk ? 1 : 0,
    approved: allOk ? 1 : 0,
    approvalDate,
    notes: notes || null,
  });

  const action = allOk ? 'MUNICIPAL_APPROVAL_GRANTED' : 'MUNICIPAL_APPROVAL_UPDATED';
  const detail = allOk ? 'אושרה תשתית עירונית - כל הבדיקות תקינות' : 'עדכון בדיקות תשתית עירונית';
  buildingsApi.addAuditLog(buildingId, req.user.id, action, detail);

  const created = db.prepare(`
    SELECT ma.*, u.fullName as municipalityUserName FROM municipal_approvals ma
    JOIN users u ON ma.municipalityUserId = u.id WHERE ma.id = ?
  `).get(id);
  res.status(201).json(created);
});

// GET /api/municipal-approvals/:buildingId
router.get('/:buildingId', requireRole('MINISTRY', 'MUNICIPALITY'), (req, res) => {
  if (req.user.role === 'MUNICIPALITY') {
    const building = buildingsApi.getBuildingById(req.params.buildingId);
    if (building && building.settlementId !== req.user.settlementId) {
      return res.status(403).json({ error: 'גישה אסורה' });
    }
  }
  const approval = db.prepare(`
    SELECT ma.*, u.fullName as municipalityUserName FROM municipal_approvals ma
    JOIN users u ON ma.municipalityUserId = u.id
    WHERE ma.buildingId = ? ORDER BY ma.createdAt DESC LIMIT 1
  `).get(req.params.buildingId);
  res.json(approval || null);
});

module.exports = router;
