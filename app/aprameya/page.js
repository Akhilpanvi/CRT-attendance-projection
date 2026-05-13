'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pctColor, fmtDate } from '@/lib/helpers';
import ThemeToggle from '@/components/ThemeToggle';

// ── Math ─────────────────────────────────────────────────────────────────────
function calcBunk(present, total, threshold = 75) {
  if (!total) return { pct: 0, canBunk: 0, needAttend: 0 };
  const pct = Math.round((present / total) * 100);
  const t   = threshold / 100;
  if (pct >= threshold) {
    return { pct, canBunk: Math.max(0, Math.floor((present - t * total) / t)), needAttend: 0 };
  }
  return { pct, canBunk: 0, needAttend: Math.ceil((t * total - present) / (1 - t)) };
}

function generateAdvice(stats) {
  const { present, total, overallPct, weeks = [] } = stats;
  const b75 = calcBunk(present, total, 75);
  const b85 = calcBunk(present, total, 85);
  const lines = [];

  // Overall status
  if (overallPct >= 85) {
    lines.push({ type: 'ok',   text: `Overall ${overallPct}% — well above both thresholds. Buffer: ${b85.canBunk} sessions at 85%, ${b75.canBunk} sessions at 75%.` });
  } else if (overallPct >= 75) {
    lines.push({ type: 'warn', text: `Overall ${overallPct}% — safe at 75% but below 85%. Can skip ${b75.canBunk} more sessions before hitting 75%.` });
  } else {
    lines.push({ type: 'bad',  text: `Overall ${overallPct}% — BELOW 75%. Must attend ${b75.needAttend} consecutive sessions to recover to 75%.` });
  }

  // Weekly breakdown
  const recent = [...weeks].sort((a, b) => b.year - a.year || b.week - a.week).slice(0, 4);
  for (const w of recent) {
    if (w.pct === 100) lines.push({ type: 'ok',   text: `Week ${w.week}: Perfect — ${w.present}/${w.total} (100%). Good buffer built.` });
    else if (w.pct < 60) lines.push({ type: 'bad',  text: `Week ${w.week}: Very low — ${w.present}/${w.total} (${w.pct}%). This week pulled the overall down.` });
    else if (w.pct < 75) lines.push({ type: 'warn', text: `Week ${w.week}: Below threshold — ${w.present}/${w.total} (${w.pct}%). Avoid bunking this week.` });
    else               lines.push({ type: 'info', text: `Week ${w.week}: ${w.present}/${w.total} (${w.pct}%) — on track.` });
  }

  // Bunk strategy
  if (b75.canBunk >= 16) {
    lines.push({ type: 'tip', text: `Strategy: ${b75.canBunk} slots of buffer (≈${Math.floor(b75.canBunk / 8)} full days). Spread them out — never skip more than 1 day per week.` });
  } else if (b75.canBunk >= 8) {
    lines.push({ type: 'tip', text: `Strategy: ${b75.canBunk} slots left. Take at most 1 full day off, then attend everything for 2 weeks.` });
  } else if (b75.canBunk > 0) {
    lines.push({ type: 'tip', text: `Strategy: Only ${b75.canBunk} slots to spare — skip individual slots (last of day), not full days.` });
  } else if (b75.needAttend > 0) {
    lines.push({ type: 'tip', text: `Recovery plan: Attend every session for the next ${Math.ceil(b75.needAttend / 8)} week${b75.needAttend > 8 ? 's' : ''} with zero bunks.` });
  }

  return lines;
}

// ── Small components ──────────────────────────────────────────────────────────
function PctPill({ pct }) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: pctColor(pct), background: `${pctColor(pct)}18` }}>
      {pct}%
    </span>
  );
}

