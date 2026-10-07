/**
 * Shared attendance calculation utilities.
 *
 * Business rules:
 *  - Training started 16 Aug 2026 (TRAINING_START).
 *  - Sundays are excluded (no CRT sessions).
 *  - The Y-24 batch is split into two clusters, each with CRT on two
 *    fixed weekdays (CLUSTER_DAYS). A student is only expected at the
 *    sessions held for their own cluster.
 *  - A "session" is a (date, slot, cluster) triple created by an
 *    attendance upload. Any session of the student's cluster where they
 *    have NO record is treated as ABSENT — not ignored.
 *  - Students added after the training start are automatically absent
 *    for all earlier sessions of their cluster (they simply have no
 *    records for those days, so the rule above applies).
 */

export const TRAINING_START = '2026-08-16';

/** Weekdays (0 = Sun … 6 = Sat) on which each cluster has CRT */
export const CLUSTER_DAYS = { C1: [1, 2], C2: [3, 4] };
export const CLUSTERS     = Object.keys(CLUSTER_DAYS);
/** Full-attendance sessions per week for one cluster (2 days × 8 slots) */
export const SESSIONS_PER_WEEK = 16;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');

export const dayName = dateStr => DAY_NAMES[new Date(dateStr + 'T00:00:00Z').getUTCDay()];

export const clusterDaysLabel = c => (CLUSTER_DAYS[c] || []).map(d => DAY_NAMES[d]).join(' / ');

/** 'C1', 'c-1', 'Cluster 2', '2' → 'C1' / 'C2'; anything else → '' */
export function normalizeCluster(v) {
  const m = String(v ?? '').toUpperCase().match(/^(?:C|CL|CLUSTER)?[\s\-_]*([12])$/);
  return m ? `C${m[1]}` : '';
}

/** Cluster that normally has CRT on this date's weekday, or '' */
export function clusterForDate(dateStr) {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  return CLUSTERS.find(c => CLUSTER_DAYS[c].includes(dow)) || '';
}

/** True if dateStr (YYYY-MM-DD) is a working CRT day */
export function isWorkingDate(dateStr) {
  if (dateStr < TRAINING_START) return false;
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  return dow !== 0; // 0 = Sunday
}

/**
 * Build a map of { date → [normalizedSlot, …] } from session triples,
 * keeping only working dates and — when `cluster` is given — only that
 * cluster's sessions. An unknown cluster ('') sees every session.
 *
 * @param {Array<{date:string, slot:string, cluster?:string}>} sessions
 * @param {string} [cluster]
 * @returns {{ slotsPerDate: Object, totalSlots: number }}
 */
export function buildSlotsPerDate(sessions, cluster = '') {
  const slotsPerDate = {};
  for (const { date, slot, cluster: c } of sessions) {
    if (!isWorkingDate(date)) continue;
    if (cluster && (c || clusterForDate(date)) !== cluster) continue;
    const ns = normalizeSlot(slot);
    if (!slotsPerDate[date]) slotsPerDate[date] = [];
    // deduplicate
    if (!slotsPerDate[date].includes(ns)) slotsPerDate[date].push(ns);
  }
  const totalSlots = Object.values(slotsPerDate).reduce((s, v) => s + v.length, 0);
  return { slotsPerDate, totalSlots };
}

/** { C1: {slotsPerDate,totalSlots}, C2: …, '': … } — one pass per cluster */
export function slotsByCluster(sessions) {
  const out = { '': buildSlotsPerDate(sessions) };
  for (const c of CLUSTERS) out[c] = buildSlotsPerDate(sessions, c);
  return out;
}

/**
 * Compute a student's stats given their own records and the
 * slotsPerDate map for their cluster.
 *
 * @param {Array<{date,slot,status}>} records   - student's Attendance docs
 * @param {Object} slotsPerDate                 - from buildSlotsPerDate()
 * @returns {{ total, present, absent, sp, overallPct, byDate }}
 */
export function computeStudentStats(records, slotsPerDate) {
  // Build a fast lookup: 'date|normalizedSlot' → status
  const lookup = new Map();
  for (const r of records) {
    lookup.set(`${r.date}|${normalizeSlot(r.slot)}`, r.status);
  }

  let total = 0, present = 0, sp = 0;
  const byDate = {};

  for (const [date, slots] of Object.entries(slotsPerDate)) {
    for (const slot of slots) {
      total++;
      const status = lookup.get(`${date}|${slot}`) ?? 'absent';
      if (status === 'present') { present++; }
      else if (status === 'sp') { present++; sp++; }

      if (!byDate[date]) byDate[date] = {};
      byDate[date][slot] = status;
    }
  }

  const overallPct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent: total - present, sp, overallPct, byDate };
}
