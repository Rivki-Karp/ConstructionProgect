const express = require('express');
const router = express.Router();
const { authenticate, requireRole, enforceTenancy } = require('../../middleware/authorizationPolicy');
const svc = require('./service');
const db = require('../../database/db');

router.use(authenticate);

// GET /api/buildings - list with optional filters
router.get('/', enforceTenancy, (req, res) => {
  const filters = {};
  if (req.tenantSettlementId) filters.settlementId = req.tenantSettlementId;
  else if (req.query.settlementId) filters.settlementId = req.query.settlementId;
  if (req.query.status) filters.status = req.query.status;
  res.json(svc.getAll(filters));
});

// GET /api/buildings/stats
router.get('/stats', requireRole('MINISTRY'), (req, res) => {
  res.json(svc.getStats());
});

// GET /api/buildings/settlements
router.get('/settlements', (req, res) => {
  res.json(svc.getSettlements());
});

// GET /api/buildings/:id
router.get('/:id', (req, res) => {
  const building = svc.getById(req.params.id);
  if (!building) return res.status(404).json({ error: 'מבנה לא נמצא' });
  if (req.user.role === 'MUNICIPALITY' && building.settlementId !== req.user.settlementId) {
    return res.status(403).json({ error: 'גישה אסורה' });
  }
  res.json(building);
});

// POST /api/buildings - Ministry only
router.post('/', requireRole('MINISTRY'), (req, res) => {
  const { address, settlementId, settlementName, reporterName, familyEmail,
    hasDamageImages, hasEngineerReport, hasEligibilityCheck, apartmentsCount,
    hasSocialApproval, hasBudgetRequest } = req.body;
  if (!address || !settlementId || !settlementName || !reporterName || !familyEmail) {
    return res.status(400).json({ error: 'שדות חובה חסרים' });
  }
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  db.prepare(`
    INSERT INTO buildings (id, address, settlementId, settlementName, reporterName, familyEmail,
      hasDamageImages, hasEngineerReport, hasEligibilityCheck, apartmentsCount,
      hasSocialApproval, hasBudgetRequest, status)
    VALUES (@id, @address, @settlementId, @settlementName, @reporterName, @familyEmail,
      @hasDamageImages, @hasEngineerReport, @hasEligibilityCheck, @apartmentsCount,
      @hasSocialApproval, @hasBudgetRequest, 'WAITING_FOR_VALIDATION')
  `).run({ id, address, settlementId, settlementName, reporterName, familyEmail,
    hasDamageImages: hasDamageImages ? 1 : 0,
    hasEngineerReport: hasEngineerReport ? 1 : 0,
    hasEligibilityCheck: hasEligibilityCheck ? 1 : 0,
    apartmentsCount: apartmentsCount || 0,
    hasSocialApproval: hasSocialApproval ? 1 : 0,
    hasBudgetRequest: hasBudgetRequest ? 1 : 0,
  });
  svc.addAuditLog(id, req.user.id, 'BUILDING_CREATED', `מבנה חדש נוסף: ${address}`);
  res.status(201).json(svc.getById(id));
});

// PATCH /api/buildings/:id/status - Ministry only
router.patch('/:id/status', requireRole('MINISTRY'), (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'סטטוס חסר' });
  try {
    const updated = svc.updateBuildingStatus(req.params.id, status, req.user.id);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/buildings/:id/conditions - Ministry or Municipality (own settlement only)
router.patch('/:id/conditions', requireRole('MINISTRY', 'MUNICIPALITY'), (req, res) => {
  const building = svc.getBuildingById(req.params.id);
  if (!building) return res.status(404).json({ error: 'מבנה לא נמצא' });
  if (req.user.role === 'MUNICIPALITY' && building.settlementId !== req.user.settlementId) {
    return res.status(403).json({ error: 'גישה אסורה' });
  }
  const allowed = ['hasDamageImages','hasEngineerReport','hasEligibilityCheck',
    'apartmentsCount','hasSocialApproval','hasBudgetRequest'];
  const fields = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) fields[k] = req.body[k] ? 1 : 0; });
  if (req.body.apartmentsCount !== undefined) fields.apartmentsCount = Number(req.body.apartmentsCount);
  const updated = svc.updateConditions(req.params.id, fields, req.user.id);
  res.json(updated);
});

module.exports = router;
