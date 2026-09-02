const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM notification_logs;
  DELETE FROM audit_logs;
  DELETE FROM settlement_processes;
  DELETE FROM municipal_approvals;
  DELETE FROM assessments;
  DELETE FROM buildings;
  DELETE FROM users;
`);

const hash = (pw) => bcrypt.hashSync(pw, 10);

// Users
const users = [
  { id: uuidv4(), username: 'ministry_admin', password: hash('ministry123'), fullName: 'דוד לוי', role: 'MINISTRY', settlementId: null },
  { id: uuidv4(), username: 'muni_haifa', password: hash('haifa123'), fullName: 'שרה כהן', role: 'MUNICIPALITY', settlementId: 'haifa' },
  { id: uuidv4(), username: 'muni_tlv', password: hash('tlv123'), fullName: 'משה גולן', role: 'MUNICIPALITY', settlementId: 'tlv' },
  { id: uuidv4(), username: 'muni_beer_sheva', password: hash('beer123'), fullName: 'רינה אבידן', role: 'MUNICIPALITY', settlementId: 'beer_sheva' },
  { id: uuidv4(), username: 'appraiser1', password: hash('appraiser123'), fullName: 'יוסי מזרחי', role: 'APPRAISER', settlementId: null },
  { id: uuidv4(), username: 'appraiser2', password: hash('appraiser456'), fullName: 'נועה פרידמן', role: 'APPRAISER', settlementId: null },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, username, password, fullName, role, settlementId)
  VALUES (@id, @username, @password, @fullName, @role, @settlementId)
`);
users.forEach(u => insertUser.run(u));

// Buildings
const settlements = [
  { id: 'haifa', name: 'חיפה' },
  { id: 'tlv', name: 'תל אביב' },
  { id: 'beer_sheva', name: 'באר שבע' },
];

const buildingData = [
  // Haifa buildings
  { address: 'רחוב הרצל 12', settlementId: 'haifa', settlementName: 'חיפה', reporterName: 'אברהם ישראלי', familyEmail: 'avraham@example.com', hasDamageImages: 1, hasEngineerReport: 1, hasEligibilityCheck: 1, apartmentsCount: 30, hasSocialApproval: 1, hasBudgetRequest: 1, status: 'IN_REVIEW' },
  { address: 'שדרות הנשיא 5', settlementId: 'haifa', settlementName: 'חיפה', reporterName: 'מרים שפירא', familyEmail: 'miriam@example.com', hasDamageImages: 1, hasEngineerReport: 0, hasEligibilityCheck: 1, apartmentsCount: 15, hasSocialApproval: 0, hasBudgetRequest: 0, status: 'NEW' },
  { address: 'רחוב בן גוריון 88', settlementId: 'haifa', settlementName: 'חיפה', reporterName: 'יעקב ברוך', familyEmail: 'yaakov@example.com', hasDamageImages: 1, hasEngineerReport: 1, hasEligibilityCheck: 1, apartmentsCount: 8, hasSocialApproval: 1, hasBudgetRequest: 1, status: 'COMPLETED' },
  { address: 'רחוב פייר קניג 3', settlementId: 'haifa', settlementName: 'חיפה', reporterName: 'ליאת שמואל', familyEmail: 'liat@example.com', hasDamageImages: 0, hasEngineerReport: 0, hasEligibilityCheck: 0, apartmentsCount: 22, hasSocialApproval: 0, hasBudgetRequest: 0, status: 'WAITING_FOR_VALIDATION' },
  // TLV buildings
  { address: 'רחוב דיזנגוף 100', settlementId: 'tlv', settlementName: 'תל אביב', reporterName: 'אורי נחמן', familyEmail: 'uri@example.com', hasDamageImages: 1, hasEngineerReport: 1, hasEligibilityCheck: 1, apartmentsCount: 45, hasSocialApproval: 1, hasBudgetRequest: 1, status: 'IN_REVIEW' },
  { address: 'שדרות רוטשילד 22', settlementId: 'tlv', settlementName: 'תל אביב', reporterName: 'חנה ברגמן', familyEmail: 'hana@example.com', hasDamageImages: 1, hasEngineerReport: 1, hasEligibilityCheck: 0, apartmentsCount: 12, hasSocialApproval: 0, hasBudgetRequest: 0, status: 'NEW' },
  { address: 'רחוב אלנבי 55', settlementId: 'tlv', settlementName: 'תל אביב', reporterName: 'רועי עמית', familyEmail: 'roei@example.com', hasDamageImages: 0, hasEngineerReport: 0, hasEligibilityCheck: 0, apartmentsCount: 6, hasSocialApproval: 0, hasBudgetRequest: 0, status: 'WAITING_FOR_VALIDATION' },
  // Beer Sheva buildings
  { address: 'רחוב השלום 7', settlementId: 'beer_sheva', settlementName: 'באר שבע', reporterName: 'תמר אלון', familyEmail: 'tamar@example.com', hasDamageImages: 1, hasEngineerReport: 1, hasEligibilityCheck: 1, apartmentsCount: 28, hasSocialApproval: 1, hasBudgetRequest: 1, status: 'COMPLETED' },
  { address: 'רחוב כיכר העצמאות 1', settlementId: 'beer_sheva', settlementName: 'באר שבע', reporterName: 'נתן כץ', familyEmail: 'natan@example.com', hasDamageImages: 1, hasEngineerReport: 0, hasEligibilityCheck: 1, apartmentsCount: 18, hasSocialApproval: 0, hasBudgetRequest: 1, status: 'NEW' },
  { address: 'שדרות רגר 44', settlementId: 'beer_sheva', settlementName: 'באר שבע', reporterName: 'גלית שניר', familyEmail: 'galit@example.com', hasDamageImages: 1, hasEngineerReport: 1, hasEligibilityCheck: 1, apartmentsCount: 35, hasSocialApproval: 1, hasBudgetRequest: 1, status: 'IN_REVIEW' },
];

