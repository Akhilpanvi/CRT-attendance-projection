export function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

// Shown on public pages so no one mistakes the Tracker for a university site
export const SITE_NOTICE = 'An independent, student-developed portal — not an official KL University website.';

// All dates and times on the site are shown in Indian Standard Time
export const IST = 'Asia/Kolkata';

/** Today's date in IST as YYYY-MM-DD */
export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST });
}

/** "07 Oct 2026, 11:55 pm" in IST; '' for empty values */
export function fmtDateTimeIST(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: IST, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
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
