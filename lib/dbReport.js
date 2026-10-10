import mongoose from 'mongoose';
import { connectDB, DB_NAME } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import Session from '@/lib/models/Session';
import SelfAttendance from '@/lib/models/SelfAttendance';
// Imported only so every schema is registered for the field comparison
import '@/lib/models/AuditLog';
import '@/lib/models/CalendarDay';
import '@/lib/models/Feedback';
import '@/lib/models/KnowledgeEntry';
import '@/lib/models/ManualList';
import '@/lib/models/Policy';
import '@/lib/models/Update';

const SAMPLE = 20000;   // field scan uses a random sample above this many docs
const BSON_TYPE = { string: 'String', date: 'Date', int: 'Number', long: 'Number', double: 'Number',
  bool: 'Boolean', objectId: 'ObjectId', array: 'Array', object: 'Object', null: 'null' };

/**
 * Full health report of the batch database: collections, every field found
 * vs. the Mongoose schema, data-integrity checks and (optionally) one row
 * per user account. Read-only.
 */
export async function buildDbReport({ withUsers = false } = {}) {
  await connectDB();
  const db = mongoose.connection.db;
  const models = Object.values(mongoose.models);
  const modelFor = name => models.find(m => m.collection.collectionName === name);

  const names = (await db.listCollections({ type: 'collection' }).toArray())
    .map(c => c.name).filter(n => !n.startsWith('system.')).sort();

  const overview = [], fields = [];
  for (const name of names) {
    const coll  = db.collection(name);
    const model = modelFor(name);
    const [count, indexes, sizeMB, indexDiff] = await Promise.all([
      coll.estimatedDocumentCount(),
      coll.indexes(),
      collSizeMB(coll),
      model ? model.diffIndexes().catch(() => null) : null,
    ]);
    overview.push({
      Collection: name,
      Model: model?.modelName || '— (no model)',
      Documents: count,
      'Size (MB)': sizeMB,
      Indexes: indexes.map(i => i.name).join(', '),
      'Missing indexes': indexDiff?.toCreate?.map(k => Object.keys(k).join('+')).join(', ') || '',
    });

    const scanned = Math.min(count, SAMPLE);
    const found = count ? await coll.aggregate([
      ...(count > SAMPLE ? [{ $sample: { size: SAMPLE } }] : []),
      { $project: { kv: { $objectToArray: '$$ROOT' } } },
      { $unwind: '$kv' },
      { $group: { _id: { k: '$kv.k', t: { $type: '$kv.v' } }, n: { $sum: 1 } } },
    ], { allowDiskUse: true }).toArray() : [];

    const byField = new Map();
    for (const { _id: { k, t }, n } of found) {
      const f = byField.get(k) || { types: {}, n: 0 };
      f.types[BSON_TYPE[t] || t] = (f.types[BSON_TYPE[t] || t] || 0) + n;
      f.n += n;
      byField.set(k, f);
    }
    const paths = model ? Object.entries(model.schema.paths) : [];
    for (const [p] of paths) if (!byField.has(p)) byField.set(p, { types: {}, n: 0 });

    for (const [field, { types, n }] of [...byField].sort(([a], [b]) => a.localeCompare(b))) {
      const path = model?.schema.paths[field];
      fields.push({
        Collection: name,
        Field: field,
        'Types found': Object.entries(types).map(([t, c]) => `${t} (${c})`).join(', ') || '—',
        'Schema type': path ? path.instance : field === '__v' ? 'version key' : model ? 'NOT IN SCHEMA' : '—',
        Required: path?.isRequired ? 'yes' : '',
        Unique: path?.options?.unique ? 'yes' : '',
        Default: path && path.defaultValue !== undefined && typeof path.defaultValue !== 'function' ? JSON.stringify(path.defaultValue) : '',
        Present: n,
        'Fill %': scanned ? Math.round(n / scanned * 1000) / 10 : 0,
        Scanned: count > SAMPLE ? `sample of ${scanned}` : scanned,
      });
    }
  }

  const checks = await integrityChecks();
  const report = { database: DB_NAME, generatedAt: new Date().toISOString(), overview, fields, checks };
  if (withUsers) report.users = await userRows();
  return report;
}

async function collSizeMB(coll) {
  try {
    const [s] = await coll.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
    return Math.round((s.storageStats.size / 1e6) * 100) / 100;
  } catch { return ''; }
}

