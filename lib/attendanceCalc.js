/**
 * Shared attendance calculation utilities.
 *
 * Business rules:
 *  - Training started 11 May 2026 (TRAINING_START).
 *  - Sundays are excluded (no CRT sessions).
 *  - A "training day" is any date ≥ TRAINING_START, not a Sunday,
 *    for which at least one attendance record exists in the DB.
 *  - Any (training-day, slot) pair where a student has NO record is
 *    treated as ABSENT — not ignored.
 *  - Students added after the training start are automatically absent
 *    for all training-day slots before their record was created (they
 *    simply have no records for those days, so the rule above applies).
 */

export const TRAINING_START = '2026-05-11';

const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');

/** True if dateStr (YYYY-MM-DD) is a working CRT day */
export function isWorkingDate(dateStr) {
  if (dateStr < TRAINING_START) return false;
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  return dow !== 0; // 0 = Sunday
}

/**
 * Build a map of { date → [normalizedSlot, …] } from the raw
 * aggregate result of Attendance.distinct / aggregate, keeping only
 * working dates.
 *
 * @param {Array<{date:string, slot:string}>} pairs
 * @returns {{ slotsPerDate: Object, totalSlots: number }}
 */
export function buildSlotsPerDate(pairs) {
  const slotsPerDate = {};
  for (const { date, slot } of pairs) {
    if (!isWorkingDate(date)) continue;
    const ns = normalizeSlot(slot);
    if (!slotsPerDate[date]) slotsPerDate[date] = [];
    // deduplicate
    if (!slotsPerDate[date].includes(ns)) slotsPerDate[date].push(ns);
  }
  const totalSlots = Object.values(slotsPerDate).reduce((s, v) => s + v.length, 0);
  return { slotsPerDate, totalSlots };
}

/**
 * Compute a student's stats given their own records and the global
 * slotsPerDate map.
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
