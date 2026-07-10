// backend/server.js — RoadAlert Chennai v2.0
'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer  = require('multer');
const { initDB } = require('../database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── DATABASE ──────────────────────────────────────────────────────────────────
let db;
try {
  db = initDB();
} catch (e) {
  console.error('\n❌  Database error:', e.message);
  process.exit(1);
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const UPLOADS = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
app.use('/uploads', express.static(UPLOADS));

// ── MULTER ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_q, _f, cb) => cb(null, UPLOADS),
  filename:    (_q, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4().slice(0,8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_q, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype);
    cb(null, ok);
  }
});

// ── WARD COORDS (Chennai) ─────────────────────────────────────────────────────
const WARD_COORDS = {
  'Ward 1 – Central': { lat: 13.0827, lng: 80.2707 },
  'Ward 2 – North':   { lat: 13.0900, lng: 80.2100 },
  'Ward 3 – South':   { lat: 13.0400, lng: 80.2334 },
  'Ward 4 – East':    { lat: 13.0067, lng: 80.2206 },
  'Ward 5 – West':    { lat: 12.9815, lng: 80.2180 },
};

// ══════════════════════════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (_q, res) =>
  res.json({ success: true, message: 'RoadAlert Chennai server is running!', version: '2.0' }));

// ── GET /api/issues ───────────────────────────────────────────────────────────
app.get('/api/issues', (req, res) => {
  try {
    const issues = db.getIssues(req.query);
    res.json({ success: true, data: issues, count: issues.length });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── GET /api/issues/:id ───────────────────────────────────────────────────────
app.get('/api/issues/:id', (req, res) => {
  try {
    const issue = db.getIssue(req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });
    res.json({ success: true, data: issue });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── POST /api/issues ──────────────────────────────────────────────────────────
app.post('/api/issues', upload.single('photo'), (req, res) => {
  try {
    const { type, severity, street, landmark, ward, description, reporter, contact, username } = req.body;
    if (!type || !severity || !street || !ward || !description || !reporter) {
      return res.status(400).json({ success: false, error: 'Missing required fields: type, severity, street, ward, description, reporter' });
    }

    const base  = WARD_COORDS[ward] || { lat: 13.0827, lng: 80.2707 };
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const issue = db.createIssue({
      type, severity, street, landmark, ward, description, reporter, contact, photo, username: username || '',
      lat: base.lat + (Math.random() - 0.5) * 0.015,
      lng: base.lng + (Math.random() - 0.5) * 0.015,
    });

    console.log(`✅  New issue created: ${issue.id} — ${type} at ${street}`);
    res.status(201).json({ success: true, data: issue, message: `Issue ${issue.id} submitted to Chennai Municipal Corporation!` });
  } catch (e) {
    console.error('POST /api/issues error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── PATCH /api/issues/:id/status ─────────────────────────────────────────────
app.patch('/api/issues/:id/status', (req, res) => {
  try {
    const { status, note, changed_by } = req.body;
    if (!['reported','reviewing','fixed','rejected'].includes(status))
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    const issue = db.updateStatus(req.params.id, status, changed_by, note);
    if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── PATCH /api/issues/:id/assign ─────────────────────────────────────────────
app.patch('/api/issues/:id/assign', (req, res) => {
  try {
    const issue = db.assignCrew(req.params.id, req.body.assigned_to);
    if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });
    res.json({ success: true, message: `Assigned to ${req.body.assigned_to}` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── POST /api/issues/:id/vote ─────────────────────────────────────────────────
app.post('/api/issues/:id/vote', (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ success: false, error: 'session_id required' });
    if (db.hasVoted(req.params.id, session_id))
      return res.status(409).json({ success: false, error: 'Already voted' });
    const votes = db.addVote(req.params.id, session_id);
    res.json({ success: true, votes });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── DELETE /api/issues/:id ────────────────────────────────────────────────────
app.delete('/api/issues/:id', (req, res) => {
  try {
    const ok = db.deleteIssue(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Issue not found' });
    res.json({ success: true, message: 'Issue deleted' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── GET /api/stats ────────────────────────────────────────────────────────────
app.get('/api/stats', (_q, res) => {
  try {
    res.json({ success: true, data: db.getStats() });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── GET /api/crew ─────────────────────────────────────────────────────────────
app.get('/api/crew', (_q, res) => {
  try {
    res.json({ success: true, data: db.getCrew() });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── POST /api/feedback ────────────────────────────────────────────────────────
app.post('/api/feedback', (req, res) => {
  try {
    const { username, name, rating, category, message } = req.body;
    if (!message || !username) return res.status(400).json({ success: false, error: 'Message and username required' });
    const fb = db.addFeedback({ username, name, rating: rating || 5, category: category || 'General', message });
    res.status(201).json({ success: true, data: fb, message: 'Feedback submitted. Thank you!' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── GET /api/feedback ─────────────────────────────────────────────────────────
app.get('/api/feedback', (_q, res) => {
  try {
    res.json({ success: true, data: db.getFeedback() });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_q, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html')));

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  🚦  RoadAlert Chennai is running!');
  console.log(`  ➜   Open in browser: http://localhost:${PORT}`);
  console.log(`  ➜   Health check:    http://localhost:${PORT}/api/health`);
  console.log(`  ➜   Admin login:     username=admin  password=admin@1`);
  console.log('');
});
