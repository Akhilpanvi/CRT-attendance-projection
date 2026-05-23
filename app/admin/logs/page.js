'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast, Toast } from '@/components/Toast';

const ACTION_LABELS = {
  LOGIN:               { label: 'Login',             color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  UPLOAD_CSV:          { label: 'Upload CSV',         color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  MARK_SP:             { label: 'Mark SP',            color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  CREATE_PROFILE:      { label: 'Create Profile',     color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  RESET_PASSWORD:      { label: 'Reset Password',     color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  DELETE_ADMIN:        { label: 'Delete Admin',       color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  UPDATE_PERMISSIONS:  { label: 'Update Permissions', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
  UPDATE_EMAIL:        { label: 'Update Email',       color: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

const PAGE_SIZES = [25, 50, 100];

export default function LogsPage() {
  const { toast, show } = useToast();

  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [admins,     setAdmins]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  // Filters
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(50);
  const [filterAdmin,  setFilterAdmin]  = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');

  const buildParams = useCallback((overrides = {}) => {
    const p = {
      page: String(overrides.page ?? page),
      limit: String(overrides.pageSize ?? pageSize),
    };
    const fa = overrides.filterAdmin  ?? filterAdmin;
    const fac = overrides.filterAction ?? filterAction;
    const ff = overrides.filterFrom   ?? filterFrom;
    const ft = overrides.filterTo     ?? filterTo;
    if (fa)  p.admin  = fa;
    if (fac) p.action = fac;
    if (ff)  p.from   = ff;
    if (ft)  p.to     = ft;
    return new URLSearchParams(p).toString();
  }, [page, pageSize, filterAdmin, filterAction, filterFrom, filterTo]);

  const load = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/logs?${buildParams(overrides)}`);
      if (!r.ok) throw new Error((await r.json()).error);
      const d = await r.json();
      setLogs(d.logs);
      setTotal(d.total);
      setAdmins(d.admins || []);
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }, [buildParams, show]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  function applyFilters() {
    setPage(1);
    load({ page: 1 });
  }

  function clearFilters() {
    setFilterAdmin(''); setFilterAction(''); setFilterFrom(''); setFilterTo('');
    setPage(1);
    load({ page: 1, filterAdmin: '', filterAction: '', filterFrom: '', filterTo: '' });
  }

  function changePage(p) {
    setPage(p);
    load({ page: p });
  }

  function changePageSize(s) {
    setPageSize(s);
    setPage(1);
    load({ page: 1, pageSize: s });
  }

  async function downloadExcel() {
    setExporting(true);
    try {
      // Fetch all logs matching current filters (up to 5000)
      const r = await fetch(`/api/admin/logs?${buildParams({ page: 1, pageSize: 5000 })}`);
      if (!r.ok) throw new Error((await r.json()).error);
      const { logs: allLogs } = await r.json();

      const XLSX = await import('xlsx');
      const wb   = XLSX.utils.book_new();

      const rows = allLogs.map((l, i) => ({
        '#':        i + 1,
        'Timestamp': fmt(l.createdAt),
        'Admin':    l.admin,
        'Action':   ACTION_LABELS[l.action]?.label || l.action,
        'Target':   l.target || '',
        'Detail':   l.detail || '',
      }));

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Admin Logs');
      XLSX.writeFile(wb, `admin_logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
      show('Downloaded');
    } catch (e) { show(e.message, 'error'); }
    finally { setExporting(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Admin Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Audit trail of all admin actions with timestamps
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <p className="card-title mb-3">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {admins.length > 1 && (
            <div>
              <label className="form-label">Admin</label>
              <select className="form-input" value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)}>
                <option value="">All admins</option>
                {admins.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Action</label>
            <select className="form-input" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">From date</label>
            <input type="date" className="form-input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To date</label>
            <input type="date" className="form-input" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={applyFilters} className="btn-primary py-1.5 px-4 text-xs">Apply</button>
          <button onClick={clearFilters}
                  className="px-4 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600
                             text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <p className="card-title mb-0">{loading ? '…' : total} log{total !== 1 ? 's' : ''}</p>
            <button onClick={() => load()}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={e => changePageSize(Number(e.target.value))}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1
                         bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <button
              onClick={downloadExcel}
              disabled={exporting || total === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded
                         bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? 'Exporting…' : 'Download Excel'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">No logs found</div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden sm:grid text-[10px] font-semibold uppercase tracking-wider text-slate-400
                            px-3 pb-1.5 border-b border-slate-100 dark:border-slate-700"
                 style={{ gridTemplateColumns: '160px 80px 130px 1fr' }}>
              <span>Timestamp</span>
              <span>Admin</span>
              <span>Action</span>
              <span>Detail</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {logs.map(log => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-500' };
                return (
                  <div key={log._id}
                       className="sm:grid items-start gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                       style={{ gridTemplateColumns: '160px 80px 130px 1fr' }}>
                    {/* Timestamp */}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                      {fmt(log.createdAt)}
                    </span>
                    {/* Admin */}
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {log.admin}
                    </span>
                    {/* Action badge */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${meta.color}`}>
                      {meta.label}
                    </span>
                    {/* Detail */}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {log.detail || log.target || '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => changePage(page - 1)}
                    disabled={page <= 1}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-600
                               text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
                               disabled:opacity-40 transition-colors">
                    ← Prev
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors
                          ${p === page
                            ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-900 font-semibold'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => changePage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-600
                               text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
                               disabled:opacity-40 transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
