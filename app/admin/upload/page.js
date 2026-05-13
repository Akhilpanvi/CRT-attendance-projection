'use client';
import { useState, useRef } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { fmtDate } from '@/lib/helpers';

function today() { return new Date().toISOString().split('T')[0]; }

export default function UploadPage() {
  const { toast, show } = useToast();
  const [date, setDate]       = useState(today);
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [drag, setDrag]       = useState(false);
  const inputRef = useRef();

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
      show(`Imported ${d.total} students · ${d.attendanceCount} records`);
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">Upload Attendance CSV</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import the daily CRT attendance report</p>
      </div>

      <div className="card">
        <p className="card-title">CSV Format</p>
        <div className="alert-info mb-4">
          <span className="shrink-0 font-bold text-blue-600">i</span>
          <div className="text-xs leading-relaxed">
            Required columns: <strong>S.NO · NAME · BRANCH · DEPT · CLUSTER · CRT SEC · CRT ROOM · REGD.NO</strong>
            {' '}followed by 8 time-slot columns with <strong>P</strong> (present) or <strong>A</strong> (absent).
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
            <span className="text-sm text-gray-600">
              Recording for: <strong>{fmtDate(date)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Step 2 — Upload File</p>
        <div
          className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors
            ${drag ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/40'}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}>
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200 mb-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="font-semibold text-sm text-gray-800">
            {file ? file.name : 'Click to browse or drag and drop'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {file && date ? `Will import for ${fmtDate(date)}` : 'CSV files only'}
          </p>
        </div>
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
               onChange={e => setFile(e.target.files[0])} />

        <div className="flex gap-3 mt-4">
          <button
            className="btn-primary flex-1 justify-center py-2.5"
            onClick={upload}
            disabled={loading || !file}>
            {loading ? 'Importing…' : 'Upload and Import'}
          </button>
          <button className="btn-outline" onClick={downloadSample}>
            Download Sample
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card">
          <p className="card-title">Import Complete</p>

          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded p-3 mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Attendance Date</div>
            <div className="text-sm font-bold text-gray-900">{fmtDate(result.date)}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'New Students',  val: result.created,         cls: 'text-green-700' },
              { label: 'Updated',       val: result.updated,         cls: 'text-purple-700' },
              { label: 'Att. Records',  val: result.attendanceCount, cls: 'text-gray-900' },
              { label: 'Total Rows',    val: result.total,           cls: 'text-gray-900' },
            ].map(s => (
              <div key={s.label} className="border border-gray-200 rounded p-3 text-center">
                <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {result.slotCols?.length > 0 && (
            <div className="alert-info text-xs">
              <span className="font-bold text-blue-600 shrink-0">i</span>
              <span>Slots imported: <strong>{result.slotCols.join(' · ')}</strong></span>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3">
            Student accounts were auto-created. Default username and password = Registration No.
            Students must change their password on first login.
          </p>
        </div>
      )}
    </div>
  );
}
