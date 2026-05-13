'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate, pctColor } from '@/lib/helpers';
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
    lines.push({ type: 'ok',   text: `Overall ${overallPct}% — well above both thresholds. Buffer: ${b85.canBunk} sessions at 85%, ${b75.canBunk} at 75%.` });
  } else if (overallPct >= 75) {
    lines.push({ type: 'warn', text: `Overall ${overallPct}% — safe at 75% but below 85%. You can skip ${b75.canBunk} more sessions before hitting 75%.` });
  } else {
    lines.push({ type: 'bad',  text: `Overall ${overallPct}% — BELOW 75%. Attend ${b75.needAttend} consecutive sessions to recover.` });
  }

  const recent = [...weeks].sort((a, b) => b.year - a.year || b.week - a.week).slice(0, 4);
  for (const w of recent) {
    if (w.pct === 100)   lines.push({ type: 'ok',   text: `Week ${w.week}: Perfect — ${w.present}/${w.total} (100%).` });
    else if (w.pct < 60) lines.push({ type: 'bad',  text: `Week ${w.week}: Very low — ${w.present}/${w.total} (${w.pct}%). This pulled your overall down.` });
    else if (w.pct < 75) lines.push({ type: 'warn', text: `Week ${w.week}: Below threshold — ${w.present}/${w.total} (${w.pct}%). Don't skip this week.` });
    else                 lines.push({ type: 'info', text: `Week ${w.week}: ${w.present}/${w.total} (${w.pct}%) — on track.` });
  }

  if (b75.canBunk >= 16)      lines.push({ type: 'tip', text: `Strategy: ${b75.canBunk} slots of buffer (≈${Math.floor(b75.canBunk / 8)} full days). Spread them — never skip more than 1 day per week.` });
  else if (b75.canBunk >= 8)  lines.push({ type: 'tip', text: `Strategy: ${b75.canBunk} slots left. Take at most 1 full day off, then attend everything for 2 weeks.` });
  else if (b75.canBunk > 0)   lines.push({ type: 'tip', text: `Strategy: Only ${b75.canBunk} slots to spare — skip individual slots, not full days.` });
  else if (b75.needAttend > 0) lines.push({ type: 'tip', text: `Recovery: Attend every session for the next ${Math.ceil(b75.needAttend / 8)} week${b75.needAttend > 8 ? 's' : ''} with zero skips.` });

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

export default function StudentPage() {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/me')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 flex items-center" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black
                            text-white shrink-0 bg-slate-800 dark:bg-slate-700">KL</div>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">CRT Attendance Portal</span>
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

        {/* Bunk Calculator */}
        {stats.total > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Bunk Calculator</div>
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
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">sessions you can skip</div>
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
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance Log</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {dates.length} session{dates.length !== 1 ? 's' : ''} recorded
            </p>
          </div>

          {dates.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="tbl-header">Date</th>
                    {stats.slots.map(sl => <th key={sl} className="tbl-header">{sl}</th>)}
                    <th className="tbl-header text-center">P / T</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map(dt => {
                    const p = stats.slots.filter(sl => stats.byDate[dt][sl] === 'present').length;
                    const t = stats.slots.filter(sl => !!stats.byDate[dt][sl]).length;
                    return (
                      <tr key={dt} className="tbl-row">
                        <td className="tbl-cell font-medium">{fmtDate(dt)}</td>
                        {stats.slots.map(sl => {
                          const v = stats.byDate[dt][sl];
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
      </main>
    </div>
  );
}