const insertBuilding = db.prepare(`
  INSERT INTO buildings (id, address, settlementId, settlementName, reporterName, familyEmail,
    hasDamageImages, hasEngineerReport, hasEligibilityCheck, apartmentsCount,
    hasSocialApproval, hasBudgetRequest, status)
  VALUES (@id, @address, @settlementId, @settlementName, @reporterName, @familyEmail,
    @hasDamageImages, @hasEngineerReport, @hasEligibilityCheck, @apartmentsCount,
    @hasSocialApproval, @hasBudgetRequest, @status)
`);

const buildingIds = [];
buildingData.forEach(b => {
  const id = uuidv4();
  buildingIds.push({ id, settlementId: b.settlementId });
  insertBuilding.run({ id, ...b });
});

// Assessments
const appraiser1 = users.find(u => u.username === 'appraiser1');
const appraiser2 = users.find(u => u.username === 'appraiser2');

const insertAssessment = db.prepare(`
  INSERT INTO assessments (id, buildingId, appraiserId, damageLevel, notes, inspectionDate)
  VALUES (@id, @buildingId, @appraiserId, @damageLevel, @notes, @inspectionDate)
`);

[
  { buildingId: buildingIds[0].id, appraiserId: appraiser1.id, damageLevel: 'MODERATE', notes: 'נזק בינוני לחזית הבניין. יש לטפל בסדקים.', inspectionDate: '2026-08-15' },
  { buildingId: buildingIds[2].id, appraiserId: appraiser1.id, damageLevel: 'MINOR', notes: 'נזק קל - שברים קלים בחלונות.', inspectionDate: '2026-08-20' },
  { buildingId: buildingIds[4].id, appraiserId: appraiser2.id, damageLevel: 'MODERATE', notes: 'נזק בינוני - יש צורך בחיזוק תקרה.', inspectionDate: '2026-08-18' },
  { buildingId: buildingIds[7].id, appraiserId: appraiser2.id, damageLevel: 'MINOR', notes: 'נזק קל מאוד - ניתן לאישור מהיר.', inspectionDate: '2026-08-22' },
  { buildingId: buildingIds[9].id, appraiserId: appraiser1.id, damageLevel: 'SEVERE', notes: 'נזק חמור לשלד הבניין. יש לפנות דיירים.', inspectionDate: '2026-08-25' },
].forEach(a => insertAssessment.run({ id: uuidv4(), ...a }));

// Municipal Approvals
const muniHaifa = users.find(u => u.username === 'muni_haifa');
const muniTlv = users.find(u => u.username === 'muni_tlv');
const muniBeer = users.find(u => u.username === 'muni_beer_sheva');

const insertApproval = db.prepare(`
  INSERT INTO municipal_approvals (id, buildingId, municipalityUserId, settlementId, waterOk, electricityOk, accessRoadsOk, hazardRemovalOk, approved, approvalDate, notes)
  VALUES (@id, @buildingId, @municipalityUserId, @settlementId, @waterOk, @electricityOk, @accessRoadsOk, @hazardRemovalOk, @approved, @approvalDate, @notes)
`);

[
  { buildingId: buildingIds[0].id, municipalityUserId: muniHaifa.id, settlementId: 'haifa', waterOk: 1, electricityOk: 1, accessRoadsOk: 1, hazardRemovalOk: 1, approved: 1, approvalDate: '2026-08-28', notes: 'כל הבדיקות תקינות' },
  { buildingId: buildingIds[2].id, municipalityUserId: muniHaifa.id, settlementId: 'haifa', waterOk: 1, electricityOk: 1, accessRoadsOk: 1, hazardRemovalOk: 1, approved: 1, approvalDate: '2026-08-26', notes: 'אושר לחזרה לבית' },
  { buildingId: buildingIds[4].id, municipalityUserId: muniTlv.id, settlementId: 'tlv', waterOk: 1, electricityOk: 1, accessRoadsOk: 0, hazardRemovalOk: 0, approved: 0, approvalDate: null, notes: 'יש לתקן גישה' },
  { buildingId: buildingIds[7].id, municipalityUserId: muniBeer.id, settlementId: 'beer_sheva', waterOk: 1, electricityOk: 1, accessRoadsOk: 1, hazardRemovalOk: 1, approved: 1, approvalDate: '2026-08-30', notes: 'מאושר' },
].forEach(a => insertApproval.run({ id: uuidv4(), ...a }));

