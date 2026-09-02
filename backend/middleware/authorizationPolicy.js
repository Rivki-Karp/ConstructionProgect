const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rehab-system-secret-key-2026';

// Attach decoded user to req.user
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'נדרשת אימות - אנא התחבר' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'הסשן פג תוקף - אנא התחבר מחדש' });
  }
}

// Role enforcement
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
    }
    next();
  };
}

// Municipality users can only see buildings matching their settlementId
function enforceTenancy(req, res, next) {
  if (req.user.role === 'MUNICIPALITY') {
    const settlementId = req.params.settlementId || req.query.settlementId || req.body?.settlementId;
    if (settlementId && settlementId !== req.user.settlementId) {
      return res.status(403).json({ error: 'גישה אסורה - אינך מורשה לישוב זה' });
    }
    // Inject settlementId filter automatically for list queries
    req.tenantSettlementId = req.user.settlementId;
  }
  next();
}

// Verify a specific building belongs to municipality's settlement
function enforceBuildingTenancy(getBuildingFn) {
  return async (req, res, next) => {
    if (req.user.role !== 'MUNICIPALITY') return next();
    const building = getBuildingFn(req.params.id || req.params.buildingId);
    if (!building) return res.status(404).json({ error: 'מבנה לא נמצא' });
    if (building.settlementId !== req.user.settlementId) {
      return res.status(403).json({ error: 'גישה אסורה - המבנה אינו בישוב שלך' });
    }
    req.building = building;
    next();
  };
}

const JWT_SECRET_EXPORT = JWT_SECRET;

module.exports = {
  authenticate,
  requireRole,
  enforceTenancy,
  enforceBuildingTenancy,
  JWT_SECRET: JWT_SECRET_EXPORT,
};
