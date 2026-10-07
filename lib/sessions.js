import Session from '@/lib/models/Session';
import Attendance from '@/lib/models/Attendance';
import { clusterForDate, normalizeSlot } from '@/lib/attendanceCalc';

/**
 * All conducted sessions as [{ date, slot, cluster }].
 * Falls back to rebuilding from Attendance if the Session collection is
 * empty while attendance exists (e.g. data restored from a backup).
 */
export async function getSessions() {
  const sessions = await Session.find({}, { _id: 0, date: 1, slot: 1, cluster: 1 }).lean();
  if (sessions.length || !(await Attendance.exists({}))) return sessions;
  return rebuildSessions();
}

/** Recreate the Session collection from present/absent Attendance records */
export async function rebuildSessions() {
  const agg = await Attendance.aggregate([
    { $match: { status: { $in: ['present', 'absent'] } } },
    { $group: {
        _id:      { date: '$date', slot: '$slot', cluster: '$cluster' },
        students: { $sum: 1 },
        present:  { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
    }},
  ]);

  const merged = new Map();
  for (const { _id, students, present } of agg) {
    const s = {
      date:    _id.date,
      slot:    normalizeSlot(_id.slot),
      cluster: _id.cluster || clusterForDate(_id.date),
    };
    const k = `${s.date}|${s.slot}|${s.cluster}`;
    const prev = merged.get(k) || { ...s, students: 0, present: 0 };
    prev.students += students;
    prev.present  += present;
    merged.set(k, prev);
  }
  const docs = [...merged.values()];

  await Session.deleteMany({});
  if (docs.length) await Session.insertMany(docs, { ordered: false });
  return docs.map(({ date, slot, cluster }) => ({ date, slot, cluster }));
}
