'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast, Toast } from '@/components/Toast';

const ALL_PERMISSIONS = [
  { key: 'upload',         label: 'Upload CSV',      desc: 'Import daily attendance CSVs' },
  { key: 'students',       label: 'All Students',    desc: 'View and edit student attendance' },
  { key: 'mark',           label: 'Mark Attendance', desc: 'Manually mark individual slots' },
  { key: 'removal',        label: 'Removal List',    desc: 'View students at removal risk' },
  { key: 'irregular',      label: 'Irregular',       desc: 'View irregular attendance report' },
  { key: 'progression',    label: 'Progression',     desc: 'View student self-tracked data' },
  { key: 'create-profile', label: 'Create Profile',  desc: 'Create new student/admin accounts' },
  { key: 'updates',        label: 'Updates',         desc: 'Post and manage notices' },
  { key: 'feedback',       label: 'Feedback',        desc: 'View student feedback' },
];

function EditPanel({ admin, onSave, onCancel }) {
  const [email,       setEmail]       = useState(admin.email || '');
  const [fullAccess,  setFullAccess]  = useState(admin.permissions === null);
  const [permissions, setPermissions] = useState(admin.permissions ?? []);
  const [saving,      setSaving]      = useState(false);
  const { toast, show } = useToast();

  function togglePerm(key) {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  }

  function handleFullAccess(checked) {
    setFullAccess(checked);
    setPermissions(checked ? ALL_PERMISSIONS.map(p => p.key) : []);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/admin-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:    admin.username,
          action:      'update-permissions',
          email,
          permissions: fullAccess ? null : permissions,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSave();
    } catch (e) { show(e.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
      <Toast toast={toast} />
      <div className="px-4 pt-3 pb-4 space-y-4">

        {/* Email */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Email for password reset
          </label>
          <input
            type="email"
            className="form-input mt-1"
            placeholder="e.g. admin@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Permissions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Access Permissions
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fullAccess}
                onChange={e => handleFullAccess(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">Full access</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {ALL_PERMISSIONS.map(p => {
              const checked = fullAccess || permissions.includes(p.key);
              return (
                <label key={p.key}
                       className={`flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer
                         transition-colors select-none text-xs
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
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{p.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {!fullAccess && permissions.length === 0 && (
            <p className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
              No permissions selected — this admin will see an empty dashboard.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-1.5 px-4 text-xs">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600
                       text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  const { toast, show } = useToast();
  const [admins,   setAdmins]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);  // username being edited
  const [confirm,  setConfirm]  = useState(null);  // { type, username }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/admin-accounts');
      if (!r.ok) throw new Error((await r.json()).error);
      setAdmins(await r.json());
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  async function resetPassword(username) {
    const r = await fetch('/api/admin/admin-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, action: 'reset-password' }),
    });
    const d = await r.json();
    if (!r.ok) { show(d.error, 'error'); return; }
    show(d.message || 'Password reset');
    setConfirm(null);
    load();
  }

  async function deleteAdmin(username) {
    const r = await fetch('/api/admin/admin-accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const d = await r.json();
    if (!r.ok) { show(d.error, 'error'); return; }
    show(`${username} deleted`);
    setConfirm(null);
    load();
  }

  return (
    <div className="max-w-2xl">
      <Toast toast={toast} />

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700
                          p-6 w-80 mx-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {confirm.type === 'reset' ? 'Reset password?' : 'Delete admin?'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {confirm.type === 'reset'
                ? `Password for "${confirm.username}" will be reset to their username. They must change it on next login.`
                : `Permanently delete admin account "${confirm.username}"? This cannot be undone.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600
                           text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => confirm.type === 'reset' ? resetPassword(confirm.username) : deleteAdmin(confirm.username)}
                className={`px-3 py-1.5 text-xs rounded font-semibold text-white transition-colors
                  ${confirm.type === 'reset' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {confirm.type === 'reset' ? 'Reset' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Admin Accounts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage admin users — edit access, reset passwords, remove accounts
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="card-title mb-0">{loading ? '…' : admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
          <button
            onClick={load}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">No admin accounts found</div>
        ) : (
          <div className="space-y-3">
            {admins.map(admin => (
              <div key={admin.username}
                   className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">

                {/* Card header */}
                <div className={`flex items-center gap-3 px-4 py-3
                  ${admin.isSelf
                    ? 'bg-slate-100 dark:bg-slate-700/60'
                    : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                   text-sm font-bold shrink-0
                    ${admin.isSelf
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                    {admin.username[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {admin.username}
                      </span>
                      {admin.isSelf && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded
                                         bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                          Super Admin · You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {!admin.isSelf && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded
                          ${admin.permissions === null || (Array.isArray(admin.permissions) && admin.permissions.length === ALL_PERMISSIONS.length)
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          {admin.permissions === null || (Array.isArray(admin.permissions) && admin.permissions.length === ALL_PERMISSIONS.length)
                            ? 'Full access'
                            : `${admin.permissions?.length ?? 0} permission${admin.permissions?.length !== 1 ? 's' : ''}`}
                        </span>
                      )}
                      {!admin.isSelf && admin.email && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[160px]">{admin.email}</span>
                      )}
                      {!admin.isSelf && !admin.email && (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">no email set</span>
                      )}
                      {admin.isSelf && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Full access · cannot be edited here</span>
                      )}
                      {!admin.isSelf && admin.mustChangePassword && (
                        <span className="text-[10px] text-amber-500 font-medium">· must change password</span>
                      )}
                    </div>
                  </div>

                  {/* Actions — hidden for self */}
                  {!admin.isSelf && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setEditing(editing === admin.username ? null : admin.username)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors
                          ${editing === admin.username
                            ? 'bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-200'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        {editing === admin.username ? 'Close' : 'Edit'}
                      </button>
                      <button
                        onClick={() => setConfirm({ type: 'reset', username: admin.username })}
                        className="px-2.5 py-1 text-[11px] font-medium rounded border
                                   border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400
                                   hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        Reset pwd
                      </button>
                      <button
                        onClick={() => setConfirm({ type: 'delete', username: admin.username })}
                        className="px-2.5 py-1 text-[11px] font-medium rounded border
                                   border-red-200 dark:border-red-700/50 text-red-500 dark:text-red-400
                                   hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit panel — expands inline, never for self */}
                {editing === admin.username && !admin.isSelf && (
                  <EditPanel
                    admin={admin}
                    onSave={() => { setEditing(null); load(); show('Changes saved'); }}
                    onCancel={() => setEditing(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alert-info text-xs mt-4">
        <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">i</span>
        <span>
          Resetting a password sets it back to the admin's username. Admins with a stored email can also use "Forgot password?" on the login page.
        </span>
      </div>
    </div>
  );
}
