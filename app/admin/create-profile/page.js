'use client';
import { useState } from 'react';
import { useToast, Toast } from '@/components/Toast';

export default function CreateProfilePage() {
  const { toast, show } = useToast();
  const [form, setForm] = useState({
    name: '', rollNumber: '', branch: '', dept: '',
    cluster: '', crtSec: '', crtRoom: '', role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.rollNumber.trim()) {
      show('Name and registration number are required', 'error'); return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/admin/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCreated(d);
      setForm({ name: '', rollNumber: '', branch: '', dept: '', cluster: '', crtSec: '', crtRoom: '', role: 'student' });
      show(`Profile created for ${d.rollNumber}`);
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-xl">
      <Toast toast={toast} />

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manually create a student or admin account
        </p>
      </div>

      <div className="card">
        <p className="card-title">Account Details</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Full Name <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="e.g. VINAY KUMAR"
                     value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Registration No. <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="e.g. 2300040011"
                     value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="form-label">Branch</label>
              <input className="form-input" placeholder="e.g. CSE"
                     value={form.branch} onChange={e => set('branch', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Dept</label>
              <input className="form-input" placeholder="e.g. CSE1"
                     value={form.dept} onChange={e => set('dept', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Cluster</label>
              <input className="form-input" placeholder="e.g. C2"
                     value={form.cluster} onChange={e => set('cluster', e.target.value)} />
            </div>
            <div>
              <label className="form-label">CRT Section</label>
              <input className="form-input" placeholder="e.g. IS205"
                     value={form.crtSec} onChange={e => set('crtSec', e.target.value)} />
            </div>
            <div>
              <label className="form-label">CRT Room</label>
              <input className="form-input" placeholder="e.g. C008"
                     value={form.crtRoom} onChange={e => set('crtRoom', e.target.value)} />
            </div>
          </div>

          <div className="alert-info text-xs">
            <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">i</span>
            <span>Default password = Registration No. Student must change it on first login.</span>
          </div>

          <button type="submit" disabled={loading}
                  className="btn-primary w-full justify-center py-2.5">
            {loading ? 'Creating…' : 'Create Profile'}
          </button>
        </form>
      </div>

      {created && (
        <div className="card">
          <p className="card-title">Profile Created</p>
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/40
                          border border-slate-200 dark:border-slate-600 rounded">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{created.rollNumber}</div>
              <div className="text-xs text-slate-400 mt-0.5">Role: {created.role}</div>
            </div>
            <span className="badge-present">Created</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Username: <strong>{created.rollNumber}</strong> · Default password: <strong>{created.rollNumber}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
