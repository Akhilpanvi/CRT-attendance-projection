'use client';
import { useState, useEffect, useMemo } from 'react';
import { fmtDate, pctColor } from '@/lib/helpers';
import { useToast, Toast } from '@/components/Toast';

async function downloadAttendanceReport(students) {
  const [XLSX, prog] = await Promise.all([
    import('xlsx'),
    fetch('/api/admin/progression').then(r => r.json()).catch(() => ({ weeks: [], byStudent: {} })),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Overall attendance summary
  const rows = students.map((s, i) => {
    const sp = s.stats?.sp ?? 0;
    return {
      '#':                        i + 1,
      'Name':                     s.name,
      'Reg. No.':                 s.rollNumber,
      'Branch':                   s.branch  || '',
      'Department':               s.dept    || '',
      'Cluster':                  s.cluster || '',
      'CRT Section':              s.crtSec  || '',
      'CRT Room':                 s.crtRoom || '',
      'Present (incl. SP)':       s.stats?.present ?? 0,
      'SP (Special Permission)':  sp,
      'Absent':                   s.stats?.absent  ?? 0,
      'Total':                    s.stats?.total   ?? 0,
      'Attendance %':             s.stats?.overallPct ?? 0,
      'Notes':                    sp > 0 ? `${sp} slot${sp > 1 ? 's' : ''} manually marked SP` : '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Attendance Report');

  // Sheet 2: SP edited students
  const spStudents = students.filter(s => (s.stats?.sp ?? 0) > 0);
  if (spStudents.length > 0) {
    const spRows = spStudents.map((s, i) => ({
      '#':                       i + 1,
      'Name':                    s.name,
      'Reg. No.':                s.rollNumber,
      'SP Slots':                s.stats?.sp ?? 0,
      'Present (incl. SP)':      s.stats?.present ?? 0,
      'Total':                   s.stats?.total   ?? 0,
      'Attendance %':            s.stats?.overallPct ?? 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(spRows), 'SP Edited Students');
  }

  // Sheet 3: Weekly progression — one row per student, one column per week
  const { weeks = [], byStudent = {} } = prog;
  if (weeks.length > 0) {
    const progRows = students.map((s, i) => {
      const row = { '#': i + 1, 'Name': s.name, 'Reg. No.': s.rollNumber };
      const sw = byStudent[s.rollNumber] || {};
      for (const wk of weeks) {
        const d = sw[wk];
        row[wk] = d ? `${Math.round((d.present / d.total) * 100)}%` : '—';
      }
      row['Overall %'] = `${s.stats?.overallPct ?? 0}%`;
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(progRows), 'Weekly Progression');
  }

  XLSX.writeFile(wb, `attendance_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  function load() {
    fetch(`/api/students/${roll}`)
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(e => setErr(e.message));
  }

  useEffect(() => { load(); }, [roll]);

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
          {data  && <DetailView data={data} roll={roll} showToast={showToast} refetch={load} />}
        </div>
      </div>
    </div>
  );
}

const SP_CLS = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';

function SpBadge() {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${SP_CLS}`}>SP</span>;
}

function DetailView({ data, roll, showToast, refetch }) {
  const { student: s, stats } = data;
  const byDate = stats.byDate || {};
  const dates  = Object.keys(byDate).sort().reverse();

  const total = stats.total;
  const pres  = stats.present;
  const pct   = stats.overallPct;

  // editing: { date, slot, pending: 'present'|'absent'|'sp'|null }
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  function openEdit(date, slot) {
    setEditing(prev =>
      prev?.date === date && prev?.slot === slot ? null : { date, slot, pending: null }
    );
  }

  async function saveEdit() {
    if (!editing?.pending) return;
    setSaving(true);
    try {
      const r = await fetch('/api/admin/mark-sp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: roll, date: editing.date, slot: editing.slot, status: editing.pending }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast(`Saved — ${editing.slot} on ${fmtDate(editing.date)} → ${editing.pending.toUpperCase()}`);
      setEditing(null);
      refetch();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  }

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
          ['Total',   total,        'text-slate-800 dark:text-slate-200'],
          ['Present', pres,         'text-green-700 dark:text-green-400'],
          ['Absent',  total - pres, 'text-red-700 dark:text-red-400'],
          ['%',       pct + '%',    null],
        ].map(([l, v, c]) => (
          <div key={l} className="border border-slate-200 dark:border-slate-600
                                   bg-slate-50 dark:bg-slate-700/40 rounded p-2.5 text-center">
            <div className={`text-xl font-bold ${c || ''}`}
                 style={!c ? { color: pctColor(pct) } : undefined}>{v}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">
        Click any slot badge to edit · <span className={`font-semibold ${SP_CLS} px-1 rounded`}>SP</span> = Special Permission (placement drive, counts as present)
      </p>

      {dates.length === 0
        ? <p className="text-slate-400 text-sm">No attendance records yet.</p>
        : (
          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="tbl-header">Date</th>
                  {stats.slots.map(sl => <th key={sl} className="tbl-header">{sl}</th>)}
                  <th className="tbl-header text-center">P/T</th>
                </tr>
              </thead>
              <tbody>
                {dates.map(dt => {
                  const p = stats.slots.filter(sl => byDate[dt]?.[sl] === 'present' || byDate[dt]?.[sl] === 'sp').length;
                  const t = stats.slots.filter(sl => !!byDate[dt]?.[sl]).length;
                  return (
                    <tr key={dt} className="tbl-row">
                      <td className="tbl-cell font-semibold whitespace-nowrap">{fmtDate(dt)}</td>
                      {stats.slots.map(sl => {
                        const v = byDate[dt]?.[sl];
                        const isOpen = editing?.date === dt && editing?.slot === sl;
                        return (
                          <td key={sl} className="tbl-cell text-center relative">
                            {isOpen && (
                              <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1
                                              bg-white dark:bg-slate-800 border border-slate-200
                                              dark:border-slate-600 rounded-lg shadow-xl p-2 min-w-[130px]">
                                <p className="text-[9px] text-slate-400 mb-1.5 text-center">Select then Save</p>
                                <div className="flex gap-1 justify-center mb-2">
                                  {[['P','present','bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-300 dark:border-green-700'],
                                    ['A','absent','bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-300 dark:border-red-700'],
                                    ['SP','sp',SP_CLS + ' border-yellow-300 dark:border-yellow-700']].map(([lbl, val, cls]) => {
                                    const selected = editing.pending === val;
                                    return (
                                      <button key={val}
                                        onClick={() => setEditing(e => ({ ...e, pending: val }))}
                                        className={`text-[10px] font-bold px-2 py-1 rounded border-2 transition-all
                                          ${cls} ${selected ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'}`}>
                                        {lbl}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    disabled={!editing.pending || saving}
                                    onClick={saveEdit}
                                    className="flex-1 text-[10px] font-semibold py-1 rounded
                                               bg-slate-800 dark:bg-slate-600 text-white
                                               disabled:opacity-40 hover:bg-slate-700 transition-colors">
                                    {saving ? '…' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditing(null)}
                                    className="text-[10px] px-2 py-1 rounded border border-slate-200
                                               dark:border-slate-600 text-slate-400 hover:text-slate-600">
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}
                            <button onClick={() => openEdit(dt, sl)}
                              className="cursor-pointer hover:opacity-70 transition-opacity">
                              {v === 'present' ? <span className="badge-present">P</span>
                               : v === 'absent'  ? <span className="badge-absent">A</span>
                               : v === 'sp'      ? <SpBadge />
                               : <span className="badge-dash">—</span>}
                            </button>
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
