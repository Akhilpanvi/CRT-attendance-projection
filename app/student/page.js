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
  const dow = jan4.getUTCDay() || 7;
  const wk = Math.floor((d - new Date(Date.UTC(yr, 0, 4 - (dow - 1)))) / 604800000) + 1;
  return { week: wk, year: yr };
}

const TABS = [
  { id: 'home',    label: 'Home',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )},
  { id: 'weekly',  label: 'Weekly',  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )},
  { id: 'planner', label: 'Planner', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )},
  { id: 'log',     label: 'Log',     icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )},
];

export default function StudentPage() {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);
  const [policy, setPolicy]   = useState({ removed: [], redzone: [] });
  const [isDark, setIsDark]   = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const trackerRef = useRef(null);
  const [plannerView, setPlannerView] = useState('weekly');

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
        const allDates = [...new Set([...Object.keys(byDate).sort().reverse(), today])];
        setTrackerEntries(allDates.map((date, i) => ({
          id: i + 1, date,
          slots: byDate[date] || {},
          saving: false, saved: !!byDate[date],
          expanded: !byDate[date],
        })));
      })
      .catch(() => {});
  }, []);

  function addEntry() {
    setTrackerEntries(prev => [...prev, { id: Date.now(), date: today, slots: {}, saving: false, saved: false, expanded: true }]);
  }
  function toggleExpanded(id) {
    setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
  }
  function removeEntry(id) {
    setTrackerEntries(prev => prev.filter(e => e.id !== id));
  }
  function handleDateChange(id, date) {
    setTrackerEntries(prev => prev.map(e => e.id === id ? { ...e, date, slots: selfByDate[date] || {}, saved: false } : e));
  }
  function handleSlotToggle(id, slot, val) {
    setTrackerEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const slots = { ...e.slots };
      if (slots[slot] === val) delete slots[slot]; else slots[slot] = val;
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    setActiveTab('planner');
    if (!trackerEntries.some(e => e.date === date)) {
      setTrackerEntries(prev => [...prev, { id: Date.now(), date, slots: selfByDate[date] || {}, saving: false, saved: false }]);
    }
    setTimeout(() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
  async function handleDeleteDraft(date) {
    if (!confirm(`Delete self-tracked entries for ${fmtDate(date)}?`)) return;
    try {
      await fetch('/api/student/self-attendance', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen flex items-center justify-center" style={isDark ? { background: darkBg } : { background: '#f8fafc' }}>
      <div className="text-center space-y-3">
        <div className="w-8 h-8 rounded border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>Loading your dashboard…</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={isDark ? { background: darkBg } : {}}>
      <div className="alert-danger max-w-sm">{error}</div>
    </div>
  );

  const { student: s, stats } = data;
  const pct    = stats.overallPct;
  const b75    = calcBunk(stats.present, stats.total, 75);
  const b85    = calcBunk(stats.present, stats.total, 85);
  const dates  = Object.keys(stats.byDate || {}).sort().reverse();

  const weekSeq = Object.fromEntries(
    [...(stats.weeks || [])].sort((a, b) => a.year - b.year || a.week - b.week)
      .map((w, i) => [`${w.year}-${w.week}`, i + 1])
  );
  const advice = generateAdvice(stats.present, stats.total, pct, stats.weeks || [], weekSeq);

  // Live projection
  const entryDates       = new Set(trackerEntries.map(e => e.date));
  const otherSelfEntries = Object.entries(selfByDate).filter(([d]) => !entryDates.has(d)).flatMap(([, slots]) => Object.values(slots));
  const currentEntries   = trackerEntries.flatMap(e => Object.values(e.slots));
  const liveAllSelf      = [...otherSelfEntries, ...currentEntries];
  const liveProjTotal    = stats.total + liveAllSelf.length;
  const liveProjPresent  = stats.present + liveAllSelf.filter(v => v === 'present').length;
  const liveProjPct      = liveProjTotal > 0 ? Math.round((liveProjPresent / liveProjTotal) * 100) : 0;
  const liveHasData      = liveAllSelf.length > 0;

  // Per-week self-tracked map
  const selfWeekMap = {};
  for (const [date, slots] of Object.entries(selfByDate)) {
    if (entryDates.has(date)) continue;
    const { week, year } = getISOWeek(date);
    const key = `${year}-${week}`;
    if (!selfWeekMap[key]) selfWeekMap[key] = { present: 0, total: 0 };
    for (const status of Object.values(slots)) { selfWeekMap[key].total++; if (status === 'present') selfWeekMap[key].present++; }
  }
  for (const entry of trackerEntries) {
    if (!Object.keys(entry.slots).length) continue;
    const { week, year } = getISOWeek(entry.date);
    const key = `${year}-${week}`;
    if (!selfWeekMap[key]) selfWeekMap[key] = { present: 0, total: 0 };
    for (const status of Object.values(entry.slots)) { selfWeekMap[key].total++; if (status === 'present') selfWeekMap[key].present++; }
  }

  const officialDateSet = new Set(dates);
  const selfOnlyDates   = Object.keys(selfByDate).filter(d => !officialDateSet.has(d)).sort().reverse();
  const allDates        = [...dates, ...selfOnlyDates].sort().reverse();
  const allSlots        = stats.slots.length > 0 ? stats.slots : TIME_SLOTS;

  const card    = isDark ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
                         : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' };
  const inner   = isDark ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }
                         : { background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px' };
  const divider = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9';

  const statusColor = pct >= 85 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';
  const statusLabel = pct >= 85 ? 'Excellent' : pct >= 75 ? 'Safe' : 'At Risk';

  // ─── TAB CONTENT ─────────────────────────────────────────────────────────────

  const HomeTab = (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-2xl p-5 overflow-hidden relative"
           style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
        {/* Subtle bg accent */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: isDark ? `radial-gradient(ellipse at top right, ${statusColor}18 0%, transparent 60%)` : `radial-gradient(ellipse at top right, ${statusColor}10 0%, transparent 60%)` }} />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
               style={{ background: isDark ? 'rgba(255,255,255,0.12)' : '#1e293b' }}>
            {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-bold text-base leading-tight" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                  {[s.rollNumber, s.branch, s.crtSec].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                    style={{ background: `${statusColor}20`, color: statusColor }}>
                {statusLabel}
              </span>
            </div>

            {/* Big % */}
            <div className="mt-4 flex items-end gap-3">
              <div>
                <p className="text-5xl font-black leading-none" style={{ color: statusColor }}>{pct}%</p>
                <p className="text-xs mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>Overall Attendance</p>
              </div>
              <div className="flex-1 pb-1">
                {/* Progress bar */}
                <div className="h-2.5 rounded-full overflow-hidden mb-1"
                     style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: statusColor }} />
                </div>
                {/* Threshold markers */}
                <div className="relative h-3">
                  {[75, 85].map(t => (
                    <div key={t} className="absolute top-0 flex flex-col items-center"
                         style={{ left: `${t}%`, transform: 'translateX(-50%)' }}>
                      <div className="w-px h-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.25)' : '#cbd5e1' }} />
                      <span className="text-[9px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{t}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-4 grid grid-cols-3 gap-2 pt-4" style={{ borderTop: divider }}>
          {[
            { label: 'Total',   value: stats.total,   color: isDark ? 'rgba(255,255,255,0.8)' : '#334155' },
            { label: 'Present', value: stats.present, color: '#16a34a' },
            { label: 'Absent',  value: stats.absent,  color: '#dc2626' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Key advice — top line only */}
      {advice[0] && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-3"
             style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #f1f5f9' }}>
          <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[advice[0].type]}`} />
          <p className={`text-sm leading-relaxed ${ADVICE_STYLE[advice[0].type]}`}>{advice[0].text}</p>
        </div>
      )}

      {/* Quick threshold cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[{ label: '75% Threshold', data: b75, color: '#d97706' }, { label: '85% Threshold', data: b85, color: '#16a34a' }].map(({ label, data, color }) => (
            <div key={label} className="rounded-xl p-4" style={inner}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>{label}</p>
              {data.canBunk > 0 ? (
                <>
                  <div className="text-2xl font-bold" style={{ color: '#16a34a' }}>{data.canBunk}</div>
                  <div className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>sessions flexible</div>
                  <div className="text-[10px] mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>≈ {Math.floor(data.canBunk / 8)} days</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-500">{data.needAttend}</div>
                  <div className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>sessions to recover</div>
                  <div className="text-[10px] mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notices */}
      {updates.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}>
          <div className="flex items-center justify-between px-4 py-2.5"
               style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderBottom: divider }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#475569' }}>Notices</span>
            </div>
            <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{updates.length} item{updates.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {updates.map((u, i) => {
              const cl = u.category === 'important' ? 'Important' : u.category === 'warning' ? 'Warning' : 'Info';
              return (
                <div key={u._id} className="px-4 py-3" style={{ borderBottom: i < updates.length - 1 ? divider : 'none' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      u.category === 'important' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                        : u.category === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                      {u.pinned ? '📌 ' : ''}{cl}
                    </span>
                    <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  {u.title && <p className="text-xs font-semibold mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#0f172a' }}>{u.title}</p>}
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}>{u.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ─── WEEKLY TAB ───────────────────────────────────────────────────────────────
  const WeeklyTab = (
    <div className="space-y-4">
      {stats.weeks && stats.weeks.length > 0 ? (
        <>
          {/* Summary row */}
          {(() => {
            const ws        = stats.weeks;
            const safeCount = ws.filter(w => w.pct >= 75).length;
            const lowCount  = ws.length - safeCount;
            const avgPct    = ws.length > 0 ? Math.round(ws.reduce((s, w) => s + w.pct, 0) / ws.length) : 0;
            return (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Avg / Week', value: avgPct + '%', color: pctColor(avgPct) },
                  { label: 'Safe Weeks', value: safeCount,    color: '#16a34a' },
                  { label: 'Low Weeks',  value: lowCount,     color: lowCount > 0 ? '#dc2626' : '#16a34a' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-4 text-center" style={card}>
                    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                    <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Week rows */}
          <div className="rounded-xl overflow-hidden" style={card}>
            <div className="px-4 py-3" style={{ borderBottom: divider }}>
              <h2 className="text-sm font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>Weekly Breakdown</h2>
              <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>Official · Projected (from your tracker)</p>
            </div>
            <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
              {[...stats.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
                const seq   = weekSeq[`${w.year}-${w.week}`];
                const range = isoWeekDateRange(w.year, w.week);
                const sd    = selfWeekMap[`${w.year}-${w.week}`];
                const hasSD = sd && sd.total > 0;
                const pTotal   = w.total   + (hasSD ? sd.total   : 0);
                const pPresent = w.present + (hasSD ? sd.present : 0);
                const pPct     = pTotal > 0 ? Math.round((pPresent / pTotal) * 100) : 0;
                return (
                  <div key={`${w.year}-${w.week}`} className="px-4 py-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#1e293b' }}>Week {seq}</span>
                        <span className="text-[11px] ml-2" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{range}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        w.pct >= 75 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                        {w.pct >= 75 ? 'Safe' : 'Low'}
                      </span>
                    </div>
                    {/* Official bar */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] w-14 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>Official</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                        <div className="h-full rounded-full" style={{ width: `${w.pct}%`, background: pctColor(w.pct) }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right shrink-0" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                      <span className="text-[10px] w-10 text-right shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{w.present}/{w.total}</span>
                    </div>
                    {/* Projected bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-14 shrink-0 text-indigo-400 dark:text-indigo-500">Projected</span>
                      {hasSD ? (
                        <>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(99,102,241,0.12)' : '#e0e7ff' }}>
                            <div className="h-full rounded-full" style={{ width: `${pPct}%`, background: '#6366f1' }} />
                          </div>
                          <span className="text-xs font-bold w-8 text-right shrink-0 text-indigo-500 dark:text-indigo-400">{pPct}%</span>
                          <span className="text-[10px] w-10 text-right shrink-0 text-indigo-400 dark:text-indigo-500">{pPresent}/{pTotal}</span>
                        </>
                      ) : (
                        <span className="text-[10px] italic" style={{ color: isDark ? 'rgba(99,102,241,0.4)' : '#a5b4fc' }}>
                          Track sessions in Planner tab to see projection
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advice */}
          {advice.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={card}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>Advice</p>
              {advice.map((line, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                  <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>No weekly data yet.</p>
        </div>
      )}
    </div>
  );

  // ─── PLANNER TAB ─────────────────────────────────────────────────────────────
  const PlannerTab = (
    <div className="space-y-4">

      {/* Session Planner */}
      {stats.total > 0 && (
        <div className="rounded-xl overflow-hidden" style={card}>
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: divider }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>Session Planner</h2>
              <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
                {plannerView === 'total' ? '75% / 85% bunk calculator' : 'Week-by-week breakdown'}
              </p>
            </div>
            <div className="flex rounded-lg overflow-hidden text-xs font-semibold"
                 style={{ border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }}>
              {['total', 'weekly'].map(v => (
                <button key={v} onClick={() => setPlannerView(v)}
                  className="px-4 py-1.5 capitalize transition-colors"
                  style={plannerView === v
                    ? { background: isDark ? 'rgba(255,255,255,0.12)' : '#1e293b', color: '#ffffff' }
                    : { background: 'transparent', color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>
                  {v === 'total' ? 'Total' : 'Weekly'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {plannerView === 'total' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: '75%', data: b75 }, { label: '85%', data: b85 }].map(({ label, data }) => (
                    <div key={label} className="rounded-lg p-3" style={inner}>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label} Threshold</div>
                      {data.canBunk > 0 ? (
                        <><div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions flexible</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">≈ {Math.floor(data.canBunk / 8)}d {data.canBunk % 8 > 0 ? `+ ${data.canBunk % 8}s` : ''}</div></>
                      ) : (
                        <><div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to recover</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">≈ {Math.ceil(data.needAttend / 48)} week{data.needAttend > 48 ? 's' : ''}</div></>
                      )}
                    </div>
                  ))}
                </div>
                {liveHasData && (() => {
                  const pb75 = calcBunk(liveProjPresent, liveProjTotal, 75);
                  const pb85 = calcBunk(liveProjPresent, liveProjTotal, 85);
                  return (
                    <div className="pt-3" style={{ borderTop: divider }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Projected</span>
                        <span className="text-[10px] text-slate-400">· {liveProjPresent}/{liveProjTotal} sessions</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ label: '75%', data: pb75 }, { label: '85%', data: pb85 }].map(({ label, data }) => (
                          <div key={label} className="rounded-lg p-3 border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20">
                            <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">{label}</div>
                            {data.canBunk > 0 ? (
                              <><div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions flexible</div></>
                            ) : (
                              <><div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to recover</div></>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {advice.length > 0 && (
                  <div className="pt-3 space-y-2" style={{ borderTop: divider }}>
                    {advice.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                        <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {plannerView === 'weekly' && (
              <div className="space-y-1">
                {[...stats.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => {
                  const seq   = weekSeq[`${w.year}-${w.week}`];
                  const range = isoWeekDateRange(w.year, w.week);
                  const sd    = selfWeekMap[`${w.year}-${w.week}`];
                  const hasSD = sd && sd.total > 0;
                  const pTotal   = w.total   + (hasSD ? sd.total   : 0);
                  const pPresent = w.present + (hasSD ? sd.present : 0);
                  const pPct     = pTotal > 0 ? Math.round((pPresent / pTotal) * 100) : 0;
                  return (
                    <div key={`${w.year}-${w.week}`} className="py-2.5" style={{ borderBottom: divider }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold w-14 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#334155' }}>Week {seq}</span>
                        <span className="text-[10px] truncate" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{range}</span>
                        <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${w.pct >= 75 ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                          {w.pct >= 75 ? 'Safe' : 'Low'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] w-14 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>Official</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}>
                          <div className="h-full rounded-full" style={{ width: `${w.pct}%`, background: pctColor(w.pct) }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right shrink-0" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                        <span className="text-[10px] w-9 text-right shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{w.present}/{w.total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] w-14 shrink-0 text-indigo-400">Projected</span>
                        {hasSD ? (
                          <>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(99,102,241,0.12)' : '#e0e7ff' }}>
                              <div className="h-full rounded-full" style={{ width: `${pPct}%`, background: '#6366f1' }} />
                            </div>
                            <span className="text-xs font-bold w-8 text-right shrink-0 text-indigo-500 dark:text-indigo-400">{pPct}%</span>
                            <span className="text-[10px] w-9 text-right shrink-0 text-indigo-400">{pPresent}/{pTotal}</span>
                          </>
                        ) : (
                          <span className="text-[10px] italic" style={{ color: isDark ? 'rgba(99,102,241,0.4)' : '#a5b4fc' }}>Track sessions below</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {advice.length > 0 && (
                  <div className="pt-3 space-y-2">
                    {advice.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                        <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Progression Tracker */}
      <div ref={trackerRef} className="rounded-xl overflow-hidden" style={card}>
        <div className="px-4 py-3" style={{ borderBottom: divider }}>
          <h2 className="text-sm font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>Attendance Progression</h2>
          <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
            Mark your own attendance to see projected percentage in Weekly tab.
          </p>
        </div>
        <div className="p-4 space-y-5">
          {trackerEntries.map((entry, idx) => {
            const ep = Object.values(entry.slots).filter(v => v === 'present').length;
            const ea = Object.values(entry.slots).filter(v => v === 'absent').length;
            if (entry.saved && !entry.expanded) {
              return (
                <div key={entry.id} className={idx > 0 ? 'pt-3' : ''} style={idx > 0 ? { borderTop: divider } : {}}>
                  <button onClick={() => toggleExpanded(entry.id)}
                    className="w-full flex items-center gap-3 text-left rounded-xl px-3 py-2.5 transition-colors" style={inner}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{fmtDate(entry.date)}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{ep} present · {ea} absent</div>
                    </div>
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded px-2 py-0.5 shrink-0">Saved ✓</span>
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              );
            }
            return (
              <div key={entry.id} className={idx > 0 ? 'pt-4 space-y-3' : 'space-y-3'} style={idx > 0 ? { borderTop: divider } : {}}>
                <div className="flex items-center gap-3">
                  {entry.saved ? (
                    <>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{fmtDate(entry.date)}</span>
                      <button onClick={() => toggleExpanded(entry.id)} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded border border-slate-200 dark:border-slate-600">Collapse</button>
                      <button onClick={() => handleDeleteDraft(entry.date)} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded border border-red-200 dark:border-red-800">Delete</button>
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Date</label>
                      <input type="date" value={entry.date} onChange={e => handleDateChange(entry.id, e.target.value)} className="form-input py-1 text-sm" style={{ maxWidth: 160 }} />
                      {trackerEntries.length > 1 && (
                        <button onClick={() => removeEntry(entry.id)} className="ml-auto text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded border border-slate-200 dark:border-slate-600">Remove</button>
                      )}
                    </>
                  )}
                </div>
                {/* Quick fill */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Quick fill:</span>
                  <button onClick={() => handleAllSlots(entry.id, 'present')} className="px-3 py-1 rounded text-xs font-semibold bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors">All Present</button>
                  <button onClick={() => handleAllSlots(entry.id, 'absent')} className="px-3 py-1 rounded text-xs font-semibold bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">All Absent</button>
                </div>
                {/* Slots grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{slot}</span>
                      <button onClick={() => handleSlotToggle(entry.id, slot, 'present')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${entry.slots[slot] === 'present' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>P</button>
                      <button onClick={() => handleSlotToggle(entry.id, slot, 'absent')}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${entry.slots[slot] === 'absent' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>A</button>
                      {entry.slots[slot] && (
                        <button onClick={() => handleSlotToggle(entry.id, slot, entry.slots[slot])} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 transition-colors text-sm leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">{ep > 0 || ea > 0 ? `${ep} present · ${ea} absent` : 'No slots marked'}</p>
                  <button onClick={() => handleSave(entry.id)} disabled={entry.saving || Object.keys(entry.slots).length === 0}
                    className={`text-xs font-medium px-4 py-1.5 rounded transition-colors ${entry.saved ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'btn-primary'}`}>
                    {entry.saving ? 'Saving…' : entry.saved ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="pt-2" style={{ borderTop: divider }}>
            <button onClick={addEntry} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add another date
            </button>
          </div>
          {liveHasData && (
            <div className="rounded-lg px-4 py-3" style={inner}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : '#334155' }}>Projected Attendance</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>{liveProjPresent}/{liveProjTotal} sessions</p>
                </div>
                <div className="text-2xl font-bold shrink-0" style={{ color: pctColor(liveProjPct) }}>{liveProjPct}%</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── LOG TAB ─────────────────────────────────────────────────────────────────
  const LogTab = (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden" style={card}>
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: divider }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>Attendance Log</h2>
            <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
              {dates.length} official · {selfOnlyDates.length} self-tracked
            </p>
          </div>
          {selfOnlyDates.length > 0 && (
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5">
              Draft rows shown
            </span>
          )}
        </div>
        {allDates.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>No attendance records yet.</p>
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
                    <tr key={dt} className={isOfficial ? 'tbl-row' : 'bg-indigo-50/50 dark:bg-indigo-900/10'}>
                      <td className="tbl-cell font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{fmtDate(dt)}</span>
                          {!isOfficial && (
                            <>
                              <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 px-1 py-0.5 rounded">Draft</span>
                              <button onClick={() => handleEditDraft(dt)} className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors font-medium">Edit</button>
                              <button onClick={() => handleDeleteDraft(dt)} className="text-[9px] text-red-400 hover:text-red-600 transition-colors font-medium">Delete</button>
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
                      <td className="tbl-cell text-center font-bold" style={{ color: pctColor(t ? Math.round(p / t * 100) : 0) }}>{p}/{t}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  const tabContent = { home: HomeTab, weekly: WeeklyTab, planner: PlannerTab, log: LogTab };

  return (
    <div className="min-h-screen" style={isDark ? { background: darkBg } : { background: '#f8fafc' }}>

      {/* ── Top header ── */}
      <header className="sticky top-0 z-20"
              style={isDark
                ? { background: 'rgba(8,13,26,0.92)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }
                : { background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3" style={{ height: 52 }}>
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black text-white shrink-0"
               style={isDark ? { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)' } : { background: '#1e293b' }}>
            KL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a' }}>
              CRT Attendance Tracker
            </p>
          </div>
          {/* Desktop tab nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={activeTab === tab.id
                  ? { background: isDark ? 'rgba(255,255,255,0.12)' : '#f1f5f9', color: isDark ? '#ffffff' : '#0f172a' }
                  : { color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <button onClick={logout}
              className="text-xs rounded px-3 py-1.5 transition-colors font-medium"
              style={isDark ? { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' } : { color: '#64748b', border: '1px solid #e2e8f0' }}>
              Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Page title strip (mobile) ── */}
      <div className="sm:hidden px-4 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
          {TABS.find(t => t.id === activeTab)?.label}
        </p>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-2xl mx-auto px-4 pt-2 pb-28 sm:pb-8 space-y-4">
        {tabContent[activeTab]}

        {/* Footer */}
        <div className="pt-4 pb-2 text-center space-y-0.5">
          <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.18)' : '#cbd5e1' }}>
            A student-built attendance tracking platform for the Y-23 Summer CRT Training at KL University.
          </p>
          <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.18)' : '#cbd5e1' }}>
            Made by{' '}
            <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer"
               style={{ color: isDark ? 'rgba(255,255,255,0.32)' : '#94a3b8', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Akhil Panvi
            </a>
            {' '}· with personal interest and easy tracking.
          </p>
        </div>
      </main>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 flex"
           style={isDark
             ? { background: 'rgba(8,13,26,0.96)', borderTop: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }
             : { background: '#ffffff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 12px rgba(0,0,0,0.06)' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors"
              style={{ color: active ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8') }}>
              <div style={{ opacity: active ? 1 : 0.6 }}>{tab.icon}</div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