// Audit Logs
const ministry = users.find(u => u.username === 'ministry_admin');
const insertAudit = db.prepare(`
  INSERT INTO audit_logs (id, buildingId, userId, action, details, createdAt)
  VALUES (@id, @buildingId, @userId, @action, @details, @createdAt)
`);

[
  { buildingId: buildingIds[0].id, userId: appraiser1.id, action: 'ASSESSMENT_CREATED', details: 'הוגשה הערכת נזק: בינוני', createdAt: '2026-08-15T10:30:00' },
  { buildingId: buildingIds[0].id, userId: muniHaifa.id, action: 'MUNICIPAL_APPROVAL_GRANTED', details: 'אושר אינפרסטרוקטורה עירונית', createdAt: '2026-08-28T14:15:00' },
  { buildingId: buildingIds[0].id, userId: ministry.id, action: 'STATUS_UPDATED', details: 'סטטוס עודכן ל: IN_REVIEW', createdAt: '2026-08-29T09:00:00' },
  { buildingId: buildingIds[2].id, userId: appraiser1.id, action: 'ASSESSMENT_CREATED', details: 'הוגשה הערכת נזק: קל', createdAt: '2026-08-20T11:00:00' },
  { buildingId: buildingIds[2].id, userId: muniHaifa.id, action: 'MUNICIPAL_APPROVAL_GRANTED', details: 'אושרה חזרה לבית', createdAt: '2026-08-26T16:00:00' },
  { buildingId: buildingIds[2].id, userId: ministry.id, action: 'RETURN_HOME_PACKAGE_SENT', details: 'חבילת חזרה לבית נשלחה למשפחה', createdAt: '2026-08-27T08:00:00' },
].forEach(a => insertAudit.run({ id: uuidv4(), ...a }));

// Notification Logs
const insertNotif = db.prepare(`
  INSERT INTO notification_logs (id, messageId, buildingId, idempotencyKey, status, attemptNumber, errorMessage, recipientEmail, subject, timestamp)
  VALUES (@id, @messageId, @buildingId, @idempotencyKey, @status, @attemptNumber, @errorMessage, @recipientEmail, @subject, @timestamp)
`);

[
  { messageId: uuidv4(), buildingId: buildingIds[2].id, idempotencyKey: `${buildingIds[2].id}:RETURN_HOME`, status: 'SENT', attemptNumber: 1, errorMessage: null, recipientEmail: 'yaakov@example.com', subject: 'הודעת חזרה לבית - רחוב בן גוריון 88', timestamp: '2026-08-27T08:00:00' },
  { messageId: null, buildingId: buildingIds[4].id, idempotencyKey: `${buildingIds[4].id}:RETURN_HOME`, status: 'FAILED', attemptNumber: 3, errorMessage: 'שגיאת חיבור לשרת הדוא"ל', recipientEmail: 'uri@example.com', subject: 'הודעת חזרה לבית - רחוב דיזנגוף 100', timestamp: '2026-08-29T10:00:00' },
  { messageId: uuidv4(), buildingId: buildingIds[7].id, idempotencyKey: `${buildingIds[7].id}:RETURN_HOME`, status: 'SENT', attemptNumber: 1, errorMessage: null, recipientEmail: 'tamar@example.com', subject: 'הודעת חזרה לבית - רחוב השלום 7', timestamp: '2026-08-30T12:00:00' },
  { messageId: uuidv4(), buildingId: buildingIds[7].id, idempotencyKey: `${buildingIds[7].id}:RETURN_HOME_RETRY`, status: 'ALREADY_SENT', attemptNumber: 1, errorMessage: null, recipientEmail: 'tamar@example.com', subject: 'הודעת חזרה לבית - רחוב השלום 7', timestamp: '2026-08-30T12:05:00' },
].forEach(n => insertNotif.run({ id: uuidv4(), ...n }));

console.log('Database seeded successfully!');
console.log('\nLogin credentials:');
console.log('Ministry: ministry_admin / ministry123');
console.log('Municipality Haifa: muni_haifa / haifa123');
console.log('Municipality TLV: muni_tlv / tlv123');
console.log('Municipality Beer Sheva: muni_beer_sheva / beer123');
console.log('Appraiser 1: appraiser1 / appraiser123');
console.log('Appraiser 2: appraiser2 / appraiser456');
