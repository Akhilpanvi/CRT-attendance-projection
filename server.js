require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'crt-kl-secret-2024';
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crt_attendance';
mongoose.connect(MONGO_URI)
  .then(() => { console.log('✅ MongoDB connected'); initAdmin(); })
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Schemas ──────────────────────────────────────────────────────────────────
const StudentSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:       { type: String, required: true, trim: true },
  branch:     { type: String, default: '' },
  dept:       { type: String, default: '' },
  cluster:    { type: String, default: '' },
  crtSec:     { type: String, default: '' },
  crtRoom:    { type: String, default: '' },
  sno:        { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username:           { type: String, required: true, unique: true },
  passwordHash:       { type: String, required: true },
  role:               { type: String, enum: ['admin', 'student'], default: 'student' },
  rollNumber:         { type: String, default: '' },
  mustChangePassword: { type: Boolean, default: false },
  createdAt:          { type: Date, default: Date.now }
});

const AttendanceSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, uppercase: true },
  date:       { type: String, required: true },   // YYYY-MM-DD
  week:       { type: Number, required: true },
  year:       { type: Number, required: true },
  slot:       { type: String, required: true },   // e.g. "09:20-10:10"
  status:     { type: String, enum: ['present', 'absent'], required: true },
  markedAt:   { type: Date, default: Date.now }
});
AttendanceSchema.index({ rollNumber: 1, date: 1, slot: 1 }, { unique: true });

