'use client';
import { useState } from 'react';
import { useToast, Toast } from '@/components/Toast';

const ALL_PERMISSIONS = [
  { key: 'upload',          label: 'Upload CSV',      desc: 'Import daily attendance CSVs' },
  { key: 'students',        label: 'All Students',    desc: 'View and edit student attendance' },
  { key: 'mark',            label: 'Mark Attendance', desc: 'Manually mark individual slots' },
  { key: 'removal',         label: 'Removal List',    desc: 'View students at removal risk' },
  { key: 'irregular',       label: 'Irregular',       desc: 'View irregular attendance report' },
  { key: 'progression',     label: 'Progression',     desc: 'View student self-tracked data' },
  { key: 'create-profile',  label: 'Create Profile',  desc: 'Create new student/admin accounts' },
  { key: 'updates',         label: 'Updates',         desc: 'Post and manage notices' },
  { key: 'feedback',        label: 'Feedback',        desc: 'View student feedback' },
];

export default function CreateProfilePage() {
  const { toast, show } = useToast();
  const [form, setForm] = useState({
    name: '', rollNumber: '', branch: '', dept: '',
    cluster: '', crtSec: '', crtRoom: '', role: 'student',
  });
  const [permissions, setPermissions] = useState([]);
  const [fullAccess,  setFullAccess]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function togglePerm(key) {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }

  function handleRoleChange(role) {
    set('role', role);
    if (role !== 'admin') { setPermissions([]); setFullAccess(false); }
  }

  function handleFullAccessToggle(checked) {
    setFullAccess(checked);
    setPermissions(checked ? ALL_PERMISSIONS.map(p => p.key) : []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.rollNumber.trim()) {
      show('Name and registration number are required', 'error'); return;
    }
    setLoading(true);
    try {
      const body = { ...form };
      if (form.role === 'admin') {
        // null = full access (no restrictions), array = restricted
        body.permissions = fullAccess ? null : permissions;
      }
      const r = await fetch('/api/admin/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCreated(d);
      setForm({ name: '', rollNumber: '', branch: '', dept: '', cluster: '', crtSec: '', crtRoom: '', role: 'student' });
      setPermissions([]);
      setFullAccess(false);
      show(`Profile created for ${d.rollNumber}`);
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const isAdmin = form.role === 'admin';

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
              <select className="form-input" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Student-only fields */}
            {!isAdmin && (
              <>
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
              </>
            )}
          </div>

          {/* Admin permissions */}
          {isAdmin && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5
                              bg-slate-50 dark:bg-slate-700/30
                              border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Access Permissions
                </span>
                {/* Full access toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fullAccess}
                    onChange={e => handleFullAccessToggle(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Full access</span>
                </label>
              </div>

              {/* Permission grid */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {ALL_PERMISSIONS.map(p => {
                  const checked = fullAccess || permissions.includes(p.key);
                  return (
                    <label key={p.key}
                           className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer
                             transition-colors select-none
                             ${checked
                               ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50'
                               : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={fullAccess}
                        onChange={() => togglePerm(p.key)}
                        className="mt-0.5 rounded border-slate-300 dark:border-slate-600 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{p.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {!fullAccess && permissions.length === 0 && (
                <p className="px-4 pb-3 text-[10px] text-amber-600 dark:text-amber-400">
                  No permissions selected — this admin will see an empty dashboard.
                </p>
              )}
            </div>
          )}

          <div className="alert-info text-xs">
            <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">i</span>
            <span>Default password = Registration No. {isAdmin ? 'Admin' : 'Student'} must change it on first login.</span>
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
              <div className="text-xs text-slate-400 mt-0.5">
                Role: {created.role}
                {created.role === 'admin' && (
                  created.permissions === null
                    ? ' · Full access'
                    : ` · ${created.permissions?.length ?? 0} permission${created.permissions?.length !== 1 ? 's' : ''}`
                )}
              </div>
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
