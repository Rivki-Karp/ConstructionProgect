const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database/db');
const { JWT_SECRET } = require('./middleware/authorizationPolicy');

const app = express();
app.use(cors());
app.use(express.json());

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'שם משתמש וסיסמה נדרשים' });
  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, fullName: user.fullName, role: user.role, settlementId: user.settlementId },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, settlementId: user.settlementId } });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'לא מחובר' });
  try {
    const user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    res.json(user);
  } catch {
    res.status(401).json({ error: 'סשן פג תוקף' });
  }
});

// Domain routes
app.use('/api/buildings', require('./domains/buildings/routes'));
app.use('/api/assessments', require('./domains/assessments/routes'));
app.use('/api/municipal-approvals', require('./domains/municipalApprovals/routes'));
app.use('/api/settlement-processes', require('./domains/settlementProcesses/routes'));
app.use('/api/notifications', require('./notifications/notificationService').router);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'נתיב לא נמצא' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת פנימית' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🏗️  Building Rehab Management System - Backend`);
  console.log(`✅  Server running on http://localhost:${PORT}`);
  console.log(`📊  API ready at http://localhost:${PORT}/api\n`);
});
