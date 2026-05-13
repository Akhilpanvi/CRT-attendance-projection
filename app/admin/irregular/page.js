'use client';
import { useEffect, useState, useMemo } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { fmtDate } from '@/lib/helpers';

const PATTERNS = {
  morning_only:      { label: 'Left after morning',       color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  afternoon_only:    { label: 'Afternoon only',           color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  left_and_returned: { label: 'Left & returned',          color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
  left_early:        { label: 'Left early',               color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  came_late:         { label: 'Came late',                color: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
};

function PatternBadge({ pattern }) {
  const p = PATTERNS[pattern] || { label: pattern, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${p.color}`}>
      {p.label}
    </span>
  );
}

const SORT_OPTIONS = [
  { value: 'days_desc',  label: 'Most irregular days' },
  { value: 'days_asc',   label: 'Fewest irregular days' },
  { value: 'name_asc',   label: 'Name A → Z' },
  { value: 'name_desc',  label: 'Name Z → A' },
];

export default function IrregularPage() {
  const { toast, show } = useToast();
  const [all, setAll]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [q, setQ]             = useState('');
  const [activePatterns, setActivePatterns] = useState(new Set());
  const [sort, setSort]       = useState('days_desc');

  useEffect(() => {
    fetch('/api/admin/irregular')
      .then(r => r.json())
      .then(d => { setAll(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { show(e.message, 'error'); setLoading(false); });
  }, []);

  // Pattern counts across all students
  const patternCounts = useMemo(() => {
    const c = {};
    for (const s of all) for (const d of s.irregularDays) c[d.pattern] = (c[d.pattern] || 0) + 1;
    return c;
  }, [all]);

  function togglePattern(p) {
    setActivePatterns(prev => {
      const n = new Set(prev);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  }

  const filtered = useMemo(() => {
    let list = all;

    // Text search
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(ql) || s.rollNumber.toLowerCase().includes(ql)
      );
    }

    // Pattern filter
    if (activePatterns.size > 0) {
      list = list.filter(s =>
        s.irregularDays.some(d => activePatterns.has(d.pattern))
      );
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sort === 'days_desc')  return b.count - a.count;
      if (sort === 'days_asc')   return a.count - b.count;
      if (sort === 'name_asc')   return a.name.localeCompare(b.name);
      if (sort === 'name_desc')  return b.name.localeCompare(a.name);
      return 0;
    });

    return list;
  }, [all, q, activePatterns, sort]);

  return (
    <div>
      <Toast toast={toast} />

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Irregular Attendance</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Students with suspicious daily attendance patterns
        </p>
      </div>

      {/* Controls bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                      rounded-lg p-3 mb-3 space-y-3">
        {/* Search + Sort row */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            className="form-input text-xs w-52"
            placeholder="Search name or reg. no."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400 shrink-0">Sort:</span>
            <select
              className="form-input text-xs py-1.5 pr-7 w-auto"
              value={sort}
              onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Pattern filter chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-400 shrink-0">Filter:</span>
          <button
            onClick={() => setActivePatterns(new Set())}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors
              ${activePatterns.size === 0
                ? 'bg-slate-800 dark:bg-slate-600 text-white border-slate-800 dark:border-slate-600'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            All
          </button>
          {Object.entries(PATTERNS).map(([key, p]) => {
            const count = patternCounts[key] || 0;
            if (!count) return null;
            const active = activePatterns.has(key);
            return (
              <button
                key={key}
                onClick={() => togglePattern(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors
                  ${active ? p.color + ' opacity-100' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <span>{p.label}</span>
                <span className="opacity-60">·</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700
                        text-xs text-slate-400 dark:text-slate-500">
          {loading ? 'Analysing…' : `${filtered.length} of ${all.length} students`}
          {activePatterns.size > 0 && ` · filtered by ${activePatterns.size} pattern${activePatterns.size > 1 ? 's' : ''}`}
        </div>

        {loading && (
          <p className="text-center text-slate-400 py-10 text-sm">Analysing attendance patterns…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-400 py-10 text-sm">No irregular attendance detected.</p>
        )}

        {filtered.map(s => (
          <div key={s.rollNumber}
               className="border-b border-slate-100 dark:border-slate-700 last:border-0">

            {/* Row */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3
                         hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
              onClick={() => setExpanded(expanded === s.rollNumber ? null : s.rollNumber)}>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center
                              justify-center text-white text-xs font-bold shrink-0">
                {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>

              {/* Name + dept */}
              <div className="w-56 shrink-0 min-w-0">
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{s.name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {[s.branch, s.dept, s.crtSec].filter(Boolean).join(' · ')}
                </div>
              </div>

              {/* Reg No */}
              <div className="w-28 shrink-0 hidden sm:block">
                <span className="badge-purple text-xs">{s.rollNumber}</span>
              </div>

              {/* Pattern badges */}
              <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                {[...new Set(s.irregularDays.map(d => d.pattern))].map(p => (
                  <PatternBadge key={p} pattern={p} />
                ))}
              </div>

              {/* Days count + chevron */}
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {s.count} day{s.count !== 1 ? 's' : ''}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded === s.rollNumber ? 'rotate-180' : ''}`}
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded === s.rollNumber && (
              <div className="px-4 pb-4 pt-1 bg-slate-50 dark:bg-slate-700/20
                              border-t border-slate-100 dark:border-slate-700">
                <div className="ml-11">
                  <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-600">
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
                            <td className="tbl-cell font-medium w-32">{fmtDate(d.date)}</td>
                            <td className="tbl-cell"><PatternBadge pattern={d.pattern} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