async function integrityChecks() {
  const [students, studentUsers, admins, attRolls, selfRolls, attSessions, sessionCount, noCluster, badStudents] = await Promise.all([
    Student.find({}, { _id: 0, rollNumber: 1 }).lean(),
    User.find({ role: 'student' }, { _id: 0, username: 1, rollNumber: 1, mustChangePassword: 1, lastSeenAt: 1 }).lean(),
    User.find({ role: { $ne: 'student' } }, { _id: 0, username: 1 }).lean(),
    Attendance.distinct('rollNumber'),
    SelfAttendance.distinct('rollNumber'),
    Attendance.aggregate([{ $match: { status: { $in: ['present', 'absent'] } } },
      { $group: { _id: { d: '$date', s: '$slot', c: '$cluster' } } }, { $count: 'n' }]),
    Session.estimatedDocumentCount(),
    Attendance.countDocuments({ $or: [{ cluster: '' }, { cluster: null }] }),
    Student.find({ $or: ['cluster', 'crtSec', 'crtRoom', 'branch'].map(f => ({ [f]: { $in: ['', null] } })) },
      { _id: 0, rollNumber: 1 }).lean(),
  ]);

  const rolls     = new Set(students.map(s => s.rollNumber));
  const userRolls = new Set(studentUsers.map(u => (u.rollNumber || '').toUpperCase()));
  const lower     = [...studentUsers, ...admins].map(u => u.username.toLowerCase());
  const dupNames  = [...new Set(lower.filter((u, i) => lower.indexOf(u) !== i))];

  const list = arr => arr.slice(0, 15).join(', ') + (arr.length > 15 ? ` … +${arr.length - 15} more` : '');
  const check = (Check, bad, { info = false, detail } = {}) => ({
    Check,
    Status: !bad.length ? 'OK' : info ? 'INFO' : 'WARN',
    Count: bad.length,
    Detail: detail ?? list(bad),
  });

  const noAccount   = [...rolls].filter(r => !userRolls.has(r));
  const noStudent   = studentUsers.filter(u => !rolls.has((u.rollNumber || '').toUpperCase())).map(u => u.username);
  const nameMismatch = studentUsers.filter(u => u.username.toUpperCase() !== (u.rollNumber || '').toUpperCase()).map(u => u.username);
  const attOrphans  = attRolls.filter(r => !rolls.has(r));
  const selfOrphans = selfRolls.filter(r => !rolls.has(r));
  const attSess     = attSessions[0]?.n || 0;
  const defaultPw   = studentUsers.filter(u => u.mustChangePassword).map(u => u.username);
  const neverSeen   = studentUsers.filter(u => !u.lastSeenAt).map(u => u.username);

  return [
    check('Students without a login account', noAccount),
    check('Student logins without a student record', noStudent),
    check('Username differs from roll number', nameMismatch),
    check('Duplicate usernames (case-insensitive)', dupNames),
    check('Attendance rows for unknown roll numbers', attOrphans),
    check('Self-attendance for unknown roll numbers', selfOrphans),
    check('Attendance rows without a cluster', Array(noCluster).fill(0), { detail: noCluster ? `${noCluster} rows` : '' }),
    check('Students missing cluster / section / room / branch', badStudents.map(s => s.rollNumber)),
    check('Session index matches attendance', attSess === sessionCount ? [] : [1],
      { detail: `${sessionCount} sessions stored, ${attSess} found in attendance` }),
    check('Students still on default password', defaultPw, { info: true, detail: `${defaultPw.length} of ${studentUsers.length}` }),
    check('Students not seen since activity tracking began', neverSeen, { info: true, detail: `${neverSeen.length} of ${studentUsers.length}` }),
  ];
}

async function userRows() {
  const [users, students] = await Promise.all([
    User.find({}, { passwordHash: 0, resetToken: 0, resetTokenExpiry: 0 }).sort({ role: 1, username: 1 }).lean(),
    Student.find({}, { _id: 0, rollNumber: 1, name: 1, cluster: 1, crtSec: 1, branch: 1 }).lean(),
  ]);
  const byRoll = new Map(students.map(s => [s.rollNumber, s]));
  const iso = d => (d ? new Date(d).toISOString() : '');
  return users.map(u => {
    const s = byRoll.get((u.rollNumber || '').toUpperCase());
    return {
      Username: u.username,
      Role: u.role,
      'Roll number': u.rollNumber || '',
      Name: s?.name || '',
      Cluster: s?.cluster || '',
      Section: s?.crtSec || '',
      Branch: s?.branch || '',
      'Student record': u.role === 'student' ? (s ? 'yes' : 'MISSING') : '',
      Email: u.email || '',
      'Must change password': u.mustChangePassword ? 'yes' : 'no',
      'Last login': iso(u.lastLoginAt),
      'Last seen': iso(u.lastSeenAt),
      'Login count': u.loginCount || 0,
      Permissions: u.role === 'admin' ? (Array.isArray(u.permissions) ? u.permissions.join(', ') : 'full access') : '',
      'Created at': iso(u.createdAt),
    };
  });
}