function MiniBar({ pct, width = 80 }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-1.5" style={{ width }}>
      <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const ADVICE_STYLE = {
  ok:   'text-green-700 dark:text-green-400',
  warn: 'text-amber-700 dark:text-amber-400',
  bad:  'text-red-700 dark:text-red-400',
  info: 'text-slate-600 dark:text-slate-300',
  tip:  'text-blue-700 dark:text-blue-400',
};
const ADVICE_DOT = {
  ok: 'bg-green-500', warn: 'bg-amber-500', bad: 'bg-red-500', info: 'bg-slate-400', tip: 'bg-blue-500',
};

// ── Circle view ───────────────────────────────────────────────────────────────
function CircleView({ members, stats, onAdd, onRemove, onSelect, selected }) {
  const [input, setInput] = useState('');

  function add() {
    const roll = input.trim().toUpperCase();
    if (roll) { onAdd(roll); setInput(''); }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          className="form-input flex-1"
          placeholder="Add registration number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="btn-primary shrink-0" onClick={add}>Add</button>
      </div>

      {members.length === 0 && (
        <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
          Circle is empty. Add registration numbers above.
        </p>
      )}

      <div className="space-y-2">
        {members.map(roll => {
          const d    = stats[roll];
          const s    = d?.stats;
          const b75  = s ? calcBunk(s.present, s.total, 75) : null;
          const weeks = (s?.weeks || []).slice(0, 3);
          const isSelected = selected === roll;

          return (
            <div key={roll}
                 className={`border rounded-lg overflow-hidden transition-colors cursor-pointer
                   ${isSelected
                     ? 'border-slate-500 dark:border-slate-400'
                     : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                 onClick={() => onSelect(isSelected ? null : roll)}>
              <div className="flex items-center gap-3 px-3 py-2.5
                              bg-slate-50 dark:bg-slate-700/40">
                <div className="w-8 h-8 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center
                                justify-center text-white text-xs font-bold shrink-0">
                  {d?.student?.name
                    ? d.student.name.split(' ').map(w => w[0]).join('').slice(0, 2)
                    : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {d?.student?.name || roll}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {d?.student
                      ? [d.student.branch, d.student.dept, d.student.crtSec].filter(Boolean).join(' · ')
                      : 'Loading…'}
                  </div>
                </div>
                {s && (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400">{s.present}/{s.total}</div>
                      {b75 && (
                        <div className={`text-xs font-medium ${b75.canBunk > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {b75.canBunk > 0 ? `skip ${b75.canBunk}` : `need ${b75.needAttend}`}
                        </div>
                      )}
                    </div>
                    <PctPill pct={s.overallPct} />
                  </div>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onRemove(roll); }}
                  className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Expanded weekly view */}
              {isSelected && s && (
                <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-slate-600
                                bg-white dark:bg-slate-800">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { l: 'Present', v: s.present, c: 'text-green-600 dark:text-green-400' },
                      { l: 'Total',   v: s.total,   c: 'text-slate-800 dark:text-slate-200' },
                      { l: 'Absent',  v: s.absent,  c: 'text-red-600 dark:text-red-400'   },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="text-center border border-slate-200 dark:border-slate-600
                                              bg-slate-50 dark:bg-slate-700/40 rounded p-2">
                        <div className={`text-lg font-bold ${c}`}>{v}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{l}</div>
                      </div>
                    ))}
                  </div>

                  {weeks.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Weekly
                      </div>
                      {weeks.map(w => (
                        <div key={`${w.year}-${w.week}`} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 w-16 shrink-0">Week {w.week}</span>
                          <MiniBar pct={w.pct} width={60} />
                          <span className="font-medium" style={{ color: pctColor(w.pct) }}>{w.pct}%</span>
                          <span className="text-slate-400">{w.present}/{w.total}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advice */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Advice
                    </div>
                    {generateAdvice(s).map((line, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                        <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bunk Calculator (manual + circle members) ─────────────────────────────────
function BunkCalc({ members, stats, myRoll }) {
  const [mode, setMode]       = useState(members.length > 0 ? 'circle' : 'manual');
  const [selectedRoll, setSelectedRoll] = useState(myRoll || members[0] || '');
  const [present, setPresent] = useState('');
  const [total, setTotal]     = useState('');

  // Auto-switch when members change
  useEffect(() => {
    if (members.length > 0 && mode === 'circle' && !members.includes(selectedRoll)) {
      setSelectedRoll(members[0]);
    }
  }, [members]);

  const circleData = mode === 'circle' ? stats[selectedRoll] : null;
  const s = circleData?.stats;

  const P = mode === 'circle' ? (s?.present ?? 0) : (parseInt(present) || 0);
  const T = mode === 'circle' ? (s?.total   ?? 0) : (parseInt(total)   || 0);
  const valid = P > 0 && T > 0 && P <= T;

  const b75 = valid ? calcBunk(P, T, 75) : null;
  const b85 = valid ? calcBunk(P, T, 85) : null;

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
        <p className="card-title">Input Source</p>
        <div className="flex gap-2 mb-4">
          {members.length > 0 && (
            <button
              onClick={() => setMode('circle')}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors
                ${mode === 'circle'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              From Circle
            </button>
          )}
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors
              ${mode === 'manual'
                ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            Manual Entry
          </button>
        </div>

        {mode === 'circle' && members.length > 0 && (
          <div>
            <label className="form-label">Select Circle Member</label>
            <select className="form-input" value={selectedRoll} onChange={e => setSelectedRoll(e.target.value)}>
              {members.map(roll => (
                <option key={roll} value={roll}>
                  {stats[roll]?.student?.name || roll}
                </option>
              ))}
            </select>
            {s && (
              <div className="mt-2 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{s.present} present</span>
                <span>·</span>
                <span>{s.total} total</span>
                <span>·</span>
                <span style={{ color: pctColor(s.overallPct) }}>{s.overallPct}%</span>
              </div>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Sessions Present</label>
              <input className="form-input" type="number" min="0"
                     placeholder="e.g. 42" value={present} onChange={e => setPresent(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Total Sessions</label>
              <input className="form-input" type="number" min="0"
                     placeholder="e.g. 56" value={total} onChange={e => setTotal(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {valid && b75 && b85 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { threshold: '75%', data: b75 },
              { threshold: '85%', data: b85 },
            ].map(({ threshold, data }) => (
              <div key={threshold}
                   className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                              rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase
                                tracking-wider mb-2">{threshold} threshold</div>
                {data.canBunk > 0 ? (
                  <>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to skip</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      ≈ {Math.floor(data.canBunk / 8)} full day{Math.floor(data.canBunk / 8) !== 1 ? 's' : ''}
                      {data.canBunk % 8 > 0 ? ` + ${data.canBunk % 8} slot${data.canBunk % 8 !== 1 ? 's' : ''}` : ''}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions to recover</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      ≈ {Math.ceil(data.needAttend / 8)} week{data.needAttend > 8 ? 's' : ''} straight
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Weekly breakdown for circle member */}
          {mode === 'circle' && s?.weeks?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                            rounded-lg p-5">
              <p className="card-title">Weekly Breakdown</p>
              <div className="space-y-2">
                {[...s.weeks].sort((a, b) => b.year - a.year || b.week - a.week).map(w => (
                  <div key={`${w.year}-${w.week}`}
                       className="flex items-center gap-3 p-2.5 rounded border
                                  border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                    <div className="w-16 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Week {w.week}
                    </div>
                    <div className="flex-1">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${w.pct}%`, background: pctColor(w.pct) }} />
                      </div>
                    </div>
                    <div className="text-xs font-bold shrink-0 w-10 text-right"
                         style={{ color: pctColor(w.pct) }}>{w.pct}%</div>
                    <div className="text-xs text-slate-400 shrink-0 w-12 text-right">
                      {w.present}/{w.total}
                    </div>
                    <div className="shrink-0">
                      {w.pct >= 85
                        ? <span className="badge-present text-[10px]">Safe</span>
                        : w.pct >= 75
                          ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Warn</span>
                          : <span className="badge-absent text-[10px]">Low</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advice */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                          rounded-lg p-5">
            <p className="card-title">Advice</p>
            <div className="space-y-2.5">
              {generateAdvice(mode === 'circle' && s ? s : { present: P, total: T, overallPct: Math.round(P/T*100), weeks: [] })
                .map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ADVICE_DOT[line.type]}`} />
                    <span className={ADVICE_STYLE[line.type]}>{line.text}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {!valid && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                        rounded-lg p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
          {mode === 'circle'
            ? (members.length === 0 ? 'Add members to your circle first.' : 'Loading data…')
            : 'Enter present and total session counts above.'}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AprameYaPage() {
  const router = useRouter();
  const [tab, setTab] = useState('circle');

  const [myRoll, setMyRoll]   = useState(() => { try { return localStorage.getItem('aprameya_self') || ''; } catch { return ''; } });
  const [myRollInput, setMyRollInput] = useState('');

  const [members, setMembers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aprameya_circle') || '[]'); } catch { return []; }
  });
  const [stats, setStats]     = useState({});
  const [selected, setSelected] = useState(null);

  // All rolls to keep stats for = circle + self
  const allRolls = [...new Set([...(myRoll ? [myRoll] : []), ...members])];

  const saveMembers = useCallback((list) => {
    setMembers(list);
    try { localStorage.setItem('aprameya_circle', JSON.stringify(list)); } catch {}
  }, []);

  // Fetch stats for any roll not yet loaded (circle + self)
  useEffect(() => {
    const toFetch = allRolls.filter(roll => stats[roll] === undefined);
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map(roll =>
        fetch(`/api/students/${encodeURIComponent(roll)}`)
          .then(r => r.json())
          .catch(() => null)
      )
    ).then(results => {
      setStats(prev => {
        const updated = { ...prev };
        results.forEach((r, i) => {
          updated[toFetch[i]] = (r && !r.error) ? r : null;
        });
        return updated;
      });
    });
  }, [allRolls.join(',')]);

  function addMember(roll) {
    if (!members.includes(roll)) {
      saveMembers([...members, roll]);
    }
  }

  function removeMember(roll) {
    saveMembers(members.filter(m => m !== roll));
    setStats(prev => { const n = { ...prev }; delete n[roll]; return n; });
    if (selected === roll) setSelected(null);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const TABS = [
    { key: 'circle',     label: 'Private Circle' },
    { key: 'calculator', label: 'Bunk Calculator' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-slate-800 dark:bg-slate-950 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 flex items-center" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-white/15 border border-white/20 flex items-center
                            justify-center text-xs font-black text-white">A</div>
            <span className="font-semibold text-sm text-white">Aprameya's Portal</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle light />
            <button onClick={logout}
                    className="text-xs text-white/70 hover:text-white border border-white/20
                               hover:border-white/40 rounded px-3 py-1.5 transition-colors font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* My Attendance */}
        {!myRoll ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                          rounded-lg p-4 mb-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Set your registration number</div>
              <div className="text-xs text-slate-400">Auto-pull your own attendance in Bunk Calculator</div>
            </div>
            <input
              className="form-input w-40 text-xs"
              placeholder="Reg. No."
              value={myRollInput}
              onChange={e => setMyRollInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { const r = myRollInput.trim().toUpperCase(); if (r) { setMyRoll(r); try { localStorage.setItem('aprameya_self', r); } catch {} } } }}
            />
            <button
              className="btn-primary btn-sm shrink-0"
              onClick={() => { const r = myRollInput.trim().toUpperCase(); if (r) { setMyRoll(r); try { localStorage.setItem('aprameya_self', r); } catch {} } }}>
              Set
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                          rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400 mb-0.5">My Attendance</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {stats[myRoll]?.student?.name || myRoll}
                </div>
              </div>
              {stats[myRoll]?.stats && (
                <>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{stats[myRoll].stats.present}/{stats[myRoll].stats.total}</div>
                    <PctPill pct={stats[myRoll].stats.overallPct} />
                  </div>
                  <div className="text-center border-l border-slate-200 dark:border-slate-600 pl-3">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {calcBunk(stats[myRoll].stats.present, stats[myRoll].stats.total, 75).canBunk}
                    </div>
                    <div className="text-[10px] text-slate-400">can skip</div>
                  </div>
                </>
              )}
              {stats[myRoll] === undefined && (
                <span className="text-xs text-slate-400">Loading…</span>
              )}
              {stats[myRoll] === null && (
                <span className="text-xs text-red-500">Not found</span>
              )}
              <button
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                onClick={() => { setMyRoll(''); try { localStorage.removeItem('aprameya_self'); } catch {} }}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                      ${tab === t.key
                        ? 'border-slate-800 dark:border-slate-300 text-slate-900 dark:text-slate-100'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {t.label}
              {t.key === 'circle' && members.length > 0 && (
                <span className="ml-1.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400
                                 px-1.5 py-0.5 rounded-full">{members.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'circle' && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <p className="card-title">Private Circle</p>
            <CircleView
              members={members}
              stats={stats}
              onAdd={addMember}
              onRemove={removeMember}
              onSelect={setSelected}
              selected={selected}
            />
          </div>
        )}

        {tab === 'calculator' && (
          <BunkCalc members={allRolls} stats={stats} myRoll={myRoll} />
        )}
      </main>
    </div>
  );
}
