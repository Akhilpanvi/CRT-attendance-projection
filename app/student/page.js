'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fmtDate, pctColor } from '@/lib/helpers';

function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="alert-danger max-w-sm">{error}</div>
    </div>
  );

  const { student: s, stats } = data;
  const pct = stats.overallPct;
  const dates = Object.keys(stats.byDate || {}).sort().reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-0 flex items-center" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black text-white shrink-0"
                 style={{ background: '#5b21b6' }}>KL</div>
            <span className="font-semibold text-sm text-gray-800">CRT Attendance Portal</span>
          </div>
          <span className="hidden sm:block text-gray-300 text-xs mr-2">·</span>
          <span className="hidden sm:block text-xs text-gray-400">Y-23 Summer CRT Training</span>
          <div className="ml-auto">
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300
                         rounded px-3 py-1.5 transition-colors font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Profile */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
                 style={{ background: '#5b21b6' }}>
              {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-base leading-tight">{s.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {[s.branch, s.dept, `Cluster ${s.cluster}`, s.crtSec, `Room ${s.crtRoom}`].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-2.5 max-w-xs">
                <PctBar pct={pct} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="badge-purple text-xs">{s.rollNumber}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Sessions', value: stats.total,   color: '#5b21b6' },
            { label: 'Present',        value: stats.present, color: '#15803d' },
            { label: 'Absent',         value: stats.absent,  color: '#dc2626' },
            { label: 'Attendance',     value: pct + '%',     color: pctColor(pct) },
          ].map(item => (
            <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Attendance log */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Attendance Log</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {dates.length} session{dates.length !== 1 ? 's' : ''} recorded
              </p>
            </div>
          </div>

          {dates.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No attendance records yet.</p>
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
