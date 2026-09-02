// Simulated email server with configurable failure rate for demo/testing
const { v4: uuidv4 } = require('uuid');

const FAILURE_RATE = 0.25; // 25% random failure to demonstrate retry logic

async function sendEmail({ to, subject, body }) {
  await new Promise(r => setTimeout(r, 150 + Math.random() * 200)); // simulate latency

  if (Math.random() < FAILURE_RATE) {
    const errors = [
      'ETIMEDOUT: connection timed out',
      'ECONNREFUSED: connection refused by mail server',
      'RESPONSE_LOST: acknowledgment not received',
    ];
    throw new Error(errors[Math.floor(Math.random() * errors.length)]);
  }

  return { messageId: uuidv4(), timestamp: new Date().toISOString() };
}

module.exports = { sendEmail };
