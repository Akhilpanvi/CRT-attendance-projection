import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import CalendarDay from '@/lib/models/CalendarDay';
import { buildCalendar } from '@/lib/calendar';
import { getSessions } from '@/lib/sessions';
import { TIME_SLOTS, getWeekNumber } from '@/lib/helpers';
import { buildSlotsPerDate, computeStudentStats, normalizeCluster, SESSIONS_PER_WEEK } from '@/lib/attendanceCalc';

/** Student's cluster from their profile, else the cluster most of their records carry */
export function resolveCluster(student, records = []) {
  const own = normalizeCluster(student?.cluster);
  if (own) return own;
  const counts = {};
  for (const r of records) if (r.cluster) counts[r.cluster] = (counts[r.cluster] || 0) + 1;
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || '';
}

/**
 * Full dashboard payload for one student, or null if not found.
 * Only sessions of the student's own cluster count towards their total.
 */
export async function getStudentReport(roll) {
  const [student, records, sessions, holidays] = await Promise.all([
    Student.findOne({ rollNumber: roll }).lean(),
    Attendance.find({ rollNumber: roll }, { _id: 0, date: 1, slot: 1, status: 1, cluster: 1 }).lean(),
    getSessions(),
    CalendarDay.find({}, { _id: 0, date: 1, cluster: 1, reason: 1 }).lean(),
  ]);
  if (!student) return null;

  const cluster = resolveCluster(student, records);
  const { slotsPerDate } = buildSlotsPerDate(sessions, cluster);

  // Missing slots on the cluster's session days → absent
  const { total, present, absent, sp, overallPct, byDate } = computeStudentStats(records, slotsPerDate);

  // Weekly breakdown
  const weekMap = {};
  for (const [date, slotStatuses] of Object.entries(byDate)) {
    const wk  = getWeekNumber(date);
    const yr  = new Date(date + 'T00:00:00Z').getUTCFullYear();
    const key = `${yr}-W${String(wk).padStart(2, '0')}`;
    if (!weekMap[key]) weekMap[key] = { total: 0, present: 0, week: wk, year: yr };
    for (const status of Object.values(slotStatuses)) {
      weekMap[key].total++;
      if (status === 'present' || status === 'sp') weekMap[key].present++;
    }
  }
  const weeks = Object.values(weekMap).map(w => ({
    ...w,
    pct:  w.total > 0 ? Math.round((w.present / w.total) * 100) : 0,
    safe: w.total > 0 ? (w.present / w.total) >= 0.75 : true,
  })).sort((a, b) => b.year - a.year || b.week - a.week);

  // Ordered slot list for the UI (matches TIME_SLOTS order where possible)
  const allSlots = new Set(Object.values(slotsPerDate).flat());
  const orderedSlots = [
    ...TIME_SLOTS.filter(s => allSlots.has(s)),
    ...[...allSlots].filter(s => !TIME_SLOTS.includes(s)),
  ];

  // Scheduled days of the student's cluster that are not counted (yet)
  const missingDays = cluster
    ? buildCalendar(sessions, holidays, [cluster])
        .filter(d => d.status !== 'uploaded')
        .map(({ date, day, status, reason, today, future }) => ({ date, day, status, reason, today, future }))
    : [];

  return {
    student: { ...student, cluster: cluster || student.cluster || '' },
    stats: {
      total, present, absent, sp, overallPct, byDate, weeks,
      slots: orderedSlots,
      cluster,
      sessionsPerWeek: SESSIONS_PER_WEEK,
      missingDays,
    },
  };
}
