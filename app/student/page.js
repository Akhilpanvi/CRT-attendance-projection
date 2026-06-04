'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate, pctColor, TIME_SLOTS } from '@/lib/helpers';
import ThemeToggle from '@/components/ThemeToggle';

function calcBunk(present, total, threshold = 75) {
  if (!total) return { canBunk: 0, needAttend: 0 };
  const t = threshold / 100;
  if (Math.round((present / total) * 100) >= threshold)
    return { canBunk: Math.max(0, Math.floor((present - t * total) / t)), needAttend: 0 };
  return { canBunk: 0, needAttend: Math.ceil((t * total - present) / (1 - t)) };
}

function generateAdvice(present, total, overallPct, weeks = [], weekSeqMap = {}) {
  const b75 = calcBunk(present, total, 75);
  const b85 = calcBunk(present, total, 85);
  const lines = [];
  if (overallPct >= 85)
    lines.push({ type: 'ok',   text: `Overall ${overallPct}% — above both thresholds. Flexibility: ${b85.canBunk} sessions at 85%, ${b75.canBunk} at 75%.` });
  else if (overallPct >= 75)
    lines.push({ type: 'warn', text: `Overall ${overallPct}% — safe at 75% but below 85%. ${b75.canBunk} sessions of flexibility remaining before 75%.` });
  else
    lines.push({ type: 'bad',  text: `Overall ${overallPct}% — below 75%. Attend ${b75.needAttend} consecutive sessions to recover.` });
  const recent = [...weeks].sort((a, b) => b.year - a.year || b.week - a.week).slice(0, 4);
  for (const w of recent) {
    const label = `Week ${weekSeqMap[`${w.year}-${w.week}`] ?? w.week}`;
    if (w.pct === 100)   lines.push({ type: 'ok',   text: `${label}: Perfect attendance — ${w.present}/${w.total} (100%).` });
    else if (w.pct < 60) lines.push({ type: 'bad',  text: `${label}: Very low — ${w.present}/${w.total} (${w.pct}%). Affecting overall percentage.` });
    else if (w.pct < 75) lines.push({ type: 'warn', text: `${label}: Below threshold — ${w.present}/${w.total} (${w.pct}%). Prioritise attendance.` });
    else                 lines.push({ type: 'info', text: `${label}: ${w.present}/${w.total} (${w.pct}%) — on track.` });
  }
  if (b75.canBunk >= 16)       lines.push({ type: 'tip', text: `${b75.canBunk} sessions of flexibility (≈${Math.floor(b75.canBunk / 8)} full days). Spread across weeks — no more than 1 day per week.` });
  else if (b75.canBunk >= 8)   lines.push({ type: 'tip', text: `${b75.canBunk} sessions of flexibility. Use at most 1 full day, then maintain full attendance for 2 weeks.` });
  else if (b75.canBunk > 0)    lines.push({ type: 'tip', text: `Only ${b75.canBunk} sessions of flexibility remaining — plan leaves carefully, avoid full days.` });
  else if (b75.needAttend > 0) lines.push({ type: 'tip', text: `Recovery: maintain full attendance for the next ${Math.ceil(b75.needAttend / 48)} week${b75.needAttend > 48 ? 's' : ''} (${b75.needAttend} sessions) to reach 75%.` });
  return lines;
}

const ADVICE_STYLE = {
  ok:   'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700  dark:text-amber-400',
  bad:  'text-red-700    dark:text-red-400',
  info: 'text-slate-600  dark:text-slate-300',
  tip:  'text-blue-700   dark:text-blue-400',
};
const ADVICE_ICON = {
  ok:   <span className="text-emerald-500 shrink-0 text-xs font-bold mt-0.5">✓</span>,
  warn: <span className="text-amber-500   shrink-0 text-xs font-bold mt-0.5">!</span>,
  bad:  <span className="text-red-500     shrink-0 text-xs font-bold mt-0.5">✕</span>,
  info: <span className="text-slate-400   shrink-0 text-xs mt-0.5">–</span>,
  tip:  <span className="text-blue-500    shrink-0 text-xs mt-0.5">→</span>,
};

