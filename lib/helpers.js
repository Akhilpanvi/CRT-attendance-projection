export function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function fmtDate(d) {
  return d ? d.split('-').reverse().join('.') : '—';
}

export function pctColor(p) {
  if (p >= 75) return '#16a34a';
  if (p >= 60) return '#d97706';
  return '#dc2626';
}

export const TIME_SLOTS = [
  '09:20-10:10', '10:10-11:00', '11:10-12:00', '12:00-12:50',
  '01:50-02:40', '02:40-03:40', '03:50-04:30', '04:30-05:30',
];
