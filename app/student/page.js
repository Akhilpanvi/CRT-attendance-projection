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

function generateAdvice(present, total, overallPct, weeks = []) {
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
    if (w.pct === 100)   lines.push({ type: 'ok',   text: `Week ${w.week}: Perfect — ${w.present}/${w.total} (100%).` });
    else if (w.pct < 60) lines.push({ type: 'bad',  text: `Week ${w.week}: Very low — ${w.present}/${w.total} (${w.pct}%). This pulled your overall down.` });
    else if (w.pct < 75) lines.push({ type: 'warn', text: `Week ${w.week}: Below threshold — ${w.present}/${w.total} (${w.pct}%). Prioritize attendance this week.` });
    else                 lines.push({ type: 'info', text: `Week ${w.week}: ${w.present}/${w.total} (${w.pct}%) — on track.` });
  }

  if (b75.canBunk >= 16)      lines.push({ type: 'tip', text: `Plan: ${b75.canBunk} sessions of flexibility (≈${Math.floor(b75.canBunk / 8)} full days). Spread them — no more than 1 day per week.` });
  else if (b75.canBunk >= 8)  lines.push({ type: 'tip', text: `Plan: ${b75.canBunk} sessions of flexibility. Use at most 1 full day, then maintain full attendance for 2 weeks.` });
  else if (b75.canBunk > 0)   lines.push({ type: 'tip', text: `Plan: Only ${b75.canBunk} sessions of flexibility — plan individual leaves carefully, avoid full days.` });
  else if (b75.needAttend > 0) lines.push({ type: 'tip', text: `Recovery: Maintain full attendance for the next ${Math.ceil(b75.needAttend / 8)} week${b75.needAttend > 8 ? 's' : ''} to reach threshold.` });

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

