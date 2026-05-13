'use client';
import { useEffect, useState } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { pctColor } from '@/lib/helpers';

function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold min-w-[36px] text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function RemovalPage() {
  const { toast, show } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState('');

  useEffect(() => {
    fetch('/api/admin/removal')
      .then(r => r.json())
      .then(d => { setStudents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { show(e.message, 'error'); setLoading(false); });
  }, []);

  const filtered = students.filter(s =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(q.toLowerCase())
  );

  const critical = filtered.filter(s => s.stats.pct < 75);
  const warning  = filtered.filter(s => s.stats.pct >= 75 && s.stats.pct < 85);

  return (
    <div>
      <Toast toast={toast} />

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Removal List</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Students with attendance below 85%
          </p>
        </div>
        <div className="ml-auto">
          <input
            className="form-input text-xs w-52"
            placeholder="Search name or reg. no."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Below 75% — Critical', count: critical.length, color: 'text-red-600 dark:text-red-400',   bg: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' },
          { label: '75–85% — Warning',     count: warning.length,  color: 'text-amber-600 dark:text-amber-400', bg: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Total At-Risk',         count: filtered.length, color: 'text-slate-800 dark:text-slate-200', bg: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' },
        ].map(c => (
          <div key={c.label} className={`border rounded-lg p-4 text-center ${c.bg}`}>
            <div className={`text-3xl font-bold ${c.color}`}>{c.count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['#', 'Name', 'Reg. No.', 'Branch', 'Dept', 'CRT Sec', 'Present', 'Total', 'Attendance %', 'Status'].map(h => (
                  <th key={h} className="tbl-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center text-slate-400 py-10 text-sm">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-slate-400 py-10 text-sm">
                    {students.length === 0 ? 'All students are above 85% — no one at risk.' : 'No results found.'}
                  </td>
                </tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.rollNumber} className="tbl-row">
                  <td className="tbl-cell text-center text-slate-400">{i + 1}</td>
                  <td className="tbl-cell font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="tbl-cell"><span className="badge-purple">{s.rollNumber}</span></td>
                  <td className="tbl-cell">{s.branch || '—'}</td>
                  <td className="tbl-cell">{s.dept   || '—'}</td>
                  <td className="tbl-cell">{s.crtSec || '—'}</td>
                  <td className="tbl-cell text-center font-semibold text-green-700 dark:text-green-400">
                    {s.stats.present}
                  </td>
                  <td className="tbl-cell text-center">{s.stats.total}</td>
                  <td className="tbl-cell"><PctBar pct={s.stats.pct} /></td>
                  <td className="tbl-cell">
                    {s.stats.pct < 75
                      ? <span className="badge-absent">Critical</span>
                      : <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Warning</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
