/**
 * Training calendar: every scheduled CRT day of a cluster, with its state.
 *
 *  uploaded — attendance exists for that cluster on that date
 *             (also covers make-up sessions held on other weekdays)
 *  holiday  — an admin marked the day as no-class (counts for nobody)
 *  pending  — scheduled day with no upload yet (not counted until uploaded)
 *
 * Only uploaded days ever count towards attendance %.
 */
import { CLUSTERS, CLUSTER_DAYS, TRAINING_START, dayName } from '@/lib/attendanceCalc';

const DAY_MS = 86400000;

/** Today's date in India (YYYY-MM-DD) */
export function todayIST() {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
}

/** Scheduled CRT dates of a cluster between TRAINING_START and `until` (inclusive) */
export function scheduledDates(cluster, until = todayIST()) {
  const out = [];
  const days = CLUSTER_DAYS[cluster] || [];
  for (let t = Date.parse(TRAINING_START + 'T00:00:00Z'); t <= Date.parse(until + 'T00:00:00Z'); t += DAY_MS) {
    const d = new Date(t);
    if (days.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * @param {Array<{date, slot, cluster}>} sessions   from getSessions()
 * @param {Array<{date, cluster, reason}>} holidays  CalendarDay docs
 * @param {string[]} clusters                       clusters to include
 * @returns {Array<{ date, day, cluster, status, reason, slots, makeup, today, future }>} newest first
 */
export function buildCalendar(sessions, holidays, clusters = CLUSTERS) {
  const today = todayIST();
  const out = [];
  for (const cluster of clusters) {
    const slotCount = {};
    for (const s of sessions) if (s.cluster === cluster) slotCount[s.date] = (slotCount[s.date] || 0) + 1;
    const hol = new Map(holidays.filter(h => h.cluster === cluster).map(h => [h.date, h]));
    const scheduled = new Set(scheduledDates(cluster, today));

    const dates = new Set([...scheduled, ...Object.keys(slotCount), ...hol.keys()]);
    for (const date of dates) {
      if (date < TRAINING_START) continue;
      const status = slotCount[date] ? 'uploaded' : hol.has(date) ? 'holiday' : 'pending';
      out.push({
        date, day: dayName(date), cluster, status,
        reason: hol.get(date)?.reason || '',
        slots:  slotCount[date] || 0,
        makeup: !!slotCount[date] && !scheduled.has(date) && date <= today,
        today:  date === today,
        future: date > today,
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.cluster.localeCompare(b.cluster));
}