const today = new Date().toISOString().split('T')[0];

function isoWeekDateRange(year, isoWeek) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow  = jan4.getUTCDay() || 7;
  const mon  = new Date(Date.UTC(year, 0, 4 - (dow - 1) + (isoWeek - 1) * 7));
  const sun  = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  const f = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${f(mon)} – ${f(sun)}`;
}

function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const yr = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(yr, 0, 4));
  const dow  = jan4.getUTCDay() || 7;
  return { week: Math.floor((d - new Date(Date.UTC(yr, 0, 4 - (dow - 1)))) / 604800000) + 1, year: yr };
}

const TABS = [
  { id: 'home',    label: 'Overview' },
  { id: 'weekly',  label: 'Weekly'   },
  { id: 'planner', label: 'Planner'  },
  { id: 'log',     label: 'Log'      },
];

const NAV_ICONS = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  ),
  weekly: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  planner: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  ),
  log: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

export default function StudentPage() {
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [plannerView, setPlannerView] = useState('weekly');
  const trackerRef = useRef(null);

  const [selfByDate,     setSelfByDate]     = useState({});
  const [trackerEntries, setTrackerEntries] = useState([
    { id: 1, date: today, slots: {}, saving: false, saved: false, expanded: true },
  ]);

  useEffect(() => {
    fetch('/api/student/me').then(r => r.json()).then(d => { if (d.error) setError(d.error); else setData(d); }).catch(e => setError(e.message)).finally(() => setLoading(false));
    fetch('/api/updates').then(r => r.json()).then(d => setUpdates(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/student/self-attendance').then(r => r.json()).then(records => {
      if (!Array.isArray(records)) return;
      const byDate = {};
      for (const r of records) { if (!byDate[r.date]) byDate[r.date] = {}; byDate[r.date][r.slot] = r.status; }
      setSelfByDate(byDate);
      const allDates = [...new Set([...Object.keys(byDate).sort().reverse(), today])];
      setTrackerEntries(allDates.map((date, i) => ({ id: i + 1, date, slots: byDate[date] || {}, saving: false, saved: !!byDate[date], expanded: !byDate[date] })));
    }).catch(() => {});
  }, []);

  function addEntry() { setTrackerEntries(p => [...p, { id: Date.now(), date: today, slots: {}, saving: false, saved: false, expanded: true }]); }
  function toggleExpanded(id) { setTrackerEntries(p => p.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e)); }
  function removeEntry(id) { setTrackerEntries(p => p.filter(e => e.id !== id)); }
  function handleDateChange(id, date) { setTrackerEntries(p => p.map(e => e.id === id ? { ...e, date, slots: selfByDate[date] || {}, saved: false } : e)); }
  function handleSlotToggle(id, slot, val) {
    setTrackerEntries(p => p.map(e => {
      if (e.id !== id) return e;
      const s = { ...e.slots };
      if (s[slot] === val) delete s[slot]; else s[slot] = val;
      return { ...e, slots: s, saved: false };
    }));
  }
  function handleAllSlots(id, status) {
    setTrackerEntries(p => p.map(e => {
      if (e.id !== id) return e;
      const s = {}; for (const slot of TIME_SLOTS) s[slot] = status;
      return { ...e, slots: s, saved: false };
    }));
  }
  async function handleSave(id) {
    const entry = trackerEntries.find(e => e.id === id);
    if (!entry) return;
    setTrackerEntries(p => p.map(e => e.id === id ? { ...e, saving: true } : e));
    const prev    = selfByDate[entry.date] ? Object.keys(selfByDate[entry.date]) : [];
    const curr    = Object.keys(entry.slots);
    const deleted = prev.filter(s => !curr.includes(s));
    try {
      const r = await fetch('/api/student/self-attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: entry.date, entries: [...Object.entries(entry.slots).map(([slot, status]) => ({ slot, status })), ...deleted.map(slot => ({ slot, status: null }))] }),
      });
      if (r.ok) {
        setSelfByDate(p => { const u = { ...p }; if (!curr.length) delete u[entry.date]; else u[entry.date] = { ...entry.slots }; return u; });
        setTrackerEntries(p => p.map(e => e.id === id ? { ...e, saving: false, saved: true, expanded: false } : e));
      }
    } catch (_) { setTrackerEntries(p => p.map(e => e.id === id ? { ...e, saving: false } : e)); }
  }
  function handleEditDraft(date) {
    setActiveTab('planner');
    if (!trackerEntries.some(e => e.date === date))
      setTrackerEntries(p => [...p, { id: Date.now(), date, slots: selfByDate[date] || {}, saving: false, saved: false }]);
    setTimeout(() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
  async function handleDeleteDraft(date) {
    if (!confirm(`Delete self-tracked entries for ${fmtDate(date)}?`)) return;
    try {
      await fetch('/api/student/self-attendance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) });
      setSelfByDate(p => { const u = { ...p }; delete u[date]; return u; });
      setTrackerEntries(p => { const k = p.filter(e => e.date !== date); return k.length ? k : [{ id: Date.now(), date: today, slots: {}, saving: false, saved: false, expanded: true }]; });
    } catch (_) {}
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="alert-danger max-w-sm">{error}</div>
    </div>
  );

  const { student: s, stats } = data;
  const pct = stats.overallPct;
  const b75 = calcBunk(stats.present, stats.total, 75);
  const b85 = calcBunk(stats.present, stats.total, 85);
  const dates = Object.keys(stats.byDate || {}).sort().reverse();

  const weekSeq = Object.fromEntries(
    [...(stats.weeks || [])].sort((a, b) => a.year - b.year || a.week - b.week).map((w, i) => [`${w.year}-${w.week}`, i + 1])
  );
  const advice = generateAdvice(stats.present, stats.total, pct, stats.weeks || [], weekSeq);

  const entryDates      = new Set(trackerEntries.map(e => e.date));
  const liveAllSelf     = [...Object.entries(selfByDate).filter(([d]) => !entryDates.has(d)).flatMap(([, slots]) => Object.values(slots)), ...trackerEntries.flatMap(e => Object.values(e.slots))];
  const liveProjTotal   = stats.total + liveAllSelf.length;
  const liveProjPresent = stats.present + liveAllSelf.filter(v => v === 'present').length;
  const liveProjPct     = liveProjTotal > 0 ? Math.round((liveProjPresent / liveProjTotal) * 100) : 0;
  const liveHasData     = liveAllSelf.length > 0;

  const selfWeekMap = {};
  const addToWeekMap = (date, slots) => {
    const { week, year } = getISOWeek(date);
    const k = `${year}-${week}`;
    if (!selfWeekMap[k]) selfWeekMap[k] = { present: 0, total: 0 };
    for (const st of Object.values(slots)) { selfWeekMap[k].total++; if (st === 'present') selfWeekMap[k].present++; }
  };
  for (const [d, slots] of Object.entries(selfByDate)) { if (!entryDates.has(d)) addToWeekMap(d, slots); }
  for (const e of trackerEntries) { if (Object.keys(e.slots).length) addToWeekMap(e.date, e.slots); }

  const officialDateSet = new Set(dates);
  const selfOnlyDates   = Object.keys(selfByDate).filter(d => !officialDateSet.has(d)).sort().reverse();
  const allDates        = [...dates, ...selfOnlyDates].sort().reverse();
  const allSlots        = stats.slots.length > 0 ? stats.slots : TIME_SLOTS;

  const statusLabel = pct >= 85 ? 'Satisfactory' : pct >= 75 ? 'Meets Requirement' : 'Below Threshold';
  const statusCls   = pct >= 85 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    : pct >= 75 ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    :             'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  // ── shared primitives ──────────────────────────────────────────────────────
  const Card = ({ children, className = '', noPad = false }) => (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg ${noPad ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  );
  const SectionHead = ({ title, sub }) => (
    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  const Bar = ({ pct: p, track = false }) => (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: track ? '#6366f1' : pctColor(p) }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: track ? '#6366f1' : pctColor(p) }}>{p}%</span>
    </div>
  );

  // ── advice list ────────────────────────────────────────────────────────────
  const AdviceList = ({ lines }) => (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
          {ADVICE_ICON[line.type]}
          <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
        </div>
      ))}
    </div>
  );

  // ── weekly rows ────────────────────────────────────────────────────────────
  const WeekRows = () => (
    <>
      {[...(stats.weeks || [])].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
        const seq   = weekSeq[`${w.year}-${w.week}`];
        const range = isoWeekDateRange(w.year, w.week);
        const sd    = selfWeekMap[`${w.year}-${w.week}`];
        const hasSD = sd && sd.total > 0;
        const pT = w.total   + (hasSD ? sd.total   : 0);
        const pP = w.present + (hasSD ? sd.present : 0);
        const pPct = pT > 0 ? Math.round((pP / pT) * 100) : 0;
        return (
          <div key={`${w.year}-${w.week}`} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Week {seq}</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2">{range}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${w.pct >= 75 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                {w.pct >= 75 ? 'Safe' : 'Below'}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 w-16 shrink-0">Official</span>
                <Bar pct={w.pct} />
                <span className="text-[10px] text-slate-400 tabular-nums w-10 text-right shrink-0">{w.present}/{w.total}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 w-16 shrink-0">Projected</span>
                {hasSD ? (
                  <>
                    <Bar pct={pPct} track />
                    <span className="text-[10px] text-indigo-400 tabular-nums w-10 text-right shrink-0">{pP}/{pT}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">Track sessions in Planner to project</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // OVERVIEW TAB
  // ─────────────────────────────────────────────────────────────────────────
  const HomeTab = (
    <div className="space-y-3">

      {/* Identity + attendance summary */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden relative"
           style={{ background: `linear-gradient(135deg, ${statusColor}0d 0%, transparent 55%)` }}>
        {/* Profile row */}
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
            {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{s.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{[s.rollNumber, s.branch, s.crtSec].filter(Boolean).join(' · ')}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-1 rounded border shrink-0 ${statusCls}`}>{statusLabel}</span>
        </div>

        {/* Attendance metric */}
        <div className="px-4 py-4">
          <div className="flex items-end gap-4 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Attendance</p>
              <p className="text-4xl font-bold tabular-nums leading-none" style={{ color: pctColor(pct) }}>{pct}%</p>
            </div>
            <div className="flex-1 pb-1">
              <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pctColor(pct) }} />
                {/* threshold tick lines */}
                {[75, 85].map(t => (
                  <div key={t} className="absolute top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600 opacity-60"
                       style={{ left: `${t}%` }} />
                ))}
              </div>
              {/* labels at correct positions */}
              <div className="relative h-4">
                {[{ v: 0, anchor: 'left' }, { v: 75, anchor: 'center' }, { v: 85, anchor: 'center' }, { v: 100, anchor: 'right' }].map(({ v, anchor }) => (
                  <span key={v}
                    className="absolute text-[9px] text-slate-400 dark:text-slate-500 top-0"
                    style={{
                      left:      anchor === 'right'  ? undefined  : `${v}%`,
                      right:     anchor === 'right'  ? '0%'       : undefined,
                      transform: anchor === 'center' ? 'translateX(-50%)' : undefined,
                    }}>
                    {v}%
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {[
              { label: 'Total Sessions', value: stats.total,   color: 'text-slate-800 dark:text-slate-200' },
              { label: 'Present',        value: stats.present, color: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Absent',         value: stats.absent,  color: 'text-red-600 dark:text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threshold planner */}
      {stats.total > 0 && (
        <Card noPad>
          <SectionHead title="Threshold Summary" sub="Sessions required to meet or maintain each target" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: '75% Threshold (Minimum)', data: b75 },
              { label: '85% Threshold (Target)',  data: b85 },
            ].map(({ label, data }) => (
              <div key={label} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</p>
                  {data.canBunk > 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {data.canBunk} sessions flexible · ≈ {Math.floor(data.canBunk / 8)} days
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Need {data.needAttend} sessions · ≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className={`text-sm font-bold tabular-nums shrink-0 ${data.canBunk > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {data.canBunk > 0 ? `+${data.canBunk}` : `-${data.needAttend}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weekly attendance (compact, homepage) */}
      {stats.weeks && stats.weeks.length > 0 && (
        <Card noPad>
          <SectionHead title="Weekly Attendance" sub="Official attendance and projected per week" />
          <WeekRows />
        </Card>
      )}

      {/* Advice */}
      {advice.length > 0 && (
        <Card noPad>
          <SectionHead title="Recommendations" />
          <div className="px-4 py-3">
            <AdviceList lines={advice} />
          </div>
        </Card>
      )}

      {/* Notices */}
      {updates.length > 0 && (
        <Card noPad>
          <SectionHead title="Notices" sub={`${updates.length} active notice${updates.length !== 1 ? 's' : ''}`} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {updates.map(u => (
              <div key={u._id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    u.category === 'important' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : u.category === 'warning'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    :                            'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                    {u.pinned ? '📌 ' : ''}{u.category === 'important' ? 'Important' : u.category === 'warning' ? 'Warning' : 'Info'}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {u.title && <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{u.title}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{u.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // WEEKLY TAB
  // ─────────────────────────────────────────────────────────────────────────
  const WeeklyTab = (
    <div className="space-y-3">
      {stats.weeks && stats.weeks.length > 0 ? (
        <>
          {/* Summary */}
          {(() => {
            const ws = stats.weeks;
            const safe = ws.filter(w => w.pct >= 75).length;
            const avg  = ws.length ? Math.round(ws.reduce((s, w) => s + w.pct, 0) / ws.length) : 0;
            return (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Avg / Week', value: avg + '%',       color: pctColor(avg) },
                  { label: 'Safe Weeks', value: safe,             color: '#059669'     },
                  { label: 'Low Weeks',  value: ws.length - safe, color: ws.length - safe > 0 ? '#dc2626' : '#059669' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          <Card noPad>
            <SectionHead title="Weekly Breakdown" sub="Official attendance and projected (with self-tracking)" />
            <WeekRows />
          </Card>

          <Card noPad>
            <SectionHead title="Recommendations" />
            <div className="px-4 py-3"><AdviceList lines={advice} /></div>
          </Card>
        </>
      ) : (
        <Card><p className="text-sm text-slate-400 text-center py-8">No weekly data yet.</p></Card>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PLANNER TAB
  // ─────────────────────────────────────────────────────────────────────────
  const PlannerTab = (
    <div className="space-y-3">

      {/* Session Planner */}
      {stats.total > 0 && (
        <Card noPad>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Planner</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {plannerView === 'total' ? 'Bunk / recovery calculator by threshold' : 'Week-by-week breakdown with projections'}
              </p>
            </div>
            <div className="flex rounded border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              {[['weekly', 'Weekly'], ['total', 'Total']].map(([v, l]) => (
                <button key={v} onClick={() => setPlannerView(v)}
                  className={`px-3 py-1.5 font-medium transition-colors ${plannerView === v ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {plannerView === 'total' ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{ label: '75% Minimum', data: b75 }, { label: '85% Target', data: b85 }].map(({ label, data }) => (
                  <div key={label} className="border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
                    {data.canBunk > 0 ? (
                      <><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.canBunk}</p>
                      <p className="text-xs text-slate-500 mt-0.5">sessions flexible</p>
                      <p className="text-[11px] text-slate-400 mt-1">≈ {Math.floor(data.canBunk / 8)}d {data.canBunk % 8 > 0 ? `+ ${data.canBunk % 8}s` : ''}</p></>
                    ) : (
                      <><p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{data.needAttend}</p>
                      <p className="text-xs text-slate-500 mt-0.5">sessions needed</p>
                      <p className="text-[11px] text-slate-400 mt-1">≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}</p></>
                    )}
                  </div>
                ))}
              </div>
              {liveHasData && (() => {
                const pb75 = calcBunk(liveProjPresent, liveProjTotal, 75);
                const pb85 = calcBunk(liveProjPresent, liveProjTotal, 85);
                return (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-2">
                      Projected · {liveProjPresent}/{liveProjTotal} sessions
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: '75%', data: pb75 }, { label: '85%', data: pb85 }].map(({ label, data }) => (
                        <div key={label} className="border border-indigo-100 dark:border-indigo-900 rounded-lg p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">{label}</p>
                          {data.canBunk > 0 ? (
                            <><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.canBunk}</p>
                            <p className="text-xs text-slate-500 mt-0.5">sessions flexible</p></>
                          ) : (
                            <><p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{data.needAttend}</p>
                            <p className="text-xs text-slate-500 mt-0.5">sessions needed</p></>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <AdviceList lines={advice} />
              </div>
            </div>
          ) : (
            <div>
              <WeekRows />
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <AdviceList lines={advice} />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Attendance Progression Tracker */}
      <Card noPad>
        <div ref={trackerRef}>
          <SectionHead title="Attendance Progression" sub="Mark your sessions to calculate projected percentage" />
        </div>
        <div className="p-4 space-y-5">
          {trackerEntries.map((entry, idx) => {
            const ep = Object.values(entry.slots).filter(v => v === 'present').length;
            const ea = Object.values(entry.slots).filter(v => v === 'absent').length;
            if (entry.saved && !entry.expanded) {
              return (
                <div key={entry.id} className={idx > 0 ? 'pt-4 border-t border-slate-100 dark:border-slate-800' : ''}>
                  <button onClick={() => toggleExpanded(entry.id)}
                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{fmtDate(entry.date)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{ep} present · {ea} absent</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded px-2 py-0.5">Saved</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              );
            }
            return (
              <div key={entry.id} className={`space-y-3 ${idx > 0 ? 'pt-4 border-t border-slate-100 dark:border-slate-800' : ''}`}>
                <div className="flex items-center gap-3">
                  {entry.saved ? (
                    <>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{fmtDate(entry.date)}</span>
                      <button onClick={() => toggleExpanded(entry.id)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 transition-colors">Collapse</button>
                      <button onClick={() => handleDeleteDraft(entry.date)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 rounded px-2 py-1 transition-colors">Delete</button>
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-medium text-slate-500 shrink-0">Date</label>
                      <input type="date" value={entry.date} onChange={e => handleDateChange(entry.id, e.target.value)} className="form-input py-1 text-sm" style={{ maxWidth: 160 }} />
                      {trackerEntries.length > 1 && (
                        <button onClick={() => removeEntry(entry.id)} className="ml-auto text-xs text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 transition-colors">Remove</button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0">Quick fill</span>
                  <button onClick={() => handleAllSlots(entry.id, 'present')} className="px-3 py-1 rounded text-xs font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 transition-colors">All Present</button>
                  <button onClick={() => handleAllSlots(entry.id, 'absent')}  className="px-3 py-1 rounded text-xs font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors">All Absent</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {TIME_SLOTS.map(slot => (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0 truncate">{slot}</span>
                      <button onClick={() => handleSlotToggle(entry.id, slot, 'present')}
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${entry.slots[slot] === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400'}`}>P</button>
                      <button onClick={() => handleSlotToggle(entry.id, slot, 'absent')}
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${entry.slots[slot] === 'absent' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'}`}>A</button>
                      {entry.slots[slot] && <button onClick={() => handleSlotToggle(entry.id, slot, entry.slots[slot])} className="text-slate-300 hover:text-slate-500 text-sm leading-none">×</button>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400">{ep > 0 || ea > 0 ? `${ep} present · ${ea} absent` : 'No slots marked'}</p>
                  <button onClick={() => handleSave(entry.id)} disabled={entry.saving || !Object.keys(entry.slots).length}
                    className={`text-xs font-medium px-4 py-1.5 rounded transition-colors disabled:opacity-50 ${entry.saved ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'btn-primary'}`}>
                    {entry.saving ? 'Saving…' : entry.saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button onClick={addEntry} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add another date
            </button>
          </div>

          {liveHasData && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Projected Attendance</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{liveProjPresent}/{liveProjTotal} sessions</p>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: pctColor(liveProjPct) }}>{liveProjPct}%</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOG TAB
  // ─────────────────────────────────────────────────────────────────────────
  const LogTab = (
    <Card noPad>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Log</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{dates.length} official · {selfOnlyDates.length} self-tracked</p>
        </div>
        {selfOnlyDates.length > 0 && (
          <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5">Draft rows included</span>
        )}
      </div>
      {allDates.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">No records yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="tbl-header">Date</th>
                {allSlots.map(sl => <th key={sl} className="tbl-header">{sl}</th>)}
                <th className="tbl-header text-center">P / T</th>
              </tr>
            </thead>
            <tbody>
              {allDates.map(dt => {
                const isOff  = officialDateSet.has(dt);
                const rowData = isOff ? (stats.byDate[dt] || {}) : (selfByDate[dt] || {});
                const p = allSlots.filter(sl => rowData[sl] === 'present' || rowData[sl] === 'sp').length;
                const t = allSlots.filter(sl => !!rowData[sl]).length;
                return (
                  <tr key={dt} className={isOff ? 'tbl-row' : 'bg-indigo-50/40 dark:bg-indigo-900/10'}>
                    <td className="tbl-cell font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{fmtDate(dt)}</span>
                        {!isOff && (
                          <>
                            <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 px-1 py-0.5 rounded">Draft</span>
                            <button onClick={() => handleEditDraft(dt)} className="text-[9px] text-blue-500 hover:underline font-medium">Edit</button>
                            <button onClick={() => handleDeleteDraft(dt)} className="text-[9px] text-red-400 hover:underline font-medium">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                    {allSlots.map(sl => {
                      const v = rowData[sl];
                      return (
                        <td key={sl} className="tbl-cell text-center">
                          {v === 'present' ? <span className="badge-present">P</span>
                           : v === 'absent' ? <span className="badge-absent">A</span>
                           : v === 'sp'     ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">SP</span>
                           : <span className="badge-dash">—</span>}
                        </td>
                      );
                    })}
                    <td className="tbl-cell text-center font-bold tabular-nums" style={{ color: pctColor(t ? Math.round(p / t * 100) : 0) }}>{p}/{t}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const tabContent = { home: HomeTab, weekly: WeeklyTab, planner: PlannerTab, log: LogTab };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-4" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-6 h-6 rounded bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-[10px] font-black text-white dark:text-slate-900">KL</div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 hidden xs:block">CRT Attendance</span>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden sm:flex items-center gap-0.5 flex-1 justify-center">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <ThemeToggle />
            <button onClick={logout}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Page heading (mobile) */}
      <div className="sm:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {TABS.find(t => t.id === activeTab)?.label}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24 sm:pb-8 space-y-3">
        {tabContent[activeTab]}

        <p className="text-center text-[10px] text-slate-300 dark:text-slate-700 pt-2">
          A student-built attendance tracker for Y-23 CRT · KL University ·{' '}
          <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Akhil Panvi</a>
        </p>
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors relative"
              style={{ color: active ? (document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a') : '#94a3b8' }}>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-slate-900 dark:bg-slate-100 rounded-b-full" />}
              {NAV_ICONS[tab.id]}
              <span className={`text-[10px] font-medium ${active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
