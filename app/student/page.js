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
    lines.push({ type: 'warn', text: `Overall ${overallPct}% — safe at 75% but below 85%. ${b75.canBunk} sessions of flexibility remaining.` });
  else
    lines.push({ type: 'bad',  text: `Overall ${overallPct}% — below 75%. Attend ${b75.needAttend} consecutive sessions to recover.` });
  const recent = [...weeks].sort((a, b) => b.year - a.year || b.week - a.week).slice(0, 4);
  for (const w of recent) {
    const label = `Week ${weekSeqMap[`${w.year}-${w.week}`] ?? w.week}`;
    if (w.pct === 100)   lines.push({ type: 'ok',   text: `${label}: Perfect — ${w.present}/${w.total} (100%).` });
    else if (w.pct < 60) lines.push({ type: 'bad',  text: `${label}: Very low — ${w.present}/${w.total} (${w.pct}%). Pulling overall down.` });
    else if (w.pct < 75) lines.push({ type: 'warn', text: `${label}: Below threshold — ${w.present}/${w.total} (${w.pct}%). Prioritise attendance.` });
    else                 lines.push({ type: 'info', text: `${label}: ${w.present}/${w.total} (${w.pct}%) — on track.` });
  }
  if (b75.canBunk >= 16)       lines.push({ type: 'tip', text: `${b75.canBunk} sessions of flexibility (≈${Math.floor(b75.canBunk / 8)} days). No more than 1 day per week.` });
  else if (b75.canBunk >= 8)   lines.push({ type: 'tip', text: `${b75.canBunk} sessions of flexibility. Use at most 1 full day, then full attendance for 2 weeks.` });
  else if (b75.canBunk > 0)    lines.push({ type: 'tip', text: `Only ${b75.canBunk} sessions of flexibility — plan carefully, avoid full days.` });
  else if (b75.needAttend > 0) lines.push({ type: 'tip', text: `Recovery: full attendance for ${Math.ceil(b75.needAttend / 48)} week${b75.needAttend > 48 ? 's' : ''} (${b75.needAttend} sessions) to reach 75%.` });
  return lines;
}

