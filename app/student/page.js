'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate, pctColor, TIME_SLOTS } from '@/lib/helpers';
import ThemeToggle from '@/components/ThemeToggle';

function calcBunk(present, total, threshold = 75) {
  if (!total) return { canBunk: 0, needAttend: 0 };
  const t = threshold / 100;
  const pct = Math.round((present / total) * 100);
  if (pct >= threshold) return { canBunk: Math.max(0, Math.floor((present - t * total) / t)), needAttend: 0 };
  return { canBunk: 0, needAttend: Math.ceil((t * total - present) / (1 - t)) };
}

function generateAdvice(present, total, overallPct, weeks = [], weekSeqMap = {}) {
  const b75 = calcBunk(present, total, 75);
  const b85 = calcBunk(present, total, 85);
  const lines = [];

  if (overallPct >= 85) {
    lines.push({ type: 'ok',   text: `Overall ${overallPct}% — well above both thresholds. Flexibility: ${b85.canBunk} sessions at 85%, ${b75.canBunk} at 75%.` });
  } else if (overallPct >= 75) {
    lines.push({ type: 'warn', text: `Overall ${overallPct}% — safe at 75% but below 85%. You have ${b75.canBunk} sessions of flexibility before hitting 75%.` });
  } else {
    lines.push({ type: 'bad',  text: `Overall ${overallPct}% — BELOW 75%. Attend ${b75.needAttend} consecutive sessions to recover.` });
  }

  const recent = [...weeks].sort((a, b) => b.year - a.year || b.week - a.week).slice(0, 4);
  for (const w of recent) {
    const seq = weekSeqMap[`${w.year}-${w.week}`] ?? w.week;
    const label = `Week ${seq}`;
    if (w.pct === 100)   lines.push({ type: 'ok',   text: `${label}: Perfect — ${w.present}/${w.total} (100%).` });
    else if (w.pct < 60) lines.push({ type: 'bad',  text: `${label}: Very low — ${w.present}/${w.total} (${w.pct}%). This pulled your overall down.` });
    else if (w.pct < 75) lines.push({ type: 'warn', text: `${label}: Below threshold — ${w.present}/${w.total} (${w.pct}%). Prioritize attendance this week.` });
    else                 lines.push({ type: 'info', text: `${label}: ${w.present}/${w.total} (${w.pct}%) — on track.` });
  }

  if (b75.canBunk >= 16)      lines.push({ type: 'tip', text: `Plan: ${b75.canBunk} sessions of flexibility (≈${Math.floor(b75.canBunk / 8)} full days). Spread them — no more than 1 day per week.` });
  else if (b75.canBunk >= 8)  lines.push({ type: 'tip', text: `Plan: ${b75.canBunk} sessions of flexibility. Use at most 1 full day, then maintain full attendance for 2 weeks.` });
  else if (b75.canBunk > 0)   lines.push({ type: 'tip', text: `Plan: Only ${b75.canBunk} sessions of flexibility — plan individual leaves carefully, avoid full days.` });
  else if (b75.needAttend > 0) lines.push({ type: 'tip', text: `Recovery: Maintain full attendance for the next ${Math.ceil(b75.needAttend / 48)} week${b75.needAttend > 48 ? 's' : ''} (${b75.needAttend} sessions) to reach threshold.` });

  return lines;
}

const ADVICE_STYLE = {
  ok: 'text-green-700 dark:text-green-400', warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-red-700 dark:text-red-400',   info: 'text-slate-600 dark:text-slate-300',
  tip: 'text-blue-700 dark:text-blue-400',
};
const ADVICE_DOT = {
  ok: 'bg-green-500', warn: 'bg-amber-500', bad: 'bg-red-500', info: 'bg-slate-400', tip: 'bg-blue-500',
};

function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold min-w-[42px] text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

