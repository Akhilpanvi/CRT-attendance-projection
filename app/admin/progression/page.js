'use client';
import { useState, useEffect } from 'react';
import { fmtDate, pctColor } from '@/lib/helpers';

function PctBadge({ pct }) {
  const color = pctColor(pct);
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color, background: color + '22' }}>
      {pct}%
    </span>
  );
}

export default function ProgressionPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch('/api/admin/self-progression')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(roll) {
    setExpanded(prev => ({ ...prev, [roll]: !prev[roll] }));
  }

  const filtered = data
    ? data.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.crtSec.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                      text-red-700 dark:text-red-400 rounded-lg p-4 text-sm">{error}</div>
    </div>
  );

  const totalStudents = data?.length ?? 0;
  const totalDates    = data?.reduce((s, r) => s + r.dates.length, 0) ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student Self-Tracked Attendance</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Attendance students have projected themselves before official upload
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Students Tracking', value: totalStudents },
          { label: 'Total Dates Tracked', value: totalDates },
          { label: 'Showing', value: filtered.length },
        ].map(c => (
          <div key={c.label}
               className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                          rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{c.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
        <input
          type="text"
          placeholder="Search by name, reg. no. or CRT section…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input w-full text-sm"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                        rounded-lg p-10 text-center text-slate-400 text-sm">
          {search ? 'No students match your search.' : 'No self-tracked attendance data yet.'}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2
                          bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700
                          text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Student</span>
            <span className="text-right">Self P</span>
            <span className="text-right">Self A</span>
            <span className="text-right">Official %</span>
            <span className="text-right">Projected %</span>
            <span></span>
          </div>

          {filtered.map(s => (
            <div key={s.rollNumber} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
              {/* Student row */}
              <button
                onClick={() => toggle(s.rollNumber)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3
                           hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left items-center">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {s.rollNumber}{s.crtSec ? ` · Sec ${s.crtSec}` : ''}
                    {' · '}{s.dates.length} date{s.dates.length !== 1 ? 's' : ''} tracked
                  </div>
                </div>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 text-right">
                  {s.selfPresent}
                </span>
                <span className="text-xs font-semibold text-red-500 dark:text-red-400 text-right">
                  {s.selfAbsent}
                </span>
                <PctBadge pct={s.officialPct} />
                <PctBadge pct={s.projPct} />
                <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded[s.rollNumber] ? 'rotate-180' : ''}`}
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded: per-date breakdown */}
              {expanded[s.rollNumber] && (
                <div className="px-4 pb-3 space-y-2">
                  {s.dates.map(d => (
                    <div key={d.date}
                         className="bg-slate-50 dark:bg-slate-700/30 rounded-lg px-3 py-2.5
                                    border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {fmtDate(d.date)}
                        </span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-green-600 dark:text-green-400 font-semibold">{d.present}P</span>
                          <span className="text-red-500 dark:text-red-400 font-semibold">{d.absent}A</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(d.slots).map(([slot, status]) => (
                          <span key={slot}
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded
                                  ${status === 'present'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                            {slot} · {status === 'present' ? 'P' : 'A'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
