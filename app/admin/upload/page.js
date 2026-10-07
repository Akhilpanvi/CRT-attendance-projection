'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { fmtDate, TIME_SLOTS } from '@/lib/helpers';
import { CLUSTERS, clusterDaysLabel, clusterForDate, dayName, isWorkingDate } from '@/lib/attendanceCalc';

const ACCEPT = '.csv,.xlsx,.xls,.xlsm';
const fmtN = n => (n ?? 0).toLocaleString('en-IN');

// ── History table ─────────────────────────────────────────────────────────────
function UploadHistory({ refreshKey, onChanged, showToast }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editDate, setEditDate] = useState(null);   // { key, original, cluster, value }
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);   // row key being deleted

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
        body: JSON.stringify({ fromDate: editDate.original, toDate: editDate.value, cluster: editDate.cluster }),
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

  async function deleteRow(row) {
    const what = `${row.cluster ? `${row.cluster} ` : ''}attendance for ${fmtDate(row.date)}`;
    if (!confirm(`Delete ALL ${what}? This cannot be undone.`)) return;
    const key = `${row.date}|${row.cluster}`;
    setDeleting(key);
    try {
      const r = await fetch('/api/admin/upload-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: row.date, cluster: row.cluster }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast(`Deleted ${d.deleted} records — ${what}`);
      load();
      onChanged();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setDeleting(null); }
  }

  if (loading || rows.length === 0) return (
    <div className="card">
      <p className="card-title">Uploaded Dates</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">{loading ? 'Loading…' : 'No uploads yet.'}</p>
    </div>
  );

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Uploaded Dates</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{rows.length} upload{rows.length !== 1 ? 's' : ''} on record</p>
        </div>
        <button onClick={load} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Date', 'Cluster', 'Students', 'Slots', 'Avg Present', 'Actions'].map(h => (
                <th key={h} className="tbl-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const key        = `${row.date}|${row.cluster}`;
              const isEditing  = editDate?.key === key;
              const isDeleting = deleting === key;
              const offDay     = row.cluster && clusterForDate(row.date) !== row.cluster;
              return (
                <tr key={key} className="tbl-row">
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
                        <button onClick={saveEdit} disabled={saving}
                          className="text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 transition-colors">
                          {saving ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setEditDate(null)}
                          className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-900 dark:text-slate-100">{fmtDate(row.date)}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5">{row.day}</span>
                        {row.fileName && <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[220px]" title={row.fileName}>{row.fileName}</div>}
                      </div>
                    )}
                  </td>
                  <td className="tbl-cell text-center">
                    <span className="chip">{row.cluster || '—'}</span>
                    {offDay && <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">off-day</div>}
                  </td>
                  <td className="tbl-cell text-center">{fmtN(row.students)}</td>
                  <td className="tbl-cell text-center">{row.slots}</td>
                  <td className="tbl-cell text-center">
                    <span className="text-green-700 dark:text-green-400 font-semibold">
                      {row.slots > 0 ? fmtN(Math.round(row.present / row.slots)) : 0}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                    <span className="text-slate-600 dark:text-slate-400">{fmtN(row.students)}</span>
                  </td>
                  <td className="tbl-cell">
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => setEditDate({ key, original: row.date, cluster: row.cluster, value: row.date })}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100
                                     border border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400
                                     rounded px-2 py-0.5 transition-colors">
                          Edit date
                        </button>
                      )}
                      <button onClick={() => deleteRow(row)} disabled={isDeleting}
                        className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                                   border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600
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

// ── Training calendar: uploaded / holiday / not-uploaded days ─────────────────
const STATUS_STYLE = {
  uploaded: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  holiday:  'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600',
  pending:  'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
};
const STATUS_LABEL = { uploaded: 'Uploaded', holiday: 'Holiday', pending: 'Not uploaded' };

