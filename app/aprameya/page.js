'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pctColor, fmtDate } from '@/lib/helpers';
import ThemeToggle from '@/components/ThemeToggle';

// ── Bunk Math ────────────────────────────────────────────────────────────────
function calcBunk(present, total, threshold = 75) {
  if (total === 0) return { pct: 0, canBunk: 0, needAttend: 0 };
  const pct = Math.round((present / total) * 100);
  const t   = threshold / 100;
  if (pct >= threshold) {
    const canBunk = Math.floor((present - t * total) / t);
    return { pct, canBunk: Math.max(0, canBunk), needAttend: 0 };
  } else {
    const needAttend = Math.ceil((t * total - present) / (1 - t));
    return { pct, canBunk: 0, needAttend };
  }
}

function BunkCard({ present, total }) {
  const s75 = calcBunk(present, total, 75);
  const s85 = calcBunk(present, total, 85);

  return (
    <div className="space-y-3">
      {[
        { label: '75% threshold', data: s75, color: '#15803d' },
        { label: '85% threshold', data: s85, color: '#d97706' },
      ].map(({ label, data, color }) => (
        <div key={label} className="border border-slate-200 dark:border-slate-600
                                     bg-slate-50 dark:bg-slate-700/40 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {label}
            </span>
            <span className="text-sm font-bold" style={{ color: pctColor(data.pct) }}>{data.pct}%</span>
          </div>
          {data.canBunk > 0 ? (
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.canBunk}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                sessions you can safely skip
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                That's roughly {Math.floor(data.canBunk / 8)} full day{Math.floor(data.canBunk / 8) !== 1 ? 's' : ''} off
                {data.canBunk % 8 > 0 ? ` + ${data.canBunk % 8} slot${data.canBunk % 8 !== 1 ? 's' : ''}` : ''}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.needAttend}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                consecutive sessions needed to recover
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="border border-slate-200 dark:border-slate-600
                       bg-slate-50 dark:bg-slate-700/40 rounded p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Strategy</div>
        <div>· Skipping a full day costs 8 slots but only 1 absence day — better than half-days</div>
        <div>· Avoid bunking consecutive days in the same week — patterns get noticed</div>
        <div>· Best slots to skip: last session of the day (least suspicious)</div>
        <div>· After bunking, attend the next {Math.max(2, Math.ceil(8 / Math.max(1, s75.canBunk)))} sessions to maintain buffer</div>
      </div>
    </div>
  );
}

// ── Circle ───────────────────────────────────────────────────────────────────
function CircleView() {
  const [members, setMembers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aprameya_circle') || '[]'); } catch { return []; }
  });
  const [input, setInput]   = useState('');
  const [stats, setStats]   = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (members.length === 0) return;
    setLoading(true);
    Promise.all(members.map(roll =>
      fetch(`/api/students/${encodeURIComponent(roll)}`).then(r => r.json()).catch(() => null)
    )).then(results => {
      const map = {};
      results.forEach((r, i) => { if (r && !r.error) map[members[i]] = r; });
      setStats(map);
      setLoading(false);
    });
  }, [members]);

  function save(list) {
    setMembers(list);
    localStorage.setItem('aprameya_circle', JSON.stringify(list));
  }

  function add() {
    const roll = input.trim().toUpperCase();
    if (!roll || members.includes(roll)) { setInput(''); return; }
    save([...members, roll]);
    setInput('');
  }

  function remove(roll) { save(members.filter(m => m !== roll)); }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          className="form-input flex-1"
          placeholder="Add registration number to circle"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="btn-primary shrink-0" onClick={add}>Add</button>
      </div>

      {members.length === 0 && (
        <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">
          Your circle is empty. Add registration numbers above.
        </p>
      )}

      {loading && <p className="text-slate-400 text-sm text-center py-4">Fetching stats…</p>}

      <div className="space-y-2">
        {members.map(roll => {
          const d = stats[roll];
          const pct = d?.stats?.overallPct ?? null;
          const b75 = d ? calcBunk(d.stats.present, d.stats.total, 75) : null;
          return (
            <div key={roll}
                 className="flex items-center gap-3 border border-slate-200 dark:border-slate-600
                            bg-slate-50 dark:bg-slate-700/40 rounded p-3">
              <div className="w-8 h-8 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center
                              justify-center text-white text-xs font-bold shrink-0">
                {d?.student?.name ? d.student.name.split(' ').map(w=>w[0]).join('').slice(0,2) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {d?.student?.name || roll}
                </div>
                {d && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {d.stats.present}/{d.stats.total} present
                    {b75 && b75.canBunk > 0
                      ? <span className="ml-2 text-green-600 dark:text-green-400">can skip {b75.canBunk} more</span>
                      : b75 && <span className="ml-2 text-red-600 dark:text-red-400">needs {b75.needAttend} to recover</span>
                    }
                  </div>
                )}
              </div>
              {pct !== null && (
                <span className="text-sm font-bold shrink-0" style={{ color: pctColor(pct) }}>{pct}%</span>
              )}
              <button
                onClick={() => remove(roll)}
                className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AprameYaPage() {
  const router = useRouter();
  const [tab, setTab]       = useState('calculator');
  const [present, setPresent] = useState('');
  const [total, setTotal]     = useState('');

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const P = parseInt(present) || 0;
  const T = parseInt(total)   || 0;
  const valid = P > 0 && T > 0 && P <= T;

  const TABS = [
    { key: 'calculator', label: 'Bunk Calculator' },
    { key: 'circle',     label: 'Private Circle'  },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
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
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.key
                  ? 'border-slate-800 dark:border-slate-300 text-slate-900 dark:text-slate-100'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Bunk Calculator */}
        {tab === 'calculator' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
              <p className="card-title">Your Attendance</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
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

              {valid ? (
                <BunkCard present={P} total={T} />
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                  Enter your present and total session counts above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Private Circle */}
        {tab === 'circle' && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <p className="card-title">Private Circle</p>
            <CircleView />
          </div>
        )}
      </main>
    </div>
  );
}
