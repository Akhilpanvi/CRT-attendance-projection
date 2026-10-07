import Attendance from '@/lib/models/Attendance';
import { normalizeCluster, slotsByCluster } from '@/lib/attendanceCalc';

/**
 * Attach attendance stats to many students in one aggregation.
 * Each student's total = sessions held for their own cluster.
 *
 * @param {Array} students   Student docs (lean)
 * @param {Array} sessions   from getSessions()
 * @param {{ everyone?: boolean }} opts  everyone=true skips the roll-number
 *        filter (cheaper than a huge $in when stats are needed for all students)
 */
export async function attachStats(students, sessions, { everyone = false } = {}) {
  const byCluster    = slotsByCluster(sessions);
  const workingDates = Object.keys(byCluster[''].slotsPerDate);

  const agg = students.length && workingDates.length
    ? await Attendance.aggregate([
        { $match: {
            ...(everyone ? {} : { rollNumber: { $in: students.map(s => s.rollNumber) } }),
            date:   { $in: workingDates },
            status: { $in: ['present', 'sp'] },
        }},
        { $group: {
            _id:     '$rollNumber',
            present: { $sum: 1 },
            sp:      { $sum: { $cond: [{ $eq: ['$status', 'sp'] }, 1, 0] } },
        }},
      ])
    : [];
  const map = new Map(agg.map(a => [a._id, a]));

  return students.map(s => {
    const cluster    = normalizeCluster(s.cluster);
    const total      = byCluster[cluster].totalSlots;
    const present    = Math.min(total, map.get(s.rollNumber)?.present || 0);
    const sp         = Math.min(present, map.get(s.rollNumber)?.sp || 0);
    const origPres   = present - sp;
    const overallPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const origPct    = total > 0 ? Math.round((origPres / total) * 100) : 0;
    return {
      ...s,
      stats: { total, present, absent: total - present, sp, overallPct, pct: overallPct, origPresent: origPres, origPct },
    };
  });
}
