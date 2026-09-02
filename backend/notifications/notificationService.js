const db = require('../database/db');
const mockEmail = require('./mockEmailServer');
const { v4: uuidv4 } = require('uuid');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Sends a notification with full idempotency and retry logic.
 * Returns { status: 'SENT' | 'FAILED' | 'ALREADY_SENT', notificationLog }
 */
async function sendNotification({ buildingId, recipientEmail, subject, body, idempotencyKey, userId }) {
  // Idempotency check: if already sent successfully, return ALREADY_SENT
  const existing = db.prepare(
    `SELECT * FROM notification_logs WHERE idempotencyKey = ?`
  ).get(idempotencyKey);

  if (existing && existing.status === 'SENT') {
    const log = logNotification({
      buildingId,
      idempotencyKey: `${idempotencyKey}:dup-${Date.now()}`,
      status: 'ALREADY_SENT',
      attemptNumber: 1,
      recipientEmail,
      subject,
      messageId: existing.messageId,
    });
    return { status: 'ALREADY_SENT', notificationLog: log };
  }

  // Retry loop
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await mockEmail.sendEmail({ to: recipientEmail, subject, body });
      const log = logNotification({
        buildingId,
        idempotencyKey,
        status: 'SENT',
        attemptNumber: attempt,
        recipientEmail,
        subject,
        messageId: result.messageId,
      });
      console.log(`[NOTIFICATION] SENT to ${recipientEmail} on attempt ${attempt} — key: ${idempotencyKey}`);
      return { status: 'SENT', notificationLog: log };
    } catch (err) {
      lastError = err.message;
      console.warn(`[NOTIFICATION] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS * attempt);
    }
  }

  // All retries exhausted
  const log = logNotification({
    buildingId,
    idempotencyKey,
    status: 'FAILED',
    attemptNumber: MAX_RETRIES,
    recipientEmail,
    subject,
    errorMessage: lastError,
  });
  console.error(`[NOTIFICATION] FAILED after ${MAX_RETRIES} attempts — key: ${idempotencyKey}`);
  return { status: 'FAILED', notificationLog: log };
}

function logNotification({ buildingId, idempotencyKey, status, attemptNumber, recipientEmail, subject, messageId, errorMessage }) {
  // Use REPLACE to handle duplicate idempotency keys from retries
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT OR REPLACE INTO notification_logs
        (id, messageId, buildingId, idempotencyKey, status, attemptNumber, errorMessage, recipientEmail, subject, timestamp)
      VALUES
        (@id, @messageId, @buildingId, @idempotencyKey, @status, @attemptNumber, @errorMessage, @recipientEmail, @subject, datetime('now'))
    `).run({
      id,
      messageId: messageId || null,
      buildingId,
      idempotencyKey,
      status,
      attemptNumber,
      errorMessage: errorMessage || null,
      recipientEmail,
      subject,
    });
  } catch {
    // If the REPLACE fails (e.g. unique constraint for ALREADY_SENT variant), just log
  }
  return db.prepare(`SELECT * FROM notification_logs WHERE idempotencyKey = ?`).get(idempotencyKey);
}

// Routes for notification logs
const express = require('express');
const { authenticate, requireRole } = require('../middleware/authorizationPolicy');
const router = express.Router();

router.use(authenticate, requireRole('MINISTRY'));

router.get('/', (req, res) => {
  const { buildingId, status, page = 1, limit = 20 } = req.query;
  let query = `SELECT nl.*, b.address FROM notification_logs nl JOIN buildings b ON nl.buildingId = b.id WHERE 1=1`;
  const params = {};
  if (buildingId) { query += ' AND nl.buildingId = @buildingId'; params.buildingId = buildingId; }
  if (status) { query += ' AND nl.status = @status'; params.status = status; }
  const countResult = db.prepare(`SELECT COUNT(*) as total FROM (${query})`).get(params);
  query += ' ORDER BY nl.timestamp DESC LIMIT @limit OFFSET @offset';
  params.limit = Number(limit);
  params.offset = (Number(page) - 1) * Number(limit);
  const logs = db.prepare(query).all(params);
  res.json({ logs, total: countResult.total, page: Number(page), limit: Number(limit) });
});

module.exports = { sendNotification, router };