const ADVICE_STYLE = {
  ok: 'text-emerald-700 dark:text-emerald-400', warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-red-700 dark:text-red-400', info: 'text-slate-600 dark:text-slate-300',
  tip: 'text-blue-700 dark:text-blue-400',
};
const ADVICE_ICON = {
  ok: '✓', warn: '!', bad: '✕', info: '–', tip: '→',
};
const ADVICE_ICON_COLOR = {
  ok: 'text-emerald-500', warn: 'text-amber-500', bad: 'text-red-500',
  info: 'text-slate-400', tip: 'text-blue-500',
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

const NAV = [
  { id: 'overview', label: 'Overview',   icon: <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg> },
  { id: 'weekly',   label: 'Weekly',     icon: <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
  { id: 'planner',  label: 'Planner',    icon: <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg> },
  { id: 'tracker',  label: 'Progression', icon: <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg> },
  { id: 'log',      label: 'Log',        icon: <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
];

export default function StudentPage() {
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [plannerView, setPlannerView] = useState('weekly');

  const sectionRefs = {
    overview: useRef(null),
    weekly:   useRef(null),
    planner:  useRef(null),
    tracker:  useRef(null),
    log:      useRef(null),
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

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

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    Object.values(sectionRefs).forEach(r => { if (r.current) observer.observe(r.current); });
    return () => observer.disconnect();
  }, [data]);

  function scrollTo(id) {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSidebarOpen(false);
  }

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
    const prev = selfByDate[entry.date] ? Object.keys(selfByDate[entry.date]) : [];
    const curr = Object.keys(entry.slots);
    try {
      const r = await fetch('/api/student/self-attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: entry.date, entries: [...Object.entries(entry.slots).map(([slot, status]) => ({ slot, status })), ...prev.filter(s => !curr.includes(s)).map(slot => ({ slot, status: null }))] }),
      });
      if (r.ok) {
        setSelfByDate(p => { const u = { ...p }; if (!curr.length) delete u[entry.date]; else u[entry.date] = { ...entry.slots }; return u; });
        setTrackerEntries(p => p.map(e => e.id === id ? { ...e, saving: false, saved: true, expanded: false } : e));
      }
    } catch (_) { setTrackerEntries(p => p.map(e => e.id === id ? { ...e, saving: false } : e)); }
  }
  function handleEditDraft(date) {
    if (!trackerEntries.some(e => e.date === date))
      setTrackerEntries(p => [...p, { id: Date.now(), date, slots: selfByDate[date] || {}, saving: false, saved: false }]);
    scrollTo('tracker');
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
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
    </div>
  );
  if (error) return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4" style={{ background: 'var(--cream)' }}>
      <div className="alert-danger max-w-sm">{error}</div>
    </div>
  );

  const { student: s, stats } = data;
  const pct   = stats.overallPct;
  const b75   = calcBunk(stats.present, stats.total, 75);
  const b85   = calcBunk(stats.present, stats.total, 85);
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
  const addW = (date, slots) => {
    const { week, year } = getISOWeek(date);
    const k = `${year}-${week}`;
    if (!selfWeekMap[k]) selfWeekMap[k] = { present: 0, total: 0 };
    for (const st of Object.values(slots)) { selfWeekMap[k].total++; if (st === 'present') selfWeekMap[k].present++; }
  };
  for (const [d, slots] of Object.entries(selfByDate)) { if (!entryDates.has(d)) addW(d, slots); }
  for (const e of trackerEntries) { if (Object.keys(e.slots).length) addW(e.date, e.slots); }

  const officialDateSet = new Set(dates);
  const selfOnlyDates   = Object.keys(selfByDate).filter(d => !officialDateSet.has(d)).sort().reverse();
  const allDates        = [...dates, ...selfOnlyDates].sort().reverse();
  const allSlots        = stats.slots.length > 0 ? stats.slots : TIME_SLOTS;

  const statusColor = pctColor(pct);
  const statusLabel = pct >= 85 ? 'Satisfactory' : pct >= 75 ? 'Meets Requirement' : 'Below Threshold';
  const statusCls   = pct >= 85 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    : pct >= 75 ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    :             'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = ({ mobile = false }) => (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col h-full border-r border-[#ede9e3] dark:border-white/[0.06] bg-white dark:bg-[#0d1424]`}>
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-100/80 dark:border-white/[0.05]">
        <div className="bg-white rounded-lg px-2 py-1 inline-flex items-center shadow-sm border border-slate-100 dark:border-white/10 mb-2.5">
          <img src="/logos/KL_Red-White_Original.png" alt="KL University" className="h-6 w-auto block" />
        </div>
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">CRT Tracker</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">Y-23 · KL University</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        <p className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">Navigation</p>
        {NAV.map(item => {
          const active = activeSection === item.id;
          return (
            <button key={item.id} onClick={() => scrollTo(item.id)}
              className={`slide-nav w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 text-left group ${
                active
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}>
              <span className={`transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-slate-100/80 dark:border-white/[0.05] space-y-2">
        <div className="flex items-start gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
            {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">{s.name}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.rollNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={logout}
            className="flex-1 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 transition-colors font-medium text-center">
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );

  const divider = 'border-t border-slate-100/80 dark:border-white/[0.05]';
  const card = 'bg-white dark:bg-white/[0.04] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07),0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200';

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden" style={{ background: 'var(--cream)' }}>

      {/* Ambient background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{
          width: 700, height: 700,
          background: isDark
            ? 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(200,160,80,0.07) 0%, transparent 70%)',
          top: '-15%', right: '-5%', filter: 'blur(80px)',
        }} />
        <div className="absolute rounded-full" style={{
          width: 500, height: 500,
          background: isDark
            ? 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(180,130,60,0.05) 0%, transparent 70%)',
          bottom: '15%', left: '-8%', filter: 'blur(80px)',
        }} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-52 shrink-0 fixed left-0 top-0 bottom-0 z-20">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-0 top-0 bottom-0 w-52" onClick={e => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-52 flex flex-col min-h-[100dvh] overflow-x-hidden relative z-[1]">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3" style={{ height: 48 }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">CRT Attendance Tracker</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 pb-16 animate-in">

          {/* ── OVERVIEW ──────────────────────────────────────────────── */}
          <section id="overview" ref={sectionRefs.overview}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Overview</p>

            {/* Profile + attendance card */}
            <div className="bg-white dark:bg-white/[0.04] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.3)]"
                 style={{ backgroundImage: `linear-gradient(135deg, ${statusColor}16 0%, ${statusColor}05 50%, transparent 72%)` }}>
              {/* Profile row */}
              <div className="px-6 py-5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                     style={{ background: statusColor + '22', color: statusColor }}>
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{[s.rollNumber, s.branch, s.crtSec].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded border shrink-0 ${statusCls}`}>{statusLabel}</span>
              </div>

              {/* Attendance metric */}
              <div className="px-6 pb-6 pt-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-3">Attendance</p>
                <div className="flex items-end gap-5">
                  <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: statusColor }}>{pct}%</p>
                  <div className="flex-1 pb-1 min-w-0">
                    <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all duration-700 ease-out"
                           style={{ width: mounted ? `${pct}%` : '0%', background: statusColor }} />
                      {[75, 85].map(t => (
                        <div key={t} className="absolute top-0 bottom-0 w-px bg-white/60 dark:bg-slate-600" style={{ left: `${t}%` }} />
                      ))}
                    </div>
                    <div className="relative h-3.5">
                      {[{ v: 0, a: 'left' }, { v: 75, a: 'center' }, { v: 85, a: 'center' }, { v: 100, a: 'right' }].map(({ v, a }) => (
                        <span key={v} className="absolute text-[9px] text-slate-400 dark:text-slate-600"
                          style={{ left: a === 'right' ? undefined : `${v}%`, right: a === 'right' ? '0%' : undefined, transform: a === 'center' ? 'translateX(-50%)' : undefined }}>
                          {v}%
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100/80 dark:border-white/[0.05]/60">
                  {[
                    { label: 'Total Sessions', value: stats.total,   color: 'text-slate-800 dark:text-slate-200' },
                    { label: 'Present',        value: stats.present, color: 'text-emerald-700 dark:text-emerald-400' },
                    { label: 'Absent',         value: stats.absent,  color: 'text-red-600 dark:text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Threshold summary */}
            {/* Notices — top of overview */}
            {updates.length > 0 && (
              <div className={`${card} mt-3 transition-shadow duration-200 hover:shadow-sm`}>
                <div className="px-5 py-3 border-b border-slate-100/80 dark:border-white/[0.05] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notices</p>
                  </div>
                  <span className="text-xs text-slate-400">{updates.length} item{updates.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100/80 dark:divide-white/[0.05] max-h-64 overflow-y-auto">
                  {updates.map(u => (
                    <div key={u._id} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-150">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          u.category === 'important' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : u.category === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          :                           'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
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
              </div>
            )}

            {/* Threshold summary */}
            {stats.total > 0 && (
              <div className={`${card} mt-3 transition-shadow duration-200 hover:shadow-sm`}>
                <div className="px-5 py-3 border-b border-slate-100/80 dark:border-white/[0.05]">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Threshold Summary</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Sessions required to meet or maintain each target</p>
                </div>
                <div className="divide-y divide-slate-100/80 dark:divide-white/[0.05]">
                  {[{ label: '75% Minimum', target: 75, data: b75 }, { label: '85% Target', target: 85, data: b85 }].map(({ label, target, data }) => (
                    <div key={label} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-150">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                        {data.canBunk > 0 ? (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            You can skip <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.canBunk} sessions</span> (≈ {Math.floor(data.canBunk / 8)} days) before dropping below {target}%
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Attend <span className="font-semibold text-red-600 dark:text-red-400">{data.needAttend} consecutive sessions</span> to reach {target}% · ≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className={`shrink-0 text-right ${data.canBunk > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        <p className="text-lg font-bold tabular-nums leading-none">
                          {data.canBunk > 0 ? `+${data.canBunk}` : `${data.needAttend}`}
                        </p>
                        <p className="text-[10px] font-medium mt-0.5">
                          {data.canBunk > 0 ? 'can skip' : 'to attend'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── WEEKLY ────────────────────────────────────────────────── */}
          <section id="weekly" ref={sectionRefs.weekly}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Weekly Attendance</p>

            {stats.weeks && stats.weeks.length > 0 ? (
              <>
                {/* Summary cards */}
                {(() => {
                  const ws = stats.weeks;
                  const safe = ws.filter(w => w.pct >= 75).length;
                  const avg  = ws.length ? Math.round(ws.reduce((s, w) => s + w.pct, 0) / ws.length) : 0;
                  return (
                    <div className={`${card} mb-3 overflow-hidden`}>
                      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                        {[
                          { label: 'Avg / Week', value: avg + '%', color: pctColor(avg) },
                          { label: 'Safe Weeks', value: safe,      color: '#059669'     },
                          { label: 'Low Weeks',  value: ws.length - safe, color: ws.length - safe > 0 ? '#dc2626' : '#059669' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="py-4 text-center">
                            <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className={card}>
                  <div className="px-5 py-3 border-b border-slate-100/80 dark:border-white/[0.05]">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Week-by-Week Breakdown</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Official attendance · Projected with your self-tracked sessions</p>
                  </div>
                  <div className="divide-y divide-slate-100/80 dark:divide-white/[0.05]">
                    {[...stats.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
                      const seq   = weekSeq[`${w.year}-${w.week}`];
                      const range = isoWeekDateRange(w.year, w.week);
                      const sd    = selfWeekMap[`${w.year}-${w.week}`];
                      const hasSD = sd && sd.total > 0;
                      const pT    = w.total   + (hasSD ? sd.total   : 0);
                      const pP    = w.present + (hasSD ? sd.present : 0);
                      const pPct  = pT > 0 ? Math.round((pP / pT) * 100) : 0;
                      return (
                        <div key={`${w.year}-${w.week}`} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-2.5">
                            <div>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Week {seq}</span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2">{range}</span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              w.pct >= 75 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                          : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                              {w.pct >= 75 ? 'Safe' : 'Below'}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {/* Official */}
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 w-16 shrink-0">Official</span>
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: mounted ? `${w.pct}%` : '0%', background: pctColor(w.pct), transition: 'width 0.6s ease-out' }} />
                              </div>
                              <span className="text-xs font-semibold tabular-nums w-8 text-right shrink-0" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                              <span className="text-[10px] tabular-nums w-10 text-right shrink-0 text-slate-400">{w.present}/{w.total}</span>
                            </div>
                            {/* Projected */}
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-indigo-400 dark:text-indigo-500 w-16 shrink-0">Projected</span>
                              {hasSD ? (
                                <>
                                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                    <div className="h-full rounded-full" style={{ width: mounted ? `${pPct}%` : '0%', background: '#6366f1', transition: 'width 0.6s ease-out 0.15s' }} />
                                  </div>
                                  <span className="text-xs font-semibold tabular-nums w-8 text-right shrink-0 text-indigo-500 dark:text-indigo-400">{pPct}%</span>
                                  <span className="text-[10px] tabular-nums w-10 text-right shrink-0 text-indigo-400">{pP}/{pT}</span>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-300 dark:text-slate-700 italic">Track in Progression below</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advice */}
                {advice.length > 0 && (
                  <div className={`${card} mt-3 px-5 py-4`}>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Recommendations</p>
                    <div className="space-y-2">
                      {advice.map((line, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                          <span className={`shrink-0 font-bold mt-0.5 ${ADVICE_ICON_COLOR[line.type]}`}>{ADVICE_ICON[line.type]}</span>
                          <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`${card} px-5 py-10 text-center`}>
                <p className="text-sm text-slate-400">No weekly data yet.</p>
              </div>
            )}
          </section>

          {/* ── SESSION PLANNER ───────────────────────────────────────── */}
          <section id="planner" ref={sectionRefs.planner}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Session Planner</p>
            {stats.total > 0 && (
              <div className={card}>
                <div className="px-5 py-3 border-b border-slate-100/80 dark:border-white/[0.05] flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bunk Calculator</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{plannerView === 'total' ? '75% / 85% threshold analysis' : 'Week-by-week view'}</p>
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
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: '75% Minimum', data: b75 }, { label: '85% Target', data: b85 }].map(({ label, data }) => (
                        <div key={label} className="border border-slate-100/80 dark:border-white/[0.05] rounded-lg p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
                          {data.canBunk > 0 ? (
                            <><p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.canBunk}</p>
                            <p className="text-xs text-slate-500 mt-0.5">sessions flexible</p>
                            <p className="text-[11px] text-slate-400 mt-1">≈ {Math.floor(data.canBunk / 8)}d {data.canBunk % 8 > 0 ? `+ ${data.canBunk % 8}s` : ''}</p></>
                          ) : (
                            <><p className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">{data.needAttend}</p>
                            <p className="text-xs text-slate-500 mt-0.5">sessions to recover</p>
                            <p className="text-[11px] text-slate-400 mt-1">≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}</p></>
                          )}
                        </div>
                      ))}
                    </div>
                    {liveHasData && (() => {
                      const pb75 = calcBunk(liveProjPresent, liveProjTotal, 75);
                      const pb85 = calcBunk(liveProjPresent, liveProjTotal, 85);
                      return (
                        <div className="pt-4 border-t border-slate-100/80 dark:border-white/[0.05]">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-3">
                            Projected · {liveProjPresent}/{liveProjTotal} sessions · {liveProjPct}%
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {[{ label: '75%', data: pb75 }, { label: '85%', data: pb85 }].map(({ label, data }) => (
                              <div key={label} className="border border-indigo-100 dark:border-indigo-900 rounded-lg p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-2">{label}</p>
                                {data.canBunk > 0 ? (
                                  <><p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.canBunk}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">sessions flexible</p></>
                                ) : (
                                  <><p className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">{data.needAttend}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">sessions to recover</p></>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="pt-4 border-t border-slate-100/80 dark:border-white/[0.05]">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Recommendations</p>
                      <div className="space-y-2">
                        {advice.map((line, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                            <span className={`shrink-0 font-bold mt-0.5 ${ADVICE_ICON_COLOR[line.type]}`}>{ADVICE_ICON[line.type]}</span>
                            <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100/80 dark:divide-white/[0.05]">
                    {[...stats.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
                      const seq   = weekSeq[`${w.year}-${w.week}`];
                      const range = isoWeekDateRange(w.year, w.week);
                      const sd    = selfWeekMap[`${w.year}-${w.week}`];
                      const hasSD = sd && sd.total > 0;
                      const pT    = w.total   + (hasSD ? sd.total   : 0);
                      const pP    = w.present + (hasSD ? sd.present : 0);
                      const pPct  = pT > 0 ? Math.round((pP / pT) * 100) : 0;
                      return (
                        <div key={`${w.year}-${w.week}`} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Week {seq}</span>
                              <span className="text-[11px] text-slate-400 ml-2">{range}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${w.pct >= 75 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'}`}>
                              {w.pct >= 75 ? 'Safe' : 'Low'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400 w-16 shrink-0">Official</span>
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: mounted ? `${w.pct}%` : '0%', background: pctColor(w.pct), transition: 'width 0.6s ease-out' }} />
                              </div>
                              <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                              <span className="text-[10px] text-slate-400 tabular-nums w-9 text-right">{w.present}/{w.total}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-indigo-400 w-16 shrink-0">Projected</span>
                              {hasSD ? (
                                <>
                                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                    <div className="h-full rounded-full" style={{ width: mounted ? `${pPct}%` : '0%', background: '#6366f1', transition: 'width 0.6s ease-out 0.15s' }} />
                                  </div>
                                  <span className="text-xs font-semibold tabular-nums w-8 text-right text-indigo-500 dark:text-indigo-400">{pPct}%</span>
                                  <span className="text-[10px] text-indigo-400 tabular-nums w-9 text-right">{pP}/{pT}</span>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-300 dark:text-slate-700 italic">Track in Progression below</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="px-5 py-4">
                      <div className="space-y-2">
                        {advice.map((line, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                            <span className={`shrink-0 font-bold mt-0.5 ${ADVICE_ICON_COLOR[line.type]}`}>{ADVICE_ICON[line.type]}</span>
                            <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── ATTENDANCE PROGRESSION ────────────────────────────────── */}
          <section id="tracker" ref={sectionRefs.tracker}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Attendance Progression</p>
            <div className={card}>
              <div className="px-5 py-3 border-b border-slate-100/80 dark:border-white/[0.05]">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Self-Tracking</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Mark your sessions to calculate projected percentage in the Weekly section.</p>
              </div>
              <div className="p-5 space-y-5">
                {trackerEntries.map((entry, idx) => {
                  const ep = Object.values(entry.slots).filter(v => v === 'present').length;
                  const ea = Object.values(entry.slots).filter(v => v === 'absent').length;
                  if (entry.saved && !entry.expanded) {
                    return (
                      <div key={entry.id} className={idx > 0 ? 'pt-4 border-t border-slate-100/80 dark:border-white/[0.05]' : ''}>
                        <button onClick={() => toggleExpanded(entry.id)}
                          className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border border-slate-100/80 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
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
                    <div key={entry.id} className={`space-y-3 ${idx > 0 ? 'pt-4 border-t border-slate-100/80 dark:border-white/[0.05]' : ''}`}>
                      <div className="flex items-center gap-3">
                        {entry.saved ? (
                          <>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{fmtDate(entry.date)}</span>
                            <button onClick={() => toggleExpanded(entry.id)} className="text-xs text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 hover:bg-slate-50 transition-colors">Collapse</button>
                            <button onClick={() => handleDeleteDraft(entry.date)} className="text-xs text-red-500 border border-red-200 dark:border-red-800 rounded px-2 py-1 hover:bg-red-50 transition-colors">Delete</button>
                          </>
                        ) : (
                          <>
                            <label className="text-xs font-medium text-slate-500 shrink-0">Date</label>
                            <input type="date" value={entry.date} onChange={e => handleDateChange(entry.id, e.target.value)} className="form-input py-1 text-sm" style={{ maxWidth: 160 }} />
                            {trackerEntries.length > 1 && (
                              <button onClick={() => removeEntry(entry.id)} className="ml-auto text-xs text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 hover:text-red-500 transition-colors">Remove</button>
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
                <div className="pt-2 border-t border-slate-100/80 dark:border-white/[0.05]">
                  <button onClick={addEntry} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Add another date
                  </button>
                </div>
                {liveHasData && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-100/80 dark:border-white/[0.05]">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Projected Attendance</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{liveProjPresent}/{liveProjTotal} sessions</p>
                    </div>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: pctColor(liveProjPct) }}>{liveProjPct}%</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── ATTENDANCE LOG ────────────────────────────────────────── */}
          <section id="log" ref={sectionRefs.log}>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Attendance Log</p>
            <div className={card}>
              <div className="px-5 py-3 border-b border-slate-100/80 dark:border-white/[0.05] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Records</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{dates.length} official · {selfOnlyDates.length} self-tracked</p>
                </div>
                {selfOnlyDates.length > 0 && (
                  <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5">Draft rows shown</span>
                )}
              </div>
              {allDates.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100/80 dark:border-white/[0.05]">
                        <th className="tbl-header">Date</th>
                        {allSlots.map(sl => <th key={sl} className="tbl-header">{sl}</th>)}
                        <th className="tbl-header text-center">P / T</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDates.map(dt => {
                        const isOff   = officialDateSet.has(dt);
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
                                    <button onClick={() => handleEditDraft(dt)} className="text-[9px] text-blue-500 hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteDraft(dt)} className="text-[9px] text-red-400 hover:underline">Delete</button>
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
            </div>
          </section>

          {/* Footer */}
          <p className="text-center text-[10px] text-slate-300 dark:text-slate-700 pb-4">
            Y-23 CRT Training · KL University ·{' '}
            <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Akhil Panvi</a>
          </p>
        </main>
      </div>
    </div>
  );
}
