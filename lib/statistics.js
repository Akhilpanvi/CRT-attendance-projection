import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import Session from '@/lib/models/Session';
import { getSessions } from '@/lib/sessions';
import { getWeekNumber } from '@/lib/helpers';
import { CLUSTERS, dayName, normalizeCluster, slotsByCluster } from '@/lib/attendanceCalc';

// Results only change when attendance is uploaded/edited — cache briefly per cluster
const CACHE_MS = 60_000;
const cache = new Map();

/** 'SI12' → 'SI', 'CGN21' → 'CGN' */
const groupOf = sec => (String(sec || '').match(/^[A-Za-z]+/)?.[0] || 'Other').toUpperCase();
const weekKeyOf = date => `${new Date(date + 'T00:00:00Z').getUTCFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
const round1 = n => Math.round(n * 10) / 10;

/** Summary of a list of students (each with stats from attachStats) */
function summarize(list) {
  const counted = list.filter(s => s.stats.total > 0);
  const pcts = counted.map(s => s.stats.present / s.stats.total * 100).sort((a, b) => a - b);
  const n = pcts.length;
  const bands = { ge85: 0, b75: 0, b60: 0, lt60: 0 };
  for (const p of pcts) {
    if (p >= 85) bands.ge85++; else if (p >= 75) bands.b75++; else if (p >= 60) bands.b60++; else bands.lt60++;
  }
  return {
    students: list.length,
    counted: n,
    avg:    n ? round1(pcts.reduce((a, b) => a + b, 0) / n) : 0,
    median: n ? round1(n % 2 ? pcts[(n - 1) / 2] : (pcts[n / 2 - 1] + pcts[n / 2]) / 2) : 0,
    below75: bands.b60 + bands.lt60,
    bands,
  };
}

/**
 * Section-wise attendance analysis (used by the Statistics page and the chatbot).
 * @param {'ALL'|'C1'|'C2'} clusterFilter
 */
export async function computeStatistics(clusterFilter = 'ALL') {
  const hit = cache.get(clusterFilter);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;

  await connectDB();
  const [sessions, allStudents, sessionDocs] = await Promise.all([
    getSessions(),
    Student.find({}, { _id: 0, rollNumber: 1, cluster: 1, crtSec: 1, crtRoom: 1 }).lean(),
    Session.find({}, { _id: 0, date: 1, cluster: 1, students: 1, present: 1 }).lean(),
  ]);

  const students = clusterFilter === 'ALL'
    ? allStudents
    : allStudents.filter(s => normalizeCluster(s.cluster) === clusterFilter);

  // ── Weekly trend per group (pooled present / expected) ─────────
  const byCluster = slotsByCluster(sessions);
  const slotsPerWeek = {};
  const weekSet = new Set();
  for (const c of CLUSTERS) {
    slotsPerWeek[c] = {};
    for (const [date, slots] of Object.entries(byCluster[c].slotsPerDate)) {
      const k = weekKeyOf(date);
      weekSet.add(k);
      slotsPerWeek[c][k] = (slotsPerWeek[c][k] || 0) + slots.length;
    }
  }
  const weeks = [...weekSet].sort();
  const workingDates = Object.keys(byCluster[''].slotsPerDate);
  const weeklyAgg = workingDates.length
    ? await Attendance.aggregate([
        { $match: { date: { $in: workingDates }, status: { $in: ['present', 'sp'] } } },
        { $group: { _id: { r: '$rollNumber', w: '$week', y: '$year' }, p: { $sum: 1 } } },
      ]).allowDiskUse(true)
    : [];
  const presentMap = new Map(weeklyAgg.map(a => [`${a._id.r}|${a._id.y}-W${String(a._id.w).padStart(2, '0')}`, a.p]));

  // Per-student totals from the same aggregation: present on their cluster's sessions
  const presentByRoll = new Map();
  for (const a of weeklyAgg) presentByRoll.set(a._id.r, (presentByRoll.get(a._id.r) || 0) + a.p);
  const rows = students.map(s => {
    const total = byCluster[normalizeCluster(s.cluster)].totalSlots;
    return { ...s, stats: { total, present: Math.min(total, presentByRoll.get(s.rollNumber) || 0) } };
  });

  // ── Groups → sections ──────────────────────────────────────────
  const byGroup = new Map();
  for (const s of rows) {
    const g = groupOf(s.crtSec);
    if (!byGroup.has(g)) byGroup.set(g, new Map());
    const sec = (s.crtSec || '—').toUpperCase();
    const m = byGroup.get(g);
    if (!m.has(sec)) m.set(sec, []);
    m.get(sec).push(s);
  }
  const groups = [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, secMap]) => {
    const members = [...secMap.values()].flat();
    return {
      group,
      sectionCount: secMap.size,
      ...summarize(members),
      sections: [...secMap.entries()].map(([section, list]) => ({
        section,
        cluster: [...new Set(list.map(s => normalizeCluster(s.cluster)).filter(Boolean))].join('/'),
        rooms:   [...new Set(list.map(s => s.crtRoom).filter(Boolean))].sort().join(', '),
        ...summarize(list),
      })).sort((a, b) => a.section.localeCompare(b.section, 'en', { numeric: true })),
    };
  });

  const acc = {}; // group → week → { p, t }
  for (const s of rows) {
    const per = slotsPerWeek[normalizeCluster(s.cluster)];
    if (!per) continue;
    const g = groupOf(s.crtSec);
    acc[g] ||= {};
    for (const w of weeks) {
      const t = per[w] || 0;
      if (!t) continue;
      const cell = (acc[g][w] ||= { p: 0, t: 0 });
      cell.t += t;
      cell.p += Math.min(t, presentMap.get(`${s.rollNumber}|${w}`) || 0);
    }
  }
  const weekly = {
    weeks: weeks.map((w, i) => ({ key: w, label: `W${i + 1}` })),
    series: groups.map(g => ({
      group: g.group,
      values: weeks.map(w => {
        const c = acc[g.group]?.[w];
        return c && c.t ? round1(c.p / c.t * 100) : null;
      }),
    })),
  };

  // ── Daily turnout (from upload snapshots) ─────────────────────
  const dayMap = new Map();
  for (const d of sessionDocs) {
    if (clusterFilter !== 'ALL' && d.cluster !== clusterFilter) continue;
    const k = `${d.date}|${d.cluster}`;
    const cur = dayMap.get(k) || { date: d.date, cluster: d.cluster, p: 0, n: 0 };
    cur.p += d.present || 0;
    cur.n += d.students || 0;
    dayMap.set(k, cur);
  }
  const daily = [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.cluster.localeCompare(b.cluster))
    .map(d => ({ date: d.date, day: dayName(d.date), cluster: d.cluster, rate: d.n ? round1(d.p / d.n * 100) : 0 }));

  const daysHeld = {};
  for (const c of CLUSTERS) daysHeld[c] = Object.keys(byCluster[c].slotsPerDate).length;

  const body = {
    cluster: clusterFilter,
    overall: summarize(rows),
    clusters: Object.fromEntries(CLUSTERS.map(c => [c, summarize(rows.filter(s => normalizeCluster(s.cluster) === c))])),
    daysHeld,
    groups,
    weekly,
    daily,
  };
  cache.set(clusterFilter, { at: Date.now(), body });
  return body;
}
