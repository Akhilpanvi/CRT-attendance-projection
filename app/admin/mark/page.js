'use client';
import { useState, useRef } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { TIME_SLOTS } from '@/lib/helpers';

function today() { return new Date().toISOString().split('T')[0]; }

/* ─── CSV template ─────────────────────────────────────────────────── */
const TEMPLATE_HEADER = 'Roll Number,Date,Slot';
const TEMPLATE_EXAMPLE = [
  '2200030001,2026-05-15,09:20-10:10',
  '2200030002,2026-05-15,10:10-11:00',
  '2200030003,2026-05-16,09:20-10:10',
].join('\n');

function downloadTemplate() {
  const csv  = `${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'sp_upload_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── CSV parser ───────────────────────────────────────────────────── */
function parseSpCSV(text) {
  const lines   = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  const errors  = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const [rollNumber, date, slot] = cols;
    // Skip header row
    if (i === 0 && /roll|reg/i.test(rollNumber)) continue;
    if (!rollNumber || !date || !slot) { errors.push(`Row ${i + 1}: missing fields`); continue; }
    // Basic date format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { errors.push(`Row ${i + 1}: date must be YYYY-MM-DD`); continue; }
    entries.push({ rollNumber: rollNumber.toUpperCase(), date, slot });
  }
  return { entries, errors };
}

/* ─── BulkSPUpload component ──────────────────────────────────────── */
function BulkSPUpload() {
  const { toast, show } = useToast();
  const fileRef  = useRef(null);
  const [preview,   setPreview]   = useState(null);  // { entries, errors } after parsing
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);   // { updated, skippedPresent, notFound }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    file.text().then(text => {
      const parsed = parseSpCSV(text);
      setPreview(parsed);
    });
  }

  async function upload() {
    if (!preview?.entries?.length) return;
    setUploading(true);
    try {
      const r = await fetch('/api/admin/bulk-sp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entries: preview.entries }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(d);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      show(`${d.updated} slot${d.updated !== 1 ? 's' : ''} marked as SP`);
    } catch (e) { show(e.message, 'error'); }
    finally { setUploading(false); }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="card mt-5">
      <Toast toast={toast} />
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="card-title mb-0">Bulk SP Upload</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Upload a CSV to mark multiple students as SP in a single batch.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border
                     border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300
                     hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template
        </button>
      </div>

      {/* Format hint */}
      <div className="mb-4 px-3 py-2 rounded bg-slate-50 dark:bg-slate-700/40
                      border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-mono">
        <span className="text-slate-400 dark:text-slate-500 mr-1">CSV columns:</span>
        Roll Number · Date (YYYY-MM-DD) · Slot (e.g. 09:20-10:10)
      </div>

      {/* File picker */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        id="sp-csv-file"
        onChange={handleFile}
      />

      {!preview && !result && (
        <label htmlFor="sp-csv-file"
          className="flex flex-col items-center justify-center gap-2 h-28 rounded-lg border-2 border-dashed
                     border-slate-200 dark:border-slate-600 cursor-pointer
                     hover:border-slate-400 dark:hover:border-slate-400 transition-colors text-slate-400">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm">Click to choose CSV file</span>
        </label>
      )}

      {/* Preview */}
      {preview && (
        <div>
          {preview.errors.length > 0 && (
            <div className="mb-3 px-3 py-2 rounded bg-red-50 dark:bg-red-900/20
                            border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 space-y-0.5">
              {preview.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {preview.entries.length > 0 ? (
            <>
              <div className="mb-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                {preview.entries.length} entr{preview.entries.length !== 1 ? 'ies' : 'y'} parsed — ready to upload
              </div>
              <div className="max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-700 mb-4">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                      {['#', 'Roll Number', 'Date', 'Slot'].map(h => (
                        <th key={h} className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase
                                               tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {preview.entries.map((e, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {e.rollNumber}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500">{e.date}</td>
                        <td className="px-3 py-1.5 text-slate-500">{e.slot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={upload}
                  disabled={uploading}
                  className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {uploading ? 'Uploading…' : 'Mark All as SP'}
                </button>
                <button onClick={reset}
                  className="px-4 py-2 text-sm rounded border border-slate-200 dark:border-slate-600
                             text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 mb-3">No valid entries found in the file.</div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Marked as SP', value: result.updated, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
              { label: 'Skipped (already present)', value: result.skippedPresent, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
              { label: 'Roll not found', value: result.notFound, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
            ].map(c => (
              <div key={c.label} className={`border rounded-lg p-3 text-center ${c.bg}`}>
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>
          <button onClick={reset}
            className="mt-1 text-xs text-blue-500 dark:text-blue-400 hover:underline">
            Upload another file
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── CleanupSP ────────────────────────────────────────────────────── */
function CleanupSP({ show }) {
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(null); // number of reverted records

  async function run() {
    if (!confirm(
      'This will revert ALL existing SP records to Absent.\n\n' +
      'After this, re-upload legitimate SPs using the Bulk SP Upload above.\n\n' +
      'Proceed?'
    )) return;

    setRunning(true);
    try {
      const r = await fetch('/api/admin/cleanup-sp', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDone(d.reverted);
      show(`${d.reverted} SP record${d.reverted !== 1 ? 's' : ''} reverted to Absent`);
    } catch (e) { show(e.message, 'error'); }
    finally { setRunning(false); }
  }

  return (
    <div className="mt-5 border border-red-200 dark:border-red-800/50 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/50
                      flex items-center gap-3">
        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">Revert All SP → Absent</p>
          <p className="text-[10px] text-red-500 dark:text-red-500 mt-0.5">
            One-time cleanup — removes all student-marked SP records from the database.
          </p>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center gap-4">
        {done !== null ? (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Done — {done} record{done !== 1 ? 's' : ''} reverted to Absent
          </div>
        ) : (
          <>
            <button
              onClick={run}
              disabled={running}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded
                         bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors">
              {running ? 'Reverting…' : 'Revert All SP to Absent'}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Use this once after disabling student SP marking.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── MarkPage ─────────────────────────────────────────────────────── */
export default function MarkPage() {
  const { toast, show } = useToast();
  const [roll, setRoll]       = useState('');
  const [student, setStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [date, setDate]       = useState(today);
  const [slot, setSlot]       = useState(TIME_SLOTS[0]);
  const [status, setStatus]   = useState('sp');
  const [saving, setSaving]   = useState(false);

  async function lookup(e) {
    e.preventDefault();
    if (!roll.trim()) return;
    setSearching(true); setStudent(null);
    try {
      const r = await fetch(`/api/students/${encodeURIComponent(roll.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Student not found');
      setStudent(d.student);
    } catch (e) { show(e.message, 'error'); }
    finally { setSearching(false); }
  }

  async function mark(e) {
    e.preventDefault();
    if (!student) { show('Look up a student first', 'error'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/mark-sp', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rollNumber: student.rollNumber, date, slot, status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      show(`Marked ${status.toUpperCase()} for ${student.name} · ${slot}`);
    } catch (e) { show(e.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mark Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Mark individual SP entries, or bulk-upload a CSV for batch SP marking.
        </p>
      </div>

      {/* ── Individual mark ──────────────────────────────────────── */}
      <div className="card">
        <p className="card-title">Step 1 — Find Student</p>
        <form onSubmit={lookup} className="flex gap-2">
          <input className="form-input flex-1" placeholder="Enter registration number"
            value={roll} onChange={e => setRoll(e.target.value)} />
          <button type="submit" className="btn-primary shrink-0" disabled={searching}>
            {searching ? 'Searching…' : 'Look up'}
          </button>
        </form>

        {student && (
          <div className="mt-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50
                          border border-slate-200 dark:border-slate-600 rounded p-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center
                            text-white font-bold shrink-0 text-xs bg-slate-700 dark:bg-slate-600">
              {student.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{student.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {[student.branch, student.dept, student.crtSec, `Room ${student.crtRoom}`].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className="badge-purple shrink-0">{student.rollNumber}</span>
          </div>
        )}
      </div>

      <div className="card">
        <p className="card-title">Step 2 — Attendance Details</p>
        <form onSubmit={mark} className="space-y-4">
          <div>
            <label className="form-label">Date</label>
            <input type="date" className="form-input max-w-[200px]"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Time Slot</label>
            <select className="form-input" value={slot} onChange={e => setSlot(e.target.value)}>
              {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <div className="flex gap-4">
              {[
                { val: 'sp',      label: 'Special Permission (SP)', cls: 'text-yellow-700 dark:text-yellow-400' },
                { val: 'absent',  label: 'Absent',                   cls: 'text-red-700 dark:text-red-400'    },
                { val: 'present', label: 'Present',                  cls: 'text-green-700 dark:text-green-400' },
              ].map(s => (
                <label key={s.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="radio" name="status" value={s.val}
                    checked={status === s.val} onChange={() => setStatus(s.val)}
                    className="w-4 h-4 accent-slate-700" />
                  <span className={`text-sm font-medium ${s.cls}`}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center py-2.5"
            disabled={saving || !student}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      {/* ── Bulk SP upload ──────────────────────────────────────── */}
      <BulkSPUpload />

      {/* ── One-time cleanup ────────────────────────────────────── */}
      <CleanupSP show={show} />
    </div>
  );
}
