'use client';
import { useEffect, useState } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { fmtDate } from '@/lib/helpers';

const PATTERN_STYLE = {
  morning_only:      { label: 'Left after morning',       cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  afternoon_only:    { label: 'Afternoon only',           cls: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  left_and_returned: { label: 'Left & returned',          cls: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  left_early:        { label: 'Left before last session', cls: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  came_late:         { label: 'Came late',                cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
};

function PatternBadge({ pattern }) {
  const s = PATTERN_STYLE[pattern] || { label: pattern, cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function IrregularPage() {
  const { toast, show } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [q, setQ]               = useState('');

  useEffect(() => {
    fetch('/api/admin/irregular')
      .then(r => r.json())
      .then(d => { setStudents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { show(e.message, 'error'); setLoading(false); });
  }, []);

  const filtered = students.filter(s =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(q.toLowerCase())
  );

  // Count by pattern
  const counts = {};
  for (const s of students) for (const d of s.irregularDays) counts[d.pattern] = (counts[d.pattern] || 0) + 1;

  return (
    <div>
      <Toast toast={toast} />

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Irregular Attendance</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Students with suspicious attendance patterns
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

      {/* Pattern summary */}
      {!loading && Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(counts).map(([p, n]) => {
            const s = PATTERN_STYLE[p];
            return (
              <div key={p} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold ${s?.cls || ''}`}>
                <span>{s?.label || p}</span>
                <span className="opacity-60">·</span>
                <span>{n}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''} with irregular patterns
        </div>

        {loading && <p className="text-center text-slate-400 py-10 text-sm">Analysing attendance…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-400 py-10 text-sm">No irregular attendance detected.</p>
        )}

        {filtered.map(s => (
          <div key={s.rollNumber}
               className="border-b border-slate-100 dark:border-slate-700 last:border-0">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
              onClick={() => setExpanded(expanded === s.rollNumber ? null : s.rollNumber)}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-slate-600">
                {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{s.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {[s.branch, s.dept, s.crtSec].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="badge-purple shrink-0 mr-2">{s.rollNumber}</span>
              <div className="flex flex-wrap gap-1 shrink-0 max-w-[260px]">
                {[...new Set(s.irregularDays.map(d => d.pattern))].map(p => (
                  <PatternBadge key={p} pattern={p} />
                ))}
              </div>
              <span className="text-xs text-slate-400 ml-2 shrink-0">
                {s.count} day{s.count !== 1 ? 's' : ''}
              </span>
              <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded === s.rollNumber ? 'rotate-180' : ''}`}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === s.rollNumber && (
              <div className="px-4 pb-3 pl-15">
                <div className="ml-11 border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="tbl-header">Date</th>
                        <th className="tbl-header">Pattern</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.irregularDays.map((d, i) => (
                        <tr key={i} className="tbl-row">
                          <td className="tbl-cell font-medium">{fmtDate(d.date)}</td>
                          <td className="tbl-cell"><PatternBadge pattern={d.pattern} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