export default function StudentPage() {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);

  const trackerRef = useRef(null);

  // Self-tracking state
  const [selfByDate,    setSelfByDate]    = useState({});
  const [trackerDate,   setTrackerDate]   = useState(today);
  const [trackerSlots,  setTrackerSlots]  = useState({});
  const [trackerSaving, setTrackerSaving] = useState(false);
  const [trackerSaved,  setTrackerSaved]  = useState(false);

  useEffect(() => {
    fetch('/api/student/me')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    fetch('/api/updates').then(r => r.json()).then(d => setUpdates(Array.isArray(d) ? d : [])).catch(() => {});

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
        setTrackerSlots(byDate[today] || {});
      })
      .catch(() => {});
  }, []);

  // Sync tracker slots when date changes
  useEffect(() => {
    setTrackerSlots(selfByDate[trackerDate] || {});
    setTrackerSaved(false);
  }, [trackerDate]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSlotToggle(slot, val) {
    setTrackerSlots(prev => {
      if (prev[slot] === val) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: val };
    });
    setTrackerSaved(false);
  }

  async function handleTrackerSave() {
    setTrackerSaving(true);
    const prevSlots    = selfByDate[trackerDate] ? Object.keys(selfByDate[trackerDate]) : [];
    const currentSlots = Object.keys(trackerSlots);
    const deletedSlots = prevSlots.filter(s => !currentSlots.includes(s));

    const entries = [
      ...Object.entries(trackerSlots).map(([slot, status]) => ({ slot, status })),
      ...deletedSlots.map(slot => ({ slot, status: null })),
    ];

    try {
      const r = await fetch('/api/student/self-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: trackerDate, entries }),
      });
      if (r.ok) {
        setSelfByDate(prev => {
          const updated = { ...prev };
          if (currentSlots.length === 0) delete updated[trackerDate];
          else updated[trackerDate] = { ...trackerSlots };
          return updated;
        });
        setTrackerSaved(true);
      }
    } catch (_) {}
    finally { setTrackerSaving(false); }
  }

  function handleEditDraft(date) {
    setTrackerDate(date);
    setTrackerSlots(selfByDate[date] || {});
    setTrackerSaved(false);
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
      if (trackerDate === date) { setTrackerSlots({}); setTrackerSaved(false); }
    } catch (_) {}
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="alert-danger max-w-sm">{error}</div>
    </div>
  );

  const { student: s, stats } = data;
  const pct    = stats.overallPct;
  const b75    = calcBunk(stats.present, stats.total, 75);
  const b85    = calcBunk(stats.present, stats.total, 85);
  const advice = generateAdvice(stats.present, stats.total, pct, stats.weeks || []);
  const dates  = Object.keys(stats.byDate || {}).sort().reverse();

  // Live projected stats — uses current unsaved trackerSlots for trackerDate,
  // plus saved selfByDate entries for all other dates
  const otherSelfEntries = Object.entries(selfByDate)
    .filter(([d]) => d !== trackerDate)
    .flatMap(([, slots]) => Object.values(slots));
  const currentEntries = Object.values(trackerSlots);
  const liveAllSelf    = [...otherSelfEntries, ...currentEntries];
  const liveProjTotal   = stats.total + liveAllSelf.length;
  const liveProjPresent = stats.present + liveAllSelf.filter(v => v === 'present').length;
  const liveProjPct     = liveProjTotal > 0 ? Math.round((liveProjPresent / liveProjTotal) * 100) : 0;
  const liveHasData     = liveAllSelf.length > 0;

  const trackerPresent = Object.values(trackerSlots).filter(v => v === 'present').length;
  const trackerAbsent  = Object.values(trackerSlots).filter(v => v === 'absent').length;

  // Merged attendance log
  const officialDateSet = new Set(dates);
  const selfOnlyDates   = Object.keys(selfByDate).filter(d => !officialDateSet.has(d)).sort().reverse();
  const allDates        = [...dates, ...selfOnlyDates].sort().reverse();
  const allSlots        = stats.slots.length > 0 ? stats.slots : TIME_SLOTS;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex items-center" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black
                            text-white shrink-0 bg-slate-800 dark:bg-slate-700">KL</div>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">CRT Attendance Tracker</span>
          </div>
          <span className="hidden sm:block text-slate-300 dark:text-slate-600 text-xs mr-2">·</span>
          <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500">Y-23 Summer CRT Training</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={logout}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100
                         border border-slate-200 dark:border-slate-600 hover:border-slate-300
                         rounded px-3 py-1.5 transition-colors font-medium ml-1">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Updates banner */}
        {updates.length > 0 && (
          <div className="space-y-2">
            {updates.map(u => {
              const c = UPDATE_COLORS[u.category] || UPDATE_COLORS.info;
              return (
                <div key={u._id} className={`flex gap-3 rounded-lg border px-4 py-3 ${c.wrap}`}>
                  <div className={`w-0.5 shrink-0 rounded-full self-stretch ${c.bar}`} />
                  <div className="min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider mr-2 ${c.label}`}>
                      {u.pinned ? '📌 ' : ''}{u.category === 'important' ? 'Important' : u.category === 'warning' ? 'Warning' : 'Info'}
                    </span>
                    {u.title && <span className={`text-xs font-semibold ${c.body}`}>{u.title} — </span>}
                    <span className={`text-xs ${c.body}`}>{u.content}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Profile */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
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
            { label: 'Total Sessions', value: stats.total,   color: '#334155' },
            { label: 'Present',        value: stats.present, color: '#15803d' },
            { label: 'Absent',         value: stats.absent,  color: '#dc2626' },
            { label: 'Attendance',     value: pct + '%',     color: pctColor(pct) },
          ].map(item => (
            <div key={item.label}
                 className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                            rounded-lg p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Attendance Progression */}
        <div ref={trackerRef} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Progression</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Mark your own attendance to see a projected percentage.
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Date picker */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Date</label>
              <input
                type="date"
                value={trackerDate}
                onChange={e => setTrackerDate(e.target.value)}
                className="form-input py-1 text-sm"
                style={{ maxWidth: 160 }}
              />
            </div>

            {/* Slot toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIME_SLOTS.map(slot => (
                <div key={slot} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{slot}</span>
                  <button
                    onClick={() => handleSlotToggle(slot, 'present')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      trackerSlots[slot] === 'present'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400'
                    }`}>P</button>
                  <button
                    onClick={() => handleSlotToggle(slot, 'absent')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      trackerSlots[slot] === 'absent'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'
                    }`}>A</button>
                  {trackerSlots[slot] && (
                    <button
                      onClick={() => handleSlotToggle(slot, trackerSlots[slot])}
                      className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400
                                 transition-colors text-sm leading-none">×</button>
                  )}
                </div>
              ))}
            </div>

            {/* Live projection */}
            {liveHasData && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-600
                              bg-slate-50 dark:bg-slate-700/30 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Projected Attendance
                    </p>
                    {(trackerPresent > 0 || trackerAbsent > 0) && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Today's entry: {trackerPresent} present · {trackerAbsent} absent
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {liveProjPresent}/{liveProjTotal} sessions
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold" style={{ color: pctColor(liveProjPct) }}>
                      {liveProjPct}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleTrackerSave}
                disabled={trackerSaving || Object.keys(trackerSlots).length === 0}
                className={`text-xs font-medium px-4 py-1.5 rounded transition-colors ${
                  trackerSaved
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'btn-primary'
                }`}>
                {trackerSaving ? 'Saving…' : trackerSaved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Session Planner */}
        {stats.total > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Session Planner</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              {stats.present} present out of {stats.total} sessions
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '75% Threshold', data: b75 },
                { label: '85% Threshold', data: b85 },
              ].map(({ label, data }) => (
                <div key={label}
                     className="border border-slate-200 dark:border-slate-600
                                bg-slate-50 dark:bg-slate-700/40 rounded-lg p-4">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</div>
                  {data.canBunk > 0 ? (
                    <>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions of flexibility</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                        ≈ {Math.floor(data.canBunk / 8)} day{Math.floor(data.canBunk / 8) !== 1 ? 's' : ''}
                        {data.canBunk % 8 > 0 ? ` + ${data.canBunk % 8} slot${data.canBunk % 8 !== 1 ? 's' : ''}` : ''}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to recover</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                        ≈ {Math.ceil(data.needAttend / 8)} week{data.needAttend > 8 ? 's' : ''} of full attendance
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Advice */}
            {advice.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Advice
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
            )}
          </div>
        )}

        {/* Attendance log */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                        rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Log</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {dates.length} official · {selfOnlyDates.length} self-tracked
              </p>
            </div>
            {selfOnlyDates.length > 0 && (
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20
                               border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5">
                Draft rows shown
              </span>
            )}
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
                    const p = allSlots.filter(sl => rowData[sl] === 'present').length;
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
                               : v === 'absent' ? <span className="badge-absent">A</span>
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

        <p className="text-[10px] text-slate-300 dark:text-slate-600 text-center pb-6 leading-relaxed">
          Not an official KL University platform.<br />
          Made by a student of Y23 KL University with personal interest and easy tracking.
        </p>
      </main>
    </div>
  );
}