function TrainingCalendar({ refreshKey, onChanged, showToast }) {
  const [data, setData]       = useState(null);
  const [view, setView]       = useState('pending');
  const [busy, setBusy]       = useState(null);           // row key
  const [marking, setMarking] = useState(null);           // { key, reason }
  const [form, setForm]       = useState({ date: '', cluster: 'ALL', reason: '' });

  const load = useCallback(() => {
    fetch('/api/admin/calendar')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => showToast(e.message, 'error'));
  }, []);
  useEffect(() => { load(); }, [refreshKey]);

  async function send(method, body, key, okMsg) {
    setBusy(key);
    try {
      const r = await fetch('/api/admin/calendar', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showToast(okMsg);
      setMarking(null);
      load();
      onChanged?.();
      return true;
    } catch (e) { showToast(e.message, 'error'); return false; }
    finally { setBusy(null); }
  }

  async function addHoliday(e) {
    e.preventDefault();
    if (!form.date) { showToast('Pick a date', 'error'); return; }
    const target = form.cluster === 'ALL' ? (clusterForDate(form.date) || 'both clusters') : form.cluster;
    const ok = await send('POST', form, 'form', `${dayName(form.date)} ${fmtDate(form.date)} marked as holiday (${target})`);
    if (ok) setForm(f => ({ ...f, date: '', reason: '' }));
  }

  if (!data) return (
    <div className="card"><p className="card-title">Training Calendar</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">Loading…</p></div>
  );

  const rows = data.days.filter(d =>
    view === 'all' ? true : view === 'holiday' ? d.status === 'holiday' : d.status === 'pending');

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Training Calendar</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Every scheduled CRT day since training start. Not-uploaded days and holidays are not counted in anyone’s %.
            </p>
          </div>
          <div className="flex gap-1.5">
            {[['pending', `Not uploaded · ${data.summary.pending}`], ['holiday', `Holidays · ${data.summary.holiday}`], ['all', 'All days']].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors
                  ${view === k
                    ? 'border-slate-800 dark:border-slate-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={addHoliday} className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="form-label">Add holiday</label>
            <input type="date" className="form-input text-xs py-1.5 w-36" value={form.date}
                   onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <select className="form-input text-xs py-1.5 w-40" value={form.cluster}
                  onChange={e => setForm(f => ({ ...f, cluster: e.target.value }))}>
            <option value="ALL">{form.date && clusterForDate(form.date) ? `Auto — ${clusterForDate(form.date)} (${dayName(form.date)})` : 'Both clusters'}</option>
            {CLUSTERS.map(c => <option key={c} value={c}>{c} ({clusterDaysLabel(c)})</option>)}
          </select>
          <input className="form-input text-xs py-1.5 flex-1 min-w-[160px]" placeholder="Reason (optional) — e.g. Dussehra"
                 value={form.reason} maxLength={120} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <button className="btn-outline btn-sm" disabled={busy === 'form'}>{busy === 'form' ? 'Saving…' : 'Mark holiday'}</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
          {view === 'pending' ? 'Every scheduled day is uploaded or marked as a holiday. 🎉' : view === 'holiday' ? 'No holidays marked.' : 'No scheduled days yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr>{['Date', 'Cluster', 'Status', ''].map(h => <th key={h} className="tbl-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(d => {
                const key = `${d.date}|${d.cluster}`;
                const isMarking = marking?.key === key;
                return (
                  <tr key={key} className="tbl-row">
                    <td className="tbl-cell">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{fmtDate(d.date)}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-1.5">{d.day}</span>
                      {d.today && <span className="text-[10px] text-slate-400 ml-1.5">today</span>}
                    </td>
                    <td className="tbl-cell"><span className="chip">{d.cluster}</span></td>
                    <td className="tbl-cell">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${STATUS_STYLE[d.status]}`}>
                        {d.future && d.status === 'holiday' ? 'Upcoming holiday' : STATUS_LABEL[d.status]}
                      </span>
                      {d.status === 'uploaded' && <span className="text-xs text-slate-400 ml-2">{d.slots} slots{d.makeup ? ' · make-up' : ''}</span>}
                      {d.reason && <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{d.reason}</span>}
                    </td>
                    <td className="tbl-cell text-right whitespace-nowrap">
                      {d.status === 'pending' && (isMarking ? (
                        <span className="inline-flex items-center gap-1.5">
                          <input autoFocus className="form-input text-xs py-1 w-40" placeholder="Reason (optional)"
                                 value={marking.reason} maxLength={120}
                                 onChange={e => setMarking(m => ({ ...m, reason: e.target.value }))}
                                 onKeyDown={e => { if (e.key === 'Enter') send('POST', { date: d.date, cluster: d.cluster, reason: marking.reason }, key, `${fmtDate(d.date)} ${d.cluster} marked as holiday`); if (e.key === 'Escape') setMarking(null); }} />
                          <button className="text-xs font-medium text-green-700 dark:text-green-400" disabled={busy === key}
                                  onClick={() => send('POST', { date: d.date, cluster: d.cluster, reason: marking.reason }, key, `${fmtDate(d.date)} ${d.cluster} marked as holiday`)}>
                            {busy === key ? '…' : 'Save'}
                          </button>
                          <button className="text-xs text-slate-400" onClick={() => setMarking(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setMarking({ key, reason: '' })}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 transition-colors">
                          Mark holiday
                        </button>
                      ))}
                      {d.status === 'holiday' && (
                        <button disabled={busy === key}
                          onClick={() => send('DELETE', { date: d.date, cluster: d.cluster }, key, `Holiday removed for ${fmtDate(d.date)} ${d.cluster}`)}
                          className="text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 rounded px-2 py-0.5 transition-colors disabled:opacity-40">
                          {busy === key ? '…' : 'Undo'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Template download (matches the official Y-24 report layout) ─────────────────
async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const slots = TIME_SLOTS;
  const aoa = [
    ['Y-24 CRT TRAINING ATTENDANCE.', '', '', '', '', '', '', '', ''],
    ['2024-2028 BATCH Y24 ATTENDANCE REPORT', '', '', '', '', '', '', '', '', '23.09.2026'],
    ['S.NO', 'NAME', 'BRANCH', 'DEPT', 'CLUSTER', 'CRT SEC', 'CRT ROOM', 'STATUS', 'REGD.NO', ...slots, 'Total Conducted', 'Total Attended', 'Att (%)'],
    [1, 'STUDENT ONE',   'CSE', 'CSE1', 'C2', 'RS21', 'C121', '', '2400030017', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 8, 8, 100],
    [2, 'STUDENT TWO',   'CSE', 'CSE2', 'C2', 'RS21', 'C121', '', '2400030216', 'P', 'P', 'A', 'A', 'A', 'A', 'A', 'A', 8, 2, 25],
    [3, 'STUDENT THREE', 'ECE', 'ECE',  'C2', 'RS22', 'C122', '', '2400040011', 'A', 'A', 'P', 'P', 'P', 'P', 'P', 'P', 8, 6, 75],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{ s: { r: 1, c: 9 }, e: { r: 1, c: 9 + slots.length - 1 } }];
  ws['!cols'] = [{ wch: 5 }, { wch: 22 }, ...Array(7).fill({ wch: 9 }), ...slots.map(() => ({ wch: 11 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, 'Y24_CRT_attendance_template.xlsx');
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { toast, show } = useToast();
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [parsing, setParsing]   = useState(false);
  const [sheet, setSheet]       = useState('');
  const [date, setDate]         = useState('');
  const [cluster, setCluster]   = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState(null);
  const [drag, setDrag]         = useState(false);
  const [reupload, setReupload] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const inputRef = useRef();

  const refreshHistory = () => setHistoryKey(k => k + 1);
  const current = preview?.sheets.find(s => s.sheet === sheet);

  function selectSheet(s) {
    setSheet(s.sheet);
    setDate(s.date || '');
    setCluster(s.suggestedCluster || '');
  }

  async function pickFile(f) {
    if (!f) return;
    if (!/\.(csv|xlsx|xls|xlsm)$/i.test(f.name)) { show('Please choose a .csv, .xlsx or .xls file', 'error'); return; }
    setFile(f); setPreview(null); setResult(null); setParsing(true);
    try {
      const form = new FormData();
      form.append('file', f);
      form.append('mode', 'preview');
      const r = await fetch('/api/admin/upload-csv', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPreview(d);
      selectSheet(d.sheets.find(s => s.sheet === d.defaultSheet) || d.sheets[0]);
    } catch (e) { show(e.message, 'error'); setFile(null); }
    finally { setParsing(false); }
  }

  function reset() { setFile(null); setPreview(null); setSheet(''); setDate(''); setCluster(''); }

  async function doImport() {
    if (!file || !current) return;
    setImporting(true); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', 'import');
      form.append('sheet', current.sheet);
      form.append('date', date);
      form.append('cluster', cluster);
      form.append('reupload', reupload ? 'true' : 'false');
      const r = await fetch('/api/admin/upload-csv', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
      reset();
      show(`Imported ${fmtN(d.total)} ${d.clusters.join(' + ')} students · ${fmtN(d.attendanceCount)} records`);
      refreshHistory();
    } catch (e) { show(e.message, 'error'); }
    finally { setImporting(false); }
  }

  // ── Derived checks for the confirm step ──
  const dayCluster   = date ? clusterForDate(date) : '';
  const dateInvalid  = date && !isWorkingDate(date);
  const offDay       = date && cluster && cluster !== 'ALL' && dayCluster !== cluster;
  const counts       = current?.clusterCounts || {};
  const otherRows    = cluster && cluster !== 'ALL' ? Object.entries(counts).filter(([c]) => c && c !== cluster).reduce((s, [, n]) => s + n, 0) : 0;
  const noClusterRows = counts[''] || 0;
  const importRows   = !current ? 0
    : cluster === 'ALL' ? current.total - noClusterRows
    : (counts[cluster] || 0) + noClusterRows;
  const already      = preview?.existing.filter(e => e.date === date && (cluster === 'ALL' || e.cluster === cluster)) || [];
  const holidayHit   = preview?.holidays?.filter(h => h.date === date && (cluster === 'ALL' || h.cluster === cluster)) || [];
  const canImport    = current && date && cluster && !dateInvalid && importRows > 0 && !importing;

  return (
    <div className="max-w-3xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Drop the daily CRT report — Excel or CSV. Date, cluster and slots are detected automatically.
        </p>
      </div>

      {/* Step 1 — file */}
      <div className="card">
        <p className="card-title">Step 1 — Choose File</p>
        <div
          className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors
            ${drag
              ? 'border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-700'
              : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 hover:border-slate-400 dark:hover:border-slate-500'}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}>
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 mb-3">
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
            {parsing ? 'Reading file…' : file ? file.name : 'Click to browse or drag and drop'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">.xlsx · .xls · .csv — the official report works as-is</p>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
               onChange={e => { pickFile(e.target.files[0]); e.target.value = ''; }} />

        <details className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200">What files are accepted?</summary>
          <ul className="mt-2 space-y-1 list-disc pl-5 leading-relaxed">
            <li>Needs a header row with <strong>NAME</strong> and <strong>REGD.NO</strong>. Title rows above it are skipped.</li>
            <li>Slot columns are found by their time header (e.g. <strong>09:20-10:10</strong>) with <strong>P</strong> / <strong>A</strong> values.</li>
            <li>BRANCH, DEPT, CLUSTER, CRT SEC, CRT ROOM, S.NO are picked up if present. STATUS and Total / Att % columns are ignored.</li>
            <li>The date is read from the sheet (e.g. <strong>23.09.2026</strong>) or the file name. Workbooks with one sheet per day are supported.</li>
          </ul>
          <button className="btn-outline btn-sm mt-3" onClick={downloadTemplate}>Download Excel template</button>
        </details>
      </div>

      {/* Step 2 — confirm */}
      {current && (
        <div className="card">
          <p className="card-title">Step 2 — Confirm Date &amp; Cluster</p>

          {preview.sheets.length > 1 && (
            <div className="mb-4">
              <label className="form-label">Sheet</label>
              <div className="flex flex-wrap gap-2">
                {preview.sheets.map(s => (
                  <button key={s.sheet} onClick={() => selectSheet(s)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors
                      ${s.sheet === sheet
                        ? 'border-slate-800 dark:border-slate-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>
                    {s.sheet}{s.date ? ` · ${fmtDate(s.date)}` : ''} · {fmtN(s.total)} rows
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Attendance date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input font-medium" />
              <p className="text-xs mt-1.5 text-slate-500 dark:text-slate-400">
                {date
                  ? <>{dayName(date)} {fmtDate(date)}{current.dateSource && current.date === date && <> · detected from {current.dateSource}</>}</>
                  : <span className="text-amber-600 dark:text-amber-400">No date found in the file — please pick one.</span>}
              </p>
            </div>
            <div>
              <label className="form-label">Cluster</label>
              <div className="flex gap-2">
                {[...CLUSTERS, 'ALL'].map(c => (
                  <button key={c} onClick={() => setCluster(c)}
                    className={`flex-1 text-xs px-2 py-2 rounded border transition-colors text-center
                      ${c === cluster
                        ? 'border-slate-800 dark:border-slate-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}>
                    <div className="font-semibold">{c === 'ALL' ? 'Mixed' : c}</div>
                    <div className="text-[10px] opacity-70">{c === 'ALL' ? 'per-row cluster' : clusterDaysLabel(c)}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs mt-1.5 text-slate-500 dark:text-slate-400">
                {date && dayCluster ? <>{dayName(date)} is a <strong>{dayCluster}</strong> day.</> : date ? <>{dayName(date)} is not a regular CRT day for either cluster.</> : null}
              </p>
            </div>
          </div>

          {/* File summary */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Rows in sheet', val: fmtN(current.total) },
              ...CLUSTERS.map(c => ({ label: `${c} rows`, val: fmtN(counts[c] || 0) })),
              { label: 'Will import', val: fmtN(importRows), strong: true },
            ].map(s => (
              <div key={s.label} className="border border-slate-200 dark:border-slate-600 rounded p-3 text-center bg-slate-50 dark:bg-slate-700/40">
                <div className={`text-xl font-bold ${s.strong ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'}`}>{s.val}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {current.slots.map(s => <span key={s} className="chip">{s}</span>)}
          </div>

          {/* Checks */}
          <div className="mt-4 space-y-2">
            {dateInvalid && (
              <div className="alert-danger text-xs"><span className="font-bold shrink-0">!</span>
                <span>{fmtDate(date)} is a Sunday or before training start — it would not count. Pick the correct date.</span></div>
            )}
            {offDay && !dateInvalid && (
              <div className="alert-warn text-xs"><span className="font-bold shrink-0">!</span>
                <span>{dayName(date)} is normally {dayCluster ? <strong>{dayCluster}</strong> : 'not a CRT day'}, but you selected <strong>{cluster}</strong>. Continue only if this is a make-up / rescheduled session.</span></div>
            )}
            {otherRows > 0 && (
              <div className="alert-warn text-xs"><span className="font-bold shrink-0">!</span>
                <span>{fmtN(otherRows)} row(s) belong to another cluster and will be <strong>skipped</strong>. Choose <strong>Mixed</strong> to import every row under its own cluster.</span></div>
            )}
            {cluster === 'ALL' && noClusterRows > 0 && (
              <div className="alert-warn text-xs"><span className="font-bold shrink-0">!</span>
                <span>{fmtN(noClusterRows)} row(s) have no cluster and will be skipped in Mixed mode.</span></div>
            )}
            {holidayHit.length > 0 && (
              <div className="alert-info text-xs"><span className="font-bold shrink-0">i</span>
                <span>{fmtDate(date)} is marked as a holiday for {holidayHit.map(h => h.cluster).join(', ')}. Importing will replace the holiday with this attendance.</span></div>
            )}
            {already.length > 0 && (
              <div className="alert-info text-xs"><span className="font-bold shrink-0">i</span>
                <span>{fmtDate(date)} already has {already.map(e => `${e.cluster || '—'} (${e.slots} slots)`).join(', ')} uploaded. Matching records will be overwritten.</span></div>
            )}
            {current.warnings.map(w => (
              <div key={w} className="alert-info text-xs"><span className="font-bold shrink-0">i</span><span>{w}</span></div>
            ))}
          </div>

          {/* Sample rows */}
          <div className="mt-4 overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
            <table className="w-full text-xs">
              <thead><tr>{['Reg. No.', 'Name', 'Cluster', 'Slots'].map(h => <th key={h} className="tbl-header">{h}</th>)}</tr></thead>
              <tbody>
                {current.sample.map(s => (
                  <tr key={s.rollNumber} className="tbl-row">
                    <td className="tbl-cell"><span className="badge-purple">{s.rollNumber}</span></td>
                    <td className="tbl-cell">{s.name}</td>
                    <td className="tbl-cell text-center">{s.cluster || '—'}</td>
                    <td className="tbl-cell font-mono tracking-widest">{s.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
            <input type="checkbox" checked={reupload} onChange={e => setReupload(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Re-upload mode — skip creating new student logins</span>
          </label>

          <div className="flex gap-3 mt-4">
            <button className="btn-primary flex-1 justify-center py-2.5" onClick={doImport} disabled={!canImport}>
              {importing
                ? 'Importing…'
                : `Import ${fmtN(importRows)} ${cluster === 'ALL' ? '' : `${cluster} `}students${date ? ` for ${dayName(date)} ${fmtDate(date)}` : ''}`}
            </button>
            <button className="btn-outline" onClick={reset} disabled={importing}>Cancel</button>
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <p className="card-title">Import Complete</p>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded p-3 mb-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {result.clusters.join(' + ')} · {dayName(result.date)}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmtDate(result.date)}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Students',       val: result.total,           cls: 'text-slate-800 dark:text-slate-200' },
              { label: 'New Logins',     val: result.loginsCreated,   cls: 'text-green-700 dark:text-green-400' },
              { label: 'Att. Records',   val: result.attendanceCount, cls: 'text-slate-800 dark:text-slate-200' },
              { label: 'Marked Absent',  val: result.absentMarked,    cls: 'text-red-600 dark:text-red-400' },
            ].map(s => (
              <div key={s.label} className="border border-slate-200 dark:border-slate-600 rounded p-3 text-center bg-slate-50 dark:bg-slate-700/40">
                <div className={`text-2xl font-bold ${s.cls}`}>{fmtN(s.val)}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Slots: {result.slotCols.join(' · ')}
            {result.skippedOtherCluster > 0 && <> · {fmtN(result.skippedOtherCluster)} other-cluster rows skipped</>}
            {result.absentMarked > 0 && <> · “Marked Absent” = same-cluster students missing from the sheet</>}
          </p>
          {!result.reupload && result.loginsCreated > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              New student logins: username and password = Registration No. (changed on first login).
            </p>
          )}
        </div>
      )}

      <TrainingCalendar refreshKey={historyKey} onChanged={refreshHistory} showToast={show} />

      <UploadHistory refreshKey={historyKey} onChanged={refreshHistory} showToast={show} />
    </div>
  );
}
