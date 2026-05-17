'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { fmtDate } from '@/lib/helpers';

function today() { return new Date().toISOString().split('T')[0]; }

// ── History table ─────────────────────────────────────────────────────────────
function UploadHistory({ refreshKey, onChanged, showToast }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editDate, setEditDate] = useState(null);   // { original, value }
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);   // date string being deleted

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/upload-history')
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { showToast(e.message, 'error'); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [refreshKey]);

  async function saveEdit() {
    if (!editDate || editDate.value === editDate.original) { setEditDate(null); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/upload-history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate: editDate.original, toDate: editDate.value }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast(`Date changed to ${fmtDate(editDate.value)} · ${d.updated} records updated`);
      setEditDate(null);
      load();
      onChanged();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function deleteDate(date) {
    if (!confirm(`Delete ALL attendance records for ${fmtDate(date)}? This cannot be undone.`)) return;
    setDeleting(date);
    try {
      const r = await fetch('/api/admin/upload-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast(`Deleted ${d.deleted} records for ${fmtDate(date)}`);
      load();
      onChanged();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setDeleting(null); }
  }

  if (loading) return (
    <div className="card">
      <p className="card-title">Uploaded Dates</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">Loading…</p>
    </div>
  );

  if (rows.length === 0) return (
    <div className="card">
      <p className="card-title">Uploaded Dates</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No uploads yet.</p>
    </div>
  );

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Uploaded Dates</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{rows.length} date{rows.length !== 1 ? 's' : ''} on record</p>
        </div>
        <button onClick={load} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Date', 'Students', 'Slots', 'Present', 'Records', 'Actions'].map(h => (
                <th key={h} className="tbl-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isEditing  = editDate?.original === row.date;
              const isDeleting = deleting === row.date;
              const absentCount = row.records - row.present;
              return (
                <tr key={row.date} className="tbl-row">
                  {/* Date cell — shows input when editing */}
                  <td className="tbl-cell font-medium">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          className="form-input text-xs py-1 w-36"
                          value={editDate.value}
                          onChange={e => setEditDate(ed => ({ ...ed, value: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditDate(null); }}
                          autoFocus
                        />
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="text-xs font-medium text-green-700 dark:text-green-400
                                     hover:text-green-900 dark:hover:text-green-200 transition-colors">
                          {saving ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditDate(null)}
                          className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">{fmtDate(row.date)}</span>
                    )}
                  </td>
                  <td className="tbl-cell text-center">{row.students}</td>
                  <td className="tbl-cell text-center">{row.slots}</td>
                  <td className="tbl-cell text-center">
                    <span className="text-green-700 dark:text-green-400 font-semibold">{row.present}</span>
                    <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                    <span className="text-red-600 dark:text-red-400">{absentCount}</span>
                  </td>
                  <td className="tbl-cell text-center text-slate-500 dark:text-slate-400">{row.records}</td>
                  <td className="tbl-cell">
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => setEditDate({ original: row.date, value: row.date })}
                          className="text-xs text-slate-500 dark:text-slate-400
                                     hover:text-slate-900 dark:hover:text-slate-100
                                     border border-slate-200 dark:border-slate-600
                                     hover:border-slate-400 dark:hover:border-slate-400
                                     rounded px-2 py-0.5 transition-colors">
                          Edit date
                        </button>
                      )}
                      <button
                        onClick={() => deleteDate(row.date)}
                        disabled={isDeleting}
                        className="text-xs text-red-500 dark:text-red-400
                                   hover:text-red-700 dark:hover:text-red-300
                                   border border-red-200 dark:border-red-800
                                   hover:border-red-400 dark:hover:border-red-600
                                   rounded px-2 py-0.5 transition-colors disabled:opacity-40">
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { toast, show } = useToast();
  const [date, setDate]       = useState(today);
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [drag, setDrag]       = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const inputRef = useRef();

  function refreshHistory() { setHistoryKey(k => k + 1); }

  function downloadSample() {
    const hdr  = 'S.NO,NAME,BRANCH,DEPT,CLUSTER,CRT SEC,CRT ROOM,REGD.NO,09:20-10:10,10:10-11:00,11:10-12:00,12:00-12:50,01:50-02:40,02:40-03:40,03:50-04:30,04:30-5:30';
    const rows = [
      '1,VINAY KUMAR,ECE,ECE,C2,IS205,C008,2300040011,P,P,P,P,P,P,P,P',
      '2,TIPALLIVI SWAMY,ECE,ECE,C2,IS205,C008,2300040031,P,P,P,P,P,P,A,A',
      '3,HARSHA VARDHAN,ECE,ECE,C2,IS205,C008,2300040041,P,P,A,A,P,P,P,P',
    ];
    const blob = new Blob([[hdr, ...rows].join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'sample_crt_attendance.csv' });
    a.click(); URL.revokeObjectURL(a.href);
    show('Sample CSV downloaded', 'info');
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) setFile(f);
    else show('Please drop a .csv file', 'error');
  }

  async function upload() {
    if (!file) { show('Select a CSV file', 'error'); return; }
    if (!date) { show('Select attendance date', 'error'); return; }
    setLoading(true); setResult(null);
    try {
      const form = new FormData();
      form.append('csv', file);
      form.append('date', date);
      const r = await fetch('/api/admin/upload-csv', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
      setFile(null);
      show(`Imported ${d.total} students · ${d.attendanceCount} records`);
      refreshHistory();
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Attendance CSV</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Import the daily CRT attendance report</p>
      </div>

      <div className="card">
        <p className="card-title">CSV Format</p>
        <div className="alert-info mb-0">
          <span className="shrink-0 font-bold text-blue-600 dark:text-blue-400">i</span>
          <div className="text-xs leading-relaxed">
            Required columns: <strong>S.NO · NAME · BRANCH · DEPT · CLUSTER · CRT SEC · CRT ROOM · REGD.NO</strong>
            {' '}followed by 8 time-slot columns with <strong>P</strong> or <strong>A</strong>.
            <br />
            Slots: 09:20-10:10 · 10:10-11:00 · 11:10-12:00 · 12:00-12:50 · 01:50-02:40 · 02:40-03:40 · 03:50-04:30 · 04:30-05:30
          </div>
        </div>
      </div>

      <div className="card">
        <p className="card-title">Step 1 — Attendance Date</p>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="form-input max-w-[200px] font-medium"
          />
          {date && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Recording for: <strong className="text-slate-900 dark:text-slate-100">{fmtDate(date)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Step 2 — Upload File</p>
        <div
          className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors
            ${drag
              ? 'border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-700'
              : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 hover:border-slate-400 dark:hover:border-slate-500'}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}>
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg
                          bg-slate-200 dark:bg-slate-700 mb-3">
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
            {file ? file.name : 'Click to browse or drag and drop'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {file && date ? `Will import for ${fmtDate(date)}` : 'CSV files only'}
          </p>
        </div>
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
               onChange={e => { setFile(e.target.files[0]); e.target.value = ''; }} />

        <div className="flex gap-3 mt-4">
          <button className="btn-primary flex-1 justify-center py-2.5"
                  onClick={upload} disabled={loading || !file}>
            {loading ? 'Importing…' : 'Upload and Import'}
          </button>
          <button className="btn-outline" onClick={downloadSample}>Download Sample</button>
        </div>
      </div>

      {result && (
        <div className="card">
          <p className="card-title">Import Complete</p>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50
                          border border-slate-200 dark:border-slate-600 rounded p-3 mb-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Attendance Date
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmtDate(result.date)}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'New Students',  val: result.created,         cls: 'text-green-700 dark:text-green-400' },
              { label: 'Updated',       val: result.updated,         cls: 'text-slate-800 dark:text-slate-200' },
              { label: 'Att. Records',  val: result.attendanceCount, cls: 'text-slate-800 dark:text-slate-200' },
              { label: 'Total Rows',    val: result.total,           cls: 'text-slate-800 dark:text-slate-200' },
            ].map(s => (
              <div key={s.label}
                   className="border border-slate-200 dark:border-slate-600 rounded p-3 text-center
                              bg-slate-50 dark:bg-slate-700/40">
                <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {result.slotCols?.length > 0 && (
            <div className="alert-info text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">i</span>
              <span>Slots imported: <strong>{result.slotCols.join(' · ')}</strong></span>
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Student accounts were auto-created. Default username and password = Registration No.
          </p>
        </div>
      )}

      {/* History */}
      <UploadHistory
        refreshKey={historyKey}
        onChanged={refreshHistory}
        showToast={show}
      />
    </div>
  );
}
