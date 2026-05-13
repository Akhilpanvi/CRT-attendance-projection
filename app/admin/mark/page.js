'use client';
import { useState } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { TIME_SLOTS } from '@/lib/helpers';

function today() { return new Date().toISOString().split('T')[0]; }

export default function MarkPage() {
  const { toast, show } = useToast();
  const [roll, setRoll]       = useState('');
  const [student, setStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [date, setDate]       = useState(today);
  const [slot, setSlot]       = useState(TIME_SLOTS[0]);
  const [status, setStatus]   = useState('present');
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
      const r = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: student.rollNumber, date, slot, status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      show(`Marked ${status} for ${student.name} · ${slot}`);
    } catch (e) { show(e.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mark Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manually record a single attendance entry</p>
      </div>

      <div className="card">
        <p className="card-title">Step 1 — Find Student</p>
        <form onSubmit={lookup} className="flex gap-2">
          <input
            className="form-input flex-1"
            placeholder="Enter registration number"
            value={roll}
            onChange={e => setRoll(e.target.value)}
          />
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
            <input
              type="date"
              className="form-input max-w-[200px]"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
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
              {['present', 'absent'].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="w-4 h-4 accent-slate-700"
                  />
                  <span className={`text-sm font-medium ${s === 'present' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {s === 'present' ? 'Present' : 'Absent'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center py-2.5"
            disabled={saving || !student}>
            {saving ? 'Saving…' : 'Save Attendance'}
          </button>
        </form>
      </div>
    </div>
  );
}