const Student   = mongoose.model('Student', StudentSchema);
const User      = mongoose.model('User', UserSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

// Standard CRT time slots
const TIME_SLOTS = [
  '09:20-10:10', '10:10-11:00', '11:10-12:00', '12:00-12:50',
  '01:50-02:40', '02:40-03:40', '03:50-04:30', '04:30-05:30'
];

// ─── Init admin ───────────────────────────────────────────────────────────────
async function initAdmin() {
  const exists = await User.findOne({ username: 'CRT' });
  if (!exists) {
    const passwordHash = await bcrypt.hash('CRT999', 10);
    await User.create({ username: 'CRT', passwordHash, role: 'admin', mustChangePassword: false });
    console.log('✅ Admin CRT created (password: CRT999)');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

async function getStudentStats(rollNumber, full = false) {
  const records = await Attendance.find({ rollNumber }).sort({ date: 1, slot: 1 });
  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const overallPct = total > 0 ? Math.round((present / total) * 100) : 0;

  if (!full) return { total, present, absent: total - present, overallPct };

  // Group by date for table display
  const byDate = {};
  const slots  = new Set();
  for (const r of records) {
    if (!byDate[r.date]) byDate[r.date] = {};
    byDate[r.date][r.slot] = r.status;
    slots.add(r.slot);
  }

  // Weekly breakdown
  const weekMap = {};
  for (const r of records) {
    const key = `${r.year}-W${String(r.week).padStart(2, '0')}`;
    if (!weekMap[key]) weekMap[key] = { total: 0, present: 0, week: r.week, year: r.year };
    weekMap[key].total++;
    if (r.status === 'present') weekMap[key].present++;
  }
  const weeks = Object.values(weekMap).map(w => ({
    ...w,
    pct:  w.total > 0 ? Math.round((w.present / w.total) * 100) : 0,
    safe: w.total > 0 ? (w.present / w.total) >= 0.75 : true
  })).sort((a, b) => b.year - a.year || b.week - a.week);

  // Ordered slots: standard ones first, then any extras
  const orderedSlots = [
    ...TIME_SLOTS.filter(s => slots.has(s)),
    ...[...slots].filter(s => !TIME_SLOTS.includes(s))
  ];

  return { total, present, absent: total - present, overallPct, byDate, weeks, slots: orderedSlots };
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role, rollNumber: user.rollNumber },
      JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({ token, role: user.role, rollNumber: user.rollNumber, mustChangePassword: user.mustChangePassword, username: user.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.userId, { passwordHash, mustChangePassword: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CSV Upload ────────────────────────────────────────────────────────────────
// Expected CSV columns: S.NO, NAME, BRANCH, DEPT, CLUSTER, CRT SEC, CRT ROOM, REGD.NO,
//   09:20-10:10, 10:10-11:00, 11:10-12:00, 12:00-12:50, 01:50-02:40, 02:40-03:40, 03:50-04:30, 04:30-5:30
// Slot values: P or A
app.post('/api/admin/upload-csv', auth, adminOnly, upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);

    const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

    const cols = Object.keys(rows[0]);
    const find = (pats) => cols.find(c => pats.some(p => p.test(c.trim())));

    const rollCol    = find([/regd\.?no/i, /reg\.?no/i, /roll/i]);
    const nameCol    = find([/^name$/i]);
    const branchCol  = find([/^branch$/i]);
    const deptCol    = find([/^dept$/i]);
    const clusterCol = find([/^cluster$/i]);
    const crtSecCol  = find([/crt\s*sec/i]);
    const crtRoomCol = find([/crt\s*room/i, /^room$/i]);
    const snoCol     = find([/^s\.?no$/i, /^sno$/i]);

    if (!rollCol || !nameCol)
      return res.status(400).json({ error: 'CSV must have NAME and REGD.NO columns' });

    const attendanceDate = req.body.date || new Date().toISOString().split('T')[0];
    const week = getWeekNumber(attendanceDate);
    const year = new Date(attendanceDate).getFullYear();

    const knownCols = [rollCol, nameCol, branchCol, deptCol, clusterCol, crtSecCol, crtRoomCol, snoCol].filter(Boolean);
    const slotCols  = cols.filter(c => !knownCols.includes(c));

    let created = 0, updated = 0, attendanceCount = 0;
    const errors = [];

    for (const row of rows) {
      const rollNumber = row[rollCol]?.trim().toUpperCase();
      const name       = row[nameCol]?.trim();
      if (!rollNumber || !name) continue;

      const studentData = {
        name,
        branch:  branchCol  ? (row[branchCol]  || '') : '',
        dept:    deptCol    ? (row[deptCol]    || '') : '',
        cluster: clusterCol ? (row[clusterCol] || '') : '',
        crtSec:  crtSecCol  ? (row[crtSecCol]  || '') : '',
        crtRoom: crtRoomCol ? (row[crtRoomCol] || '') : '',
        sno:     snoCol     ? (parseInt(row[snoCol]) || 0) : 0,
      };

      try {
        const existing = await Student.findOne({ rollNumber });
        if (existing) { await Student.findOneAndUpdate({ rollNumber }, studentData); updated++; }
        else           { await Student.create({ rollNumber, ...studentData }); created++; }

        // Create student login if not exists
        if (!await User.findOne({ username: rollNumber })) {
          const passwordHash = await bcrypt.hash(rollNumber, 10);
          await User.create({ username: rollNumber, passwordHash, role: 'student', rollNumber, mustChangePassword: true });
        }

        // Import attendance for each slot column
        for (const slotCol of slotCols) {
          const val = row[slotCol]?.trim().toUpperCase();
          if (!val || !['P', 'A'].includes(val)) continue;
          const status = val === 'P' ? 'present' : 'absent';
          await Attendance.findOneAndUpdate(
            { rollNumber, date: attendanceDate, slot: slotCol },
            { status, week, year, markedAt: new Date() },
            { upsert: true, new: true }
          );
          attendanceCount++;
        }
      } catch (e) { errors.push(`${rollNumber}: ${e.message}`); }
    }

    res.json({ success: true, created, updated, attendanceCount, total: rows.length, slotCols, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.get('/api/admin/students', auth, adminOnly, async (req, res) => {
  try {
    const students = await Student.find().sort({ sno: 1, name: 1 });
    const result = await Promise.all(students.map(async s => {
      const stats = await getStudentStats(s.rollNumber, false);
      return { ...s.toObject(), stats };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/time-slots', auth, adminOnly, (req, res) => res.json(TIME_SLOTS));

// ─── Student Routes ────────────────────────────────────────────────────────────
app.get('/api/students/:rollNumber', auth, async (req, res) => {
  try {
    const roll = req.params.rollNumber.toUpperCase();
    if (req.user.role !== 'admin' && req.user.rollNumber !== roll)
      return res.status(403).json({ error: 'Access denied' });
    const student = await Student.findOne({ rollNumber: roll });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const stats = await getStudentStats(roll, true);
    res.json({ student, stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Attendance Routes ────────────────────────────────────────────────────────
app.post('/api/attendance/mark', auth, adminOnly, async (req, res) => {
  try {
    const { rollNumber, slot, status, date } = req.body;
    const roll = rollNumber?.toUpperCase();
    if (!roll || !slot || !status)
      return res.status(400).json({ error: 'rollNumber, slot and status required' });
    if (!await Student.findOne({ rollNumber: roll }))
      return res.status(404).json({ error: 'Student not found' });
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const week = getWeekNumber(attendanceDate);
    const year = new Date(attendanceDate).getFullYear();
    const record = await Attendance.findOneAndUpdate(
      { rollNumber: roll, date: attendanceDate, slot },
      { status, week, year, markedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve frontend
app.get('/{*any}', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 CRT Attendance Portal running at http://localhost:${PORT}`));
