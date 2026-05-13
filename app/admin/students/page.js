'use client';
import { useState, useEffect, useMemo } from 'react';
import { fmtDate, pctColor } from '@/lib/helpers';
import { useToast, Toast } from '@/components/Toast';

function downloadAttendanceReport(students) {
  import('xlsx').then(XLSX => {
    const rows = students.map((s, i) => ({
      '#':             i + 1,
      'Name':          s.name,
      'Reg. No.':      s.rollNumber,
      'Branch':        s.branch  || '',
      'Department':    s.dept    || '',
      'Cluster':       s.cluster || '',
      'CRT Section':   s.crtSec  || '',
      'CRT Room':      s.crtRoom || '',
      'Present':       s.stats?.present ?? 0,
      'Total':         s.stats?.total   ?? 0,
      'Absent':        s.stats?.absent  ?? 0,
      'Attendance %':  s.stats?.overallPct ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `attendance_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

const PAGE_SIZE = 50;

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

function Modal({ roll, name, onClose, showToast }) {
  const [data, setData]         = useState(null);
  const [err, setErr]           = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    fetch(`/api/students/${roll}`)
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(e => setErr(e.message));
  }, [roll]);

  async function resetPassword() {
    if (!confirm(`Reset password for ${name} (${roll}) back to their Reg. No.?`)) return;
    setResetting(true);
    try {
      const r = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: roll }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResetDone(true);
      showToast(`Password reset for ${roll}`);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setResetting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                      rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5
                        border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {name} — Attendance Detail
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={resetPassword}
              disabled={resetting}
              title="Reset password to Reg. No."
              className={`text-xs font-medium px-3 py-1.5 rounded border transition-colors
                ${resetDone
                  ? 'border-green-300 text-green-600 dark:text-green-400 dark:border-green-700'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400'}`}>
              {resetting ? 'Resetting…' : resetDone ? 'Password Reset' : 'Reset Password'}
            </button>
            <button onClick={onClose}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg
                               leading-none font-bold w-6 h-6 flex items-center justify-center
                               rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              &#10005;
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {err   && <div className="alert-danger">{err}</div>}
          {!data && !err && <p className="text-slate-400 text-sm">Loading…</p>}
          {data  && <DetailView data={data} />}
        </div>
      </div>
    </div>
  );
}

function DetailView({ data }) {
  const { student: s, stats } = data;
  const pct = stats.overallPct;
  const dates = Object.keys(stats.byDate || {}).sort().reverse();
  return (
    <>
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50
                      border border-slate-200 dark:border-slate-600 rounded p-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center
                        text-white font-bold shrink-0 text-sm bg-slate-700 dark:bg-slate-600">
          {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{s.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {[s.branch, s.dept, `Cluster ${s.cluster}`, s.crtSec, `Room ${s.crtRoom}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span className="badge-purple shrink-0">{s.rollNumber}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          ['Total',   stats.total,   'text-slate-800 dark:text-slate-200'],
          ['Present', stats.present, 'text-green-700 dark:text-green-400'],
          ['Absent',  stats.absent,  'text-red-700 dark:text-red-400'],
          ['%',       pct + '%',     null],
        ].map(([l, v, c]) => (
          <div key={l} className="border border-slate-200 dark:border-slate-600
                                   bg-slate-50 dark:bg-slate-700/40 rounded p-2.5 text-center">
            <div className={`text-xl font-bold ${c || ''}`}
                 style={!c ? { color: pctColor(pct) } : undefined}>{v}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {dates.length === 0
        ? <p className="text-slate-400 text-sm">No attendance records yet.</p>
        : (
          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="tbl-header">Date</th>
                  {stats.slots.map(s => <th key={s} className="tbl-header">{s}</th>)}
                  <th className="tbl-header text-center">P/T</th>
                </tr>
              </thead>
              <tbody>
                {dates.map(dt => {
                  const p = stats.slots.filter(sl => stats.byDate[dt][sl] === 'present').length;
                  const t = stats.slots.filter(sl => !!stats.byDate[dt][sl]).length;
                  return (
                    <tr key={dt} className="tbl-row">
                      <td className="tbl-cell font-semibold">{fmtDate(dt)}</td>
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
                          style={{ color: pctColor(t ? Math.round(p / t * 100) : 0) }}>{p}/{t}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

export default function StudentsPage() {
  const { toast, show } = useToast();
  const [all, setAll]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]           = useState('');
  const [filters, setFilters] = useState({});
  const [modal, setModal]   = useState(null);
  const [page, setPage]     = useState(1);

  useEffect(() => {
    fetch('/api/admin/students')
      .then(r => r.json())
      .then(d => { setAll(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { show(e.message, 'error'); setLoading(false); });
  }, []);

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return all.filter(s =>
      (!ql || s.name.toLowerCase().includes(ql) || s.rollNumber.toLowerCase().includes(ql)) &&
      (!filters.name    || s.name.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.branch  || (s.branch  || '').toLowerCase().includes(filters.branch.toLowerCase())) &&
      (!filters.dept    || (s.dept    || '').toLowerCase().includes(filters.dept.toLowerCase())) &&
      (!filters.cluster || (s.cluster || '').toLowerCase().includes(filters.cluster.toLowerCase())) &&
      (!filters.crtSec  || (s.crtSec  || '').toLowerCase().includes(filters.crtSec.toLowerCase())) &&
      (!filters.crtRoom || (s.crtRoom || '').toLowerCase().includes(filters.crtRoom.toLowerCase())) &&
      (!filters.roll    || s.rollNumber.toLowerCase().includes(filters.roll.toLowerCase()))
    );
  }, [all, q, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Toast toast={toast} />
      {modal && <Modal roll={modal.roll} name={modal.name} onClose={() => setModal(null)} showToast={show} />}

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">All Students</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click any row to view full attendance</p>
        </div>
        <div className="ml-auto flex gap-2">
          <input
            className="form-input text-xs w-52"
            placeholder="Search name or reg. no."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
          />
          <button
            className="btn-outline btn-sm"
            disabled={loading || all.length === 0}
            onClick={() => downloadAttendanceReport(filtered)}>
            Download Report
          </button>
          <button
            className="btn-outline btn-sm"
            onClick={() => {
              setLoading(true);
              fetch('/api/admin/students').then(r => r.json()).then(d => { setAll(d); setLoading(false); });
            }}>
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700
                        text-xs text-slate-400 dark:text-slate-500">
          Showing {filtered.length} of {all.length} students
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['#', 'Name', 'Branch', 'Dept', 'Cluster', 'CRT Sec', 'Room', 'Reg. No.', 'Present', 'Total', 'Attendance %'].map(h => (
                  <th key={h} className="tbl-header">{h}</th>
                ))}
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th />
                {[['name','Name'],['branch','Branch'],['dept','Dept'],['cluster','Cluster'],['crtSec','Sec'],['crtRoom','Room'],['roll','Reg. No']].map(([k, ph]) => (
                  <th key={k} className="px-2 py-1">
                    <input
                      className="w-full border border-slate-200 dark:border-slate-600
                                 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                                 rounded px-2 py-1 text-xs focus:outline-none
                                 focus:border-slate-400 dark:focus:border-slate-500
                                 placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder={ph}
                      onChange={e => setFilter(k, e.target.value)}
                    />
                  </th>
                ))}
                <th /><th /><th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="text-center text-slate-400 py-10 text-sm">Loading students…</td></tr>
              )}
              {!loading && paged.length === 0 && (
                <tr><td colSpan={11} className="text-center text-slate-400 py-10 text-sm">No students found.</td></tr>
              )}
              {paged.map((s, i) => (
                <tr key={s.rollNumber} className="tbl-row cursor-pointer"
                    onClick={() => setModal({ roll: s.rollNumber, name: s.name })}>
                  <td className="tbl-cell text-center text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="tbl-cell font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="tbl-cell">{s.branch || '—'}</td>
                  <td className="tbl-cell">{s.dept    || '—'}</td>
                  <td className="tbl-cell">{s.cluster || '—'}</td>
                  <td className="tbl-cell">{s.crtSec  || '—'}</td>
                  <td className="tbl-cell">{s.crtRoom || '—'}</td>
                  <td className="tbl-cell"><span className="badge-purple">{s.rollNumber}</span></td>
                  <td className="tbl-cell text-center font-semibold text-green-700 dark:text-green-400">
                    {s.stats?.present ?? 0}
                  </td>
                  <td className="tbl-cell text-center">{s.stats?.total ?? 0}</td>
                  <td className="tbl-cell"><PctBar pct={s.stats?.overallPct ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5
                          border-t border-slate-200 dark:border-slate-700">
            <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
            <button className="btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
