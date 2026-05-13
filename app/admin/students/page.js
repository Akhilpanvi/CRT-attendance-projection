'use client';
import { useState, useEffect, useMemo } from 'react';
import { fmtDate, pctColor } from '@/lib/helpers';
import { useToast, Toast } from '@/components/Toast';

const PAGE_SIZE = 50;

function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold min-w-[36px] text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function Modal({ roll, name, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState('');

  useEffect(() => {
    fetch(`/api/students/${roll}`)
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d); })
      .catch(e => setErr(e.message));
  }, [roll]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm">{name} — Attendance Detail</h3>
          <button onClick={onClose}
                  className="text-gray-400 hover:text-gray-700 text-lg leading-none font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100">
            &#10005;
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {err   && <div className="alert-danger">{err}</div>}
          {!data && !err && <p className="text-gray-400 text-sm">Loading…</p>}
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
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded p-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm"
             style={{ background: '#5b21b6' }}>
          {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900">{s.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {[s.branch, s.dept, `Cluster ${s.cluster}`, s.crtSec, `Room ${s.crtRoom}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span className="badge-purple shrink-0">{s.rollNumber}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          ['Total',   stats.total,   'text-purple-700'],
          ['Present', stats.present, 'text-green-700'],
          ['Absent',  stats.absent,  'text-red-700'],
          ['%',       pct + '%',     null],
        ].map(([l, v, c]) => (
          <div key={l} className="border border-gray-200 rounded p-2.5 text-center">
            <div className={`text-xl font-bold ${c || ''}`}
                 style={!c ? { color: pctColor(pct) } : undefined}>{v}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {dates.length === 0
        ? <p className="text-gray-400 text-sm">No attendance records yet.</p>
        : (
          <div className="overflow-x-auto rounded border border-gray-200">
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
      {modal && <Modal roll={modal.roll} name={modal.name} onClose={() => setModal(null)} />}

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">All Students</h1>
          <p className="text-xs text-gray-400 mt-0.5">Click any row to view full attendance</p>
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
            onClick={() => {
              setLoading(true);
              fetch('/api/admin/students').then(r => r.json()).then(d => { setAll(d); setLoading(false); });
            }}>
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-400">
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
              <tr className="bg-gray-50 border-b border-gray-200">
                <th />
                {[['name','Name'],['branch','Branch'],['dept','Dept'],['cluster','Cluster'],['crtSec','Sec'],['crtRoom','Room'],['roll','Reg. No']].map(([k, ph]) => (
                  <th key={k} className="px-2 py-1">
                    <input
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-400"
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
                <tr><td colSpan={11} className="text-center text-gray-400 py-10 text-sm">Loading students…</td></tr>
              )}
              {!loading && paged.length === 0 && (
                <tr><td colSpan={11} className="text-center text-gray-400 py-10 text-sm">No students found.</td></tr>
              )}
              {paged.map((s, i) => (
                <tr key={s.rollNumber} className="tbl-row cursor-pointer"
                    onClick={() => setModal({ roll: s.rollNumber, name: s.name })}>
                  <td className="tbl-cell text-center text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="tbl-cell font-medium text-gray-900">{s.name}</td>
                  <td className="tbl-cell">{s.branch || '—'}</td>
                  <td className="tbl-cell">{s.dept    || '—'}</td>
                  <td className="tbl-cell">{s.cluster || '—'}</td>
                  <td className="tbl-cell">{s.crtSec  || '—'}</td>
                  <td className="tbl-cell">{s.crtRoom || '—'}</td>
                  <td className="tbl-cell"><span className="badge-purple">{s.rollNumber}</span></td>
                  <td className="tbl-cell text-center font-semibold text-green-700">{s.stats?.present ?? 0}</td>
                  <td className="tbl-cell text-center">{s.stats?.total ?? 0}</td>
                  <td className="tbl-cell"><PctBar pct={s.stats?.overallPct ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200">
            <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <button className="btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