const UPDATE_COLORS = {
  info:      { bar: 'bg-blue-400',  wrap: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',  label: 'text-blue-500 dark:text-blue-400',  body: 'text-blue-700 dark:text-blue-300' },
  warning:   { bar: 'bg-amber-400', wrap: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'text-amber-600 dark:text-amber-400', body: 'text-amber-700 dark:text-amber-300' },
  important: { bar: 'bg-rose-400',  wrap: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',  label: 'text-rose-500 dark:text-rose-400',  body: 'text-rose-700 dark:text-rose-300' },
};

const today = new Date().toISOString().split('T')[0];

function isoWeekDateRange(year, isoWeek) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow  = jan4.getUTCDay() || 7;
  const mon  = new Date(Date.UTC(year, 0, 4 - (dow - 1) + (isoWeek - 1) * 7));
  const sun  = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const f = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${f(mon)} – ${f(sun)}`;
}

function getISOWeek(dateStr) {
  const d    = new Date(dateStr + 'T00:00:00Z');
  const yr   = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(yr, 0, 4));
  const dow  = jan4.getUTCDay() || 7;
  const wk   = Math.floor((d - new Date(Date.UTC(yr, 0, 4 - (dow - 1)))) / 604800000) + 1;
  return { week: wk, year: yr };
}

const DEFAULT_POLICY = {
  removed: [
    'Students must meet Director CRT along with Parents to be added back to the program.',
    'Until then, their status remains REMOVED.',
    'Students must continue attending CRT sections and attendance will continue to be monitored.',
  ],
  redzone: [
    'Students will face limited placement opportunities or restricted placement eligibility.',
    'Students must continue in CRT sections and their attendance will be monitored carefully.',
  ],
};

export default function StudentPage() {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);
  const [policy, setPolicy]   = useState(DEFAULT_POLICY);
  const [isDark, setIsDark]   = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const trackerRef = useRef(null);

  const [plannerView, setPlannerView] = useState('weekly'); // 'total' | 'weekly'

  const [selfByDate,     setSelfByDate]     = useState({});
  const [trackerEntries, setTrackerEntries] = useState([
    { id: 1, date: today, slots: {}, saving: false, saved: false, expanded: true },
  ]);

  useEffect(() => {
    fetch('/api/student/me')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    fetch('/api/updates').then(r => r.json()).then(d => setUpdates(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/policy').then(r => r.json()).then(d => setPolicy(d)).catch(() => {});

    fetch('/api/student/self-attendance')
      .then(r => r.json())
      .then(records => {
        if (!Array.isArray(records)) return;
        const byDate = {};
        for (const r of records) {
          if (!byDate[r.date]) byDate[r.date] = {};
          byDate[r.date][r.slot] = r.status;
        }
        setSelfByDate(byDate);
        // Build entries for every saved date + today, most recent first
        const allDates = [...new Set([...Object.keys(byDate).sort().reverse(), today])];
        setTrackerEntries(
          allDates.map((date, i) => ({
            id: i + 1,
            date,
            slots:    byDate[date] || {},
            saving:   false,
            saved:    !!byDate[date],
            expanded: !byDate[date], // saved entries start collapsed, new entry starts open
          }))
        );
      })
      .catch(() => {});
  }, []);

  function addEntry() {
    setTrackerEntries(prev => [
      ...prev,
      { id: Date.now(), date: today, slots: {}, saving: false, saved: false, expanded: true },
    ]);
  }

  function toggleExpanded(id) {
    setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
  }

  function removeEntry(id) {
    setTrackerEntries(prev => prev.filter(e => e.id !== id));
  }

  function handleDateChange(id, date) {
    setTrackerEntries(prev => prev.map(e =>
      e.id === id ? { ...e, date, slots: selfByDate[date] || {}, saved: false } : e
    ));
  }

  function handleSlotToggle(id, slot, val) {
    setTrackerEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const slots = { ...e.slots };
      if (slots[slot] === val) delete slots[slot];
      else slots[slot] = val;
      return { ...e, slots, saved: false };
    }));
  }

  function handleAllSlots(id, status) {
    setTrackerEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const slots = {};
      for (const slot of TIME_SLOTS) slots[slot] = status;
      return { ...e, slots, saved: false };
    }));
  }

  async function handleSave(id) {
    const entry = trackerEntries.find(e => e.id === id);
    if (!entry) return;
    setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, saving: true } : e));

    const prevSlots    = selfByDate[entry.date] ? Object.keys(selfByDate[entry.date]) : [];
    const currentSlots = Object.keys(entry.slots);
    const deletedSlots = prevSlots.filter(s => !currentSlots.includes(s));
    const apiEntries   = [
      ...Object.entries(entry.slots).map(([slot, status]) => ({ slot, status })),
      ...deletedSlots.map(slot => ({ slot, status: null })),
    ];

    try {
      const r = await fetch('/api/student/self-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: entry.date, entries: apiEntries }),
      });
      if (r.ok) {
        setSelfByDate(prev => {
          const updated = { ...prev };
          if (currentSlots.length === 0) delete updated[entry.date];
          else updated[entry.date] = { ...entry.slots };
          return updated;
        });
        setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, saving: false, saved: true, expanded: false } : e));
      }
    } catch (_) {
      setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, saving: false } : e));
    }
  }

  function handleEditDraft(date) {
    if (!trackerEntries.some(e => e.date === date)) {
      setTrackerEntries(prev => [
        ...prev,
        { id: Date.now(), date, slots: selfByDate[date] || {}, saving: false, saved: false },
      ]);
    }
    setTimeout(() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function handleDeleteDraft(date) {
    if (!confirm(`Delete self-tracked entries for ${fmtDate(date)}?`)) return;
    try {
      await fetch('/api/student/self-attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      setSelfByDate(prev => { const u = { ...prev }; delete u[date]; return u; });
      setTrackerEntries(prev => {
        const kept = prev.filter(e => e.date !== date);
        return kept.length > 0 ? kept : [{ id: Date.now(), date: today, slots: {}, saving: false, saved: false, expanded: true }];
      });
    } catch (_) {}
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const darkBg = 'radial-gradient(ellipse at 30% 60%, rgba(29,78,216,0.10) 0%, #080d1a 55%, #050810 100%)';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100"
         style={isDark ? { background: darkBg } : {}}>
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4"
         style={isDark ? { background: darkBg } : {}}>
      <div className="alert-danger max-w-sm">{error}</div>
    </div>
  );

  const { student: s, stats } = data;
  const pct = stats.overallPct;
  const b75 = calcBunk(stats.present, stats.total, 75);
  const b85 = calcBunk(stats.present, stats.total, 85);

  // Sequential week map: ISO week → 1, 2, 3 …
  const weekSeq = Object.fromEntries(
    [...(stats.weeks || [])].sort((a, b) => a.year - b.year || a.week - b.week)
      .map((w, i) => [`${w.year}-${w.week}`, i + 1])
  );

  const advice = generateAdvice(stats.present, stats.total, pct, stats.weeks || [], weekSeq);
  const dates  = Object.keys(stats.byDate || {}).sort().reverse();

  // Live projected stats — current unsaved entry slots take priority over saved selfByDate
  const entryDates      = new Set(trackerEntries.map(e => e.date));
  const otherSelfEntries = Object.entries(selfByDate)
    .filter(([d]) => !entryDates.has(d))
    .flatMap(([, slots]) => Object.values(slots));
  const currentEntries  = trackerEntries.flatMap(e => Object.values(e.slots));
  const liveAllSelf     = [...otherSelfEntries, ...currentEntries];
  const liveProjTotal   = stats.total + liveAllSelf.length;
  const liveProjPresent = stats.present + liveAllSelf.filter(v => v === 'present').length;
  const liveProjPct     = liveProjTotal > 0 ? Math.round((liveProjPresent / liveProjTotal) * 100) : 0;
  const liveHasData     = liveAllSelf.length > 0;

  // Per-week self-tracked map (saved + unsaved tracker entries, unsaved takes priority)
  const selfWeekMap = {};
  for (const [date, slots] of Object.entries(selfByDate)) {
    if (entryDates.has(date)) continue;
    const { week, year } = getISOWeek(date);
    const key = `${year}-${week}`;
    if (!selfWeekMap[key]) selfWeekMap[key] = { present: 0, total: 0 };
    for (const st of Object.values(slots)) {
      selfWeekMap[key].total++;
      if (st === 'present') selfWeekMap[key].present++;
    }
  }
  for (const entry of trackerEntries) {
    if (Object.keys(entry.slots).length === 0) continue;
    const { week, year } = getISOWeek(entry.date);
    const key = `${year}-${week}`;
    if (!selfWeekMap[key]) selfWeekMap[key] = { present: 0, total: 0 };
    for (const st of Object.values(entry.slots)) {
      selfWeekMap[key].total++;
      if (st === 'present') selfWeekMap[key].present++;
    }
  }

  // Merged attendance log
  const officialDateSet = new Set(dates);
  const selfOnlyDates   = Object.keys(selfByDate).filter(d => !officialDateSet.has(d)).sort().reverse();
  const allDates        = [...dates, ...selfOnlyDates].sort().reverse();
  const allSlots        = stats.slots.length > 0 ? stats.slots : TIME_SLOTS;

  // Shared card styles matching the login page's dark aesthetic
  const card  = isDark
    ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }
    : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' };
  const inner = isDark
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
    : { background: '#f8fafc', border: '1px solid #f1f5f9' };
  const divider = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9';

  return (
    <div className="min-h-screen bg-slate-100"
         style={isDark ? { background: darkBg } : {}}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b"
              style={isDark
                ? { background: 'rgba(8,13,26,0.92)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }
                : { background: '#ffffff', borderColor: '#e2e8f0' }}>
        <div className="max-w-4xl mx-auto px-4 flex items-center" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black text-white shrink-0"
                 style={isDark ? { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)' }
                               : { background: '#1e293b' }}>KL</div>
            <span className="font-semibold text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>CRT Attendance Tracker</span>
          </div>
          <span className="hidden sm:block text-xs mr-2" style={{ color: isDark ? 'rgba(255,255,255,0.18)' : '#cbd5e1' }}>·</span>
          <span className="hidden sm:block text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>Y-23 Summer CRT Training</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={logout}
              className="text-xs rounded px-3 py-1.5 transition-colors font-medium ml-1"
              style={isDark
                ? { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }
                : { color: '#64748b', border: '1px solid #e2e8f0' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Notices panel */}
        {updates.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                          rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5
                            border-b border-slate-200 dark:border-slate-700
                            bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-[5px] h-[5px] rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest
                                 text-slate-600 dark:text-slate-300">Notices</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Showing {updates.length}
              </span>
            </div>
            {/* Column headers */}
            <div className="flex gap-2.5 px-4 py-1.5 border-b border-slate-100 dark:border-slate-700
                            bg-slate-50 dark:bg-slate-800/80 text-[10px] font-semibold
                            text-slate-400 dark:text-slate-500">
              <span className="min-w-[16px]">#</span>
              <span className="flex-1">Subject / Notice</span>
              <span className="whitespace-nowrap">Date</span>
            </div>
            {/* Rows — capped height with scroll */}
            <div className="max-h-72 overflow-y-auto">
            {updates.map((u, i) => {
              const cl = u.category === 'important' ? 'Important' : u.category === 'warning' ? 'Warning' : 'Info';
              const noticeDate = new Date(u.createdAt).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
                year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
              });
              return (
                <div key={u._id}
                     className="flex gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-700
                                last:border-0 items-start">
                  <span className="text-[11px] min-w-[16px] pt-px text-slate-300 dark:text-slate-600">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                        ${u.category === 'important' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                          : u.category === 'warning'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                        {u.pinned ? '📌 ' : ''}{cl}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                        {noticeDate}
                      </span>
                    </div>
                    {u.title && (
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5 leading-snug">
                        {u.title}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {u.content}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Category notice — REMOVED or REDZONE (hidden until re-enabled) */}

        {/* Profile */}
        <div className="rounded-lg p-4" style={card}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center
                            text-white text-base font-bold shrink-0 bg-slate-700 dark:bg-slate-600">
              {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight">
                {s.name}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {[s.branch, s.dept, `Cluster ${s.cluster}`, s.crtSec, `Room ${s.crtRoom}`].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-2.5 max-w-xs">
                <PctBar pct={pct} />
              </div>
            </div>
            <span className="badge-purple text-xs shrink-0">{s.rollNumber}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Sessions', value: stats.total,   color: isDark ? 'rgba(255,255,255,0.7)' : '#334155' },
            { label: 'Present',        value: stats.present, color: '#16a34a' },
            { label: 'Absent',         value: stats.absent,  color: '#dc2626' },
            { label: 'Attendance',     value: pct + '%',     color: pctColor(pct) },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-4 text-center" style={card}>
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider mt-1"
                   style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Attendance */}
        {stats.weeks && stats.weeks.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={card}>
            <div className="px-4 py-3" style={{ borderBottom: divider }}>
              <h2 className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>
                Weekly Attendance
              </h2>
              <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                Attendance percentage per training week
              </p>
            </div>
            <div className="p-4 space-y-0">
              {[...stats.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
                const seq    = weekSeq[`${w.year}-${w.week}`];
                const range  = isoWeekDateRange(w.year, w.week);
                const sd     = selfWeekMap[`${w.year}-${w.week}`];
                const hasSD  = sd && sd.total > 0;
                const pTotal   = w.total   + (hasSD ? sd.total   : 0);
                const pPresent = w.present + (hasSD ? sd.present : 0);
                const pPct     = pTotal > 0 ? Math.round((pPresent / pTotal) * 100) : 0;
                return (
                  <div key={`${w.year}-${w.week}`} className="py-2.5" style={{ borderBottom: divider }}>
                    {/* Official row */}
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-40">
                        <span className="text-[11px] font-semibold block"
                              style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#334155' }}>
                          Week {seq}
                        </span>
                        <span className="text-[10px]"
                              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>
                          {range}
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                           style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                        <div className="h-full rounded-full" style={{ width: `${w.pct}%`, background: pctColor(w.pct) }} />
                      </div>
                      <span className="text-[11px] font-bold w-9 text-right shrink-0" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                      <span className="text-[10px] shrink-0 w-11 text-right"
                            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>
                        {w.present}/{w.total}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                        w.pct >= 75 ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                        {w.pct >= 75 ? 'Safe' : 'Low'}
                      </span>
                    </div>
                    {/* Projected row — always shown */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="shrink-0 w-40">
                        <span className="text-[9px] font-semibold"
                              style={{ color: isDark ? 'rgba(99,102,241,0.7)' : '#6366f1' }}>
                          ↳ Projected
                        </span>
                      </div>
                      {hasSD ? (
                        <>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                               style={{ background: isDark ? 'rgba(99,102,241,0.12)' : '#e0e7ff' }}>
                            <div className="h-full rounded-full" style={{ width: `${pPct}%`, background: '#6366f1' }} />
                          </div>
                          <span className="text-[11px] font-bold w-9 text-right shrink-0 text-indigo-500 dark:text-indigo-400">{pPct}%</span>
                          <span className="text-[10px] shrink-0 w-11 text-right text-indigo-400 dark:text-indigo-500">{pPresent}/{pTotal}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            pPct >= 75 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                       : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                            {pPct >= 75 ? 'Safe↑' : 'Low'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] italic"
                              style={{ color: isDark ? 'rgba(99,102,241,0.35)' : '#a5b4fc' }}>
                          Track your sessions above to see projection
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attendance Progression */}
        <div ref={trackerRef} className="rounded-lg overflow-hidden" style={card}>
          <div className="px-4 py-3" style={{ borderBottom: divider }}>
            <h2 className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>Attendance Progression</h2>
            <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
              Mark your own attendance to see a projected percentage.
            </p>
          </div>

          <div className="p-4 space-y-5">
            {trackerEntries.map((entry, idx) => {
              const ep = Object.values(entry.slots).filter(v => v === 'present').length;
              const ea = Object.values(entry.slots).filter(v => v === 'absent').length;

              if (entry.saved && !entry.expanded) {
                return (
                  <div key={entry.id} className={idx > 0 ? 'pt-3' : ''}
                       style={idx > 0 ? { borderTop: divider } : {}}>
                    <button
                      onClick={() => toggleExpanded(entry.id)}
                      className="w-full flex items-center gap-3 text-left rounded-lg px-3 py-2.5 transition-colors"
                      style={inner}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{fmtDate(entry.date)}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {ep} present · {ea} absent
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-green-600 dark:text-green-400
                                       bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800
                                       rounded px-2 py-0.5 shrink-0">
                        Saved ✓
                      </span>
                      <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                );
              }

              return (
                <div key={entry.id}
                     className={idx > 0 ? 'pt-4 space-y-3' : 'space-y-3'}
                     style={idx > 0 ? { borderTop: divider } : {}}>
                  {/* Header: date display + collapse/delete (saved) or date picker + remove (unsaved) */}
                  <div className="flex items-center gap-3">
                    {entry.saved ? (
                      <>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{fmtDate(entry.date)}</span>
                        <button
                          onClick={() => toggleExpanded(entry.id)}
                          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200
                                     transition-colors px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                          Collapse
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(entry.date)}
                          className="text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400
                                     transition-colors px-2 py-1 rounded border border-red-200 dark:border-red-800">
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Date</label>
                        <input
                          type="date"
                          value={entry.date}
                          onChange={e => handleDateChange(entry.id, e.target.value)}
                          className="form-input py-1 text-sm"
                          style={{ maxWidth: 160 }}
                        />
                        {trackerEntries.length > 1 && (
                          <button
                            onClick={() => removeEntry(entry.id)}
                            className="ml-auto text-xs text-slate-400 dark:text-slate-500 hover:text-red-400
                                       dark:hover:text-red-400 transition-colors px-2 py-1 rounded border
                                       border-slate-200 dark:border-slate-600">
                            Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bulk fill buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Quick fill:</span>
                    <button
                      onClick={() => handleAllSlots(entry.id, 'present')}
                      className="px-3 py-1 rounded text-xs font-semibold transition-colors
                                 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800
                                 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">
                      All Present
                    </button>
                    <button
                      onClick={() => handleAllSlots(entry.id, 'absent')}
                      className="px-3 py-1 rounded text-xs font-semibold transition-colors
                                 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                                 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">
                      All Absent
                    </button>
                  </div>

                  {/* Slot toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TIME_SLOTS.map(slot => (
                      <div key={slot} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{slot}</span>
                        <button
                          onClick={() => handleSlotToggle(entry.id, slot, 'present')}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            entry.slots[slot] === 'present'
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400'
                          }`}>P</button>
                        <button
                          onClick={() => handleSlotToggle(entry.id, slot, 'absent')}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            entry.slots[slot] === 'absent'
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'
                          }`}>A</button>
                        {entry.slots[slot] && (
                          <button
                            onClick={() => handleSlotToggle(entry.id, slot, entry.slots[slot])}
                            className="text-slate-300 dark:text-slate-600 hover:text-slate-500
                                       dark:hover:text-slate-400 transition-colors text-sm leading-none">×</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Save row */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {ep > 0 || ea > 0 ? `${ep} present · ${ea} absent` : 'No slots marked'}
                    </p>
                    <button
                      onClick={() => handleSave(entry.id)}
                      disabled={entry.saving || Object.keys(entry.slots).length === 0}
                      className={`text-xs font-medium px-4 py-1.5 rounded transition-colors ${
                        entry.saved
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'btn-primary'
                      }`}>
                      {entry.saving ? 'Saving…' : entry.saved ? 'Saved ✓' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add another date */}
            <div className="pt-2" style={{ borderTop: divider }}>
              <button
                onClick={addEntry}
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add another date
              </button>
            </div>

            {/* Live projection */}
            {liveHasData && (
              <div className="rounded-lg px-4 py-3" style={inner}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : '#334155' }}>Projected Attendance</p>
                    <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                      {liveProjPresent}/{liveProjTotal} sessions
                    </p>
                  </div>
                  <div className="text-2xl font-bold shrink-0" style={{ color: pctColor(liveProjPct) }}>
                    {liveProjPct}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session Planner */}
        {stats.total > 0 && (
          <div className="rounded-lg overflow-hidden" style={card}>
            {/* Header + tabs */}
            <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
                 style={{ borderBottom: divider }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>
                  Session Planner
                </h2>
                <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                  {plannerView === 'total' ? 'Bunk calculator based on thresholds' : 'Week-by-week attendance breakdown'}
                </p>
              </div>
              {/* Tab toggle */}
              <div className="flex rounded-lg overflow-hidden text-xs font-semibold shrink-0"
                   style={{ border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
                {['total', 'weekly'].map(v => (
                  <button key={v}
                    onClick={() => setPlannerView(v)}
                    className="px-4 py-1.5 capitalize transition-colors"
                    style={plannerView === v
                      ? { background: isDark ? 'rgba(255,255,255,0.12)' : '#1e293b', color: isDark ? '#ffffff' : '#ffffff' }
                      : { background: 'transparent', color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>
                    {v === 'total' ? 'Total' : 'Weekly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">

              {/* ── TOTAL VIEW ── */}
              {plannerView === 'total' && (
                <div className="space-y-4">
                  {/* Official row */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Official</span>
                      {dates[0] && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          · till {fmtDate(dates[0])} · {stats.present}/{stats.total} sessions
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: '75%', data: b75 }, { label: '85%', data: b85 }].map(({ label, data }) => (
                        <div key={label} className="rounded-lg p-3" style={inner}>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label} Threshold</div>
                          {data.canBunk > 0 ? (
                            <>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions flexible</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                ≈ {Math.floor(data.canBunk / 8)}d {data.canBunk % 8 > 0 ? `+ ${data.canBunk % 8}s` : ''}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to recover</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                ≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Projected row */}
                  {liveHasData && (() => {
                    const pb75 = calcBunk(liveProjPresent, liveProjTotal, 75);
                    const pb85 = calcBunk(liveProjPresent, liveProjTotal, 85);
                    return (
                      <div className="pt-3" style={{ borderTop: divider }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Projected</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            · with self-tracked · {liveProjPresent}/{liveProjTotal} sessions
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[{ label: '75%', data: pb75 }, { label: '85%', data: pb85 }].map(({ label, data }) => (
                            <div key={label}
                                 className="border border-indigo-200 dark:border-indigo-800
                                            bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg p-3">
                              <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">{label} Threshold</div>
                              {data.canBunk > 0 ? (
                                <>
                                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions flexible</div>
                                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    ≈ {Math.floor(data.canBunk / 8)}d {data.canBunk % 8 > 0 ? `+ ${data.canBunk % 8}s` : ''}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to recover</div>
                                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    ≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Advice */}
                  {advice.length > 0 && (
                    <div className="pt-3 space-y-4" style={{ borderTop: divider }}>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Advice</span>
                          {liveHasData && <span className="text-[10px] text-slate-400 dark:text-slate-500">· Official</span>}
                        </div>
                        <div className="space-y-2">
                          {advice.map((line, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm">
                              <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                              <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {liveHasData && (() => {
                        const projAdvice = generateAdvice(liveProjPresent, liveProjTotal, liveProjPct);
                        return (
                          <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Advice</span>
                              <span className="text-[10px] text-indigo-400 dark:text-indigo-500">· Projected</span>
                            </div>
                            <div className="space-y-2">
                              {projAdvice.map((line, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-sm">
                                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                                  <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── WEEKLY VIEW ── */}
              {plannerView === 'weekly' && (
                <div>
                  {(!stats.weeks || stats.weeks.length === 0) ? (
                    <p className="text-sm text-center py-6"
                       style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>
                      No weekly data yet.
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {[...stats.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
                        const seq    = weekSeq[`${w.year}-${w.week}`];
                        const range  = isoWeekDateRange(w.year, w.week);
                        const sd     = selfWeekMap[`${w.year}-${w.week}`];
                        const hasSD  = sd && sd.total > 0;
                        const pTotal   = w.total   + (hasSD ? sd.total   : 0);
                        const pPresent = w.present + (hasSD ? sd.present : 0);
                        const pPct     = pTotal > 0 ? Math.round((pPresent / pTotal) * 100) : 0;
                        return (
                          <div key={`${w.year}-${w.week}`} className="py-2.5 px-1" style={{ borderBottom: divider }}>
                            {/* Official row */}
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 w-36 sm:w-44">
                                <span className="text-xs font-semibold block"
                                      style={{ color: isDark ? 'rgba(255,255,255,0.75)' : '#334155' }}>
                                  Week {seq}
                                </span>
                                <span className="text-[10px]"
                                      style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>
                                  {range}
                                </span>
                              </div>
                              <div className="flex-1 h-2 rounded-full overflow-hidden"
                                   style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                                <div className="h-full rounded-full" style={{ width: `${w.pct}%`, background: pctColor(w.pct) }} />
                              </div>
                              <span className="text-xs font-bold shrink-0 w-9 text-right" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                              <span className="text-[11px] shrink-0 w-10 text-right hidden sm:block"
                                    style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                                {w.present}/{w.total}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                w.pct >= 75 ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                                {w.pct >= 75 ? 'Safe' : 'Low'}
                              </span>
                            </div>
                            {/* Projected row — always shown */}
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="shrink-0 w-36 sm:w-44">
                                <span className="text-[9px] font-semibold"
                                      style={{ color: isDark ? 'rgba(99,102,241,0.7)' : '#6366f1' }}>
                                  ↳ Projected
                                </span>
                              </div>
                              {hasSD ? (
                                <>
                                  <div className="flex-1 h-2 rounded-full overflow-hidden"
                                       style={{ background: isDark ? 'rgba(99,102,241,0.12)' : '#e0e7ff' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pPct}%`, background: '#6366f1' }} />
                                  </div>
                                  <span className="text-xs font-bold shrink-0 w-9 text-right text-indigo-500 dark:text-indigo-400">{pPct}%</span>
                                  <span className="text-[11px] shrink-0 w-10 text-right hidden sm:block text-indigo-400 dark:text-indigo-500">{pPresent}/{pTotal}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                    pPct >= 75 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                               : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                                    {pPct >= 75 ? 'Safe↑' : 'Low'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] italic"
                                      style={{ color: isDark ? 'rgba(99,102,241,0.35)' : '#a5b4fc' }}>
                                  Track your sessions above to see projection
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Summary row */}
                      <div className="pt-3 grid grid-cols-3 gap-3">
                        {(() => {
                          const ws        = stats.weeks;
                          const safeCount = ws.filter(w => w.pct >= 75).length;
                          const lowCount  = ws.length - safeCount;
                          const avgPct    = ws.length > 0 ? Math.round(ws.reduce((s, w) => s + w.pct, 0) / ws.length) : 0;
                          return [
                            { label: 'Avg / Week', value: avgPct + '%', color: pctColor(avgPct) },
                            { label: 'Safe Weeks', value: safeCount,    color: '#16a34a' },
                            { label: 'Low Weeks',  value: lowCount,     color: lowCount > 0 ? '#dc2626' : '#16a34a' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-lg p-3 text-center" style={inner}>
                              <div className="text-xl font-bold" style={{ color }}>{value}</div>
                              <div className="text-[10px] uppercase tracking-wider mt-1"
                                   style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>
                                {label}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Advice — same as Total tab */}
                      {advice.length > 0 && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: divider }}>
                          <span className="text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                            Advice
                          </span>
                          <div className="space-y-2 mt-1">
                            {advice.map((line, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-sm">
                                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                                <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Attendance log */}
        <div className="rounded-lg overflow-hidden" style={card}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: divider }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>Attendance Log</h2>
              <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                {dates.length} official · {selfOnlyDates.length} self-tracked
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selfOnlyDates.length > 0 && (
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20
                                 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5">
                  Draft rows shown
                </span>
              )}
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Tap a slot to mark SP
              </span>
            </div>
          </div>

          {allDates.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="tbl-header">Date</th>
                    {allSlots.map(sl => <th key={sl} className="tbl-header">{sl}</th>)}
                    <th className="tbl-header text-center">P / T</th>
                  </tr>
                </thead>
                <tbody>
                  {allDates.map(dt => {
                    const isOfficial = officialDateSet.has(dt);
                    const rowData    = isOfficial ? (stats.byDate[dt] || {}) : (selfByDate[dt] || {});
                    const p = allSlots.filter(sl => rowData[sl] === 'present' || rowData[sl] === 'sp').length;
                    const t = allSlots.filter(sl => !!rowData[sl]).length;
                    return (
                      <tr key={dt}
                          className={isOfficial
                            ? 'tbl-row'
                            : 'bg-indigo-50/50 dark:bg-indigo-900/10'}>
                        <td className="tbl-cell font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{fmtDate(dt)}</span>
                            {!isOfficial && (
                              <>
                                <span className="text-[9px] font-semibold text-indigo-500 dark:text-indigo-400
                                                 bg-indigo-100 dark:bg-indigo-900/40 px-1 py-0.5 rounded">
                                  Draft
                                </span>
                                <button
                                  onClick={() => handleEditDraft(dt)}
                                  className="text-[9px] text-blue-500 dark:text-blue-400 hover:text-blue-700
                                             dark:hover:text-blue-300 transition-colors font-medium">
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteDraft(dt)}
                                  className="text-[9px] text-red-400 dark:text-red-500 hover:text-red-600
                                             dark:hover:text-red-400 transition-colors font-medium">
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        {allSlots.map(sl => {
                          const v = rowData[sl];
                          return (
                            <td key={sl} className="tbl-cell text-center">
                              {v === 'present' ? <span className="badge-present">P</span>
                               : v === 'absent'  ? <span className="badge-absent">A</span>
                               : v === 'sp'      ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">SP</span>
                               : <span className="badge-dash">—</span>}
                            </td>
                          );
                        })}
                        <td className="tbl-cell text-center font-bold"
                            style={{ color: pctColor(t ? Math.round(p / t * 100) : 0) }}>
                          {p}/{t}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[10px] text-center pb-6 leading-relaxed"
           style={{ color: isDark ? 'rgba(255,255,255,0.18)' : '#cbd5e1' }}>
          A student-built attendance tracking platform for the Y-23 Summer CRT Training at KL University.<br />
          Made by{' '}
          <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer"
             style={{ color: isDark ? 'rgba(255,255,255,0.32)' : '#94a3b8', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Akhil Panvi
          </a>
          {' '}· with personal interest and easy tracking.
        </p>
      </main>
    </div>
  );
}
