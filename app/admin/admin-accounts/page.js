'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast, Toast } from '@/components/Toast';

export default function AdminAccountsPage() {
  const { toast, show } = useToast();
  const [admins,    setAdmins]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editEmail, setEditEmail] = useState({}); // { username: draftEmail }
  const [confirm,   setConfirm]   = useState(null); // { type, username }

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

  async function saveEmail(username) {
    const email = editEmail[username] ?? '';
    const r = await fetch('/api/admin/admin-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, action: 'update-email', email }),
    });
    const d = await r.json();
    if (!r.ok) { show(d.error, 'error'); return; }
    show('Email updated');
    setEditEmail(prev => { const n = { ...prev }; delete n[username]; return n; });
    load();
  }

  const hasEdit = username => username in editEmail;

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
                : `This will permanently delete the admin account "${confirm.username}". This cannot be undone.`}
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
                  ${confirm.type === 'reset'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-red-500 hover:bg-red-600'}`}>
                {confirm.type === 'reset' ? 'Reset' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Admin Accounts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage admin users — reset passwords, update emails, remove accounts
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="card-title mb-0">{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
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
          <div className="text-center py-8 text-sm text-slate-400">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">No admin accounts found</div>
        ) : (
          <div className="space-y-3">
            {admins.map(admin => (
              <div key={admin.username}
                   className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3
                                bg-slate-50 dark:bg-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center
                                    justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {admin.username[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {admin.username}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {admin.permissions === null
                          ? 'Full access'
                          : `${admin.permissions?.length ?? 0} permission${admin.permissions?.length !== 1 ? 's' : ''}`}
                        {admin.mustChangePassword && (
                          <span className="ml-2 text-amber-500">· must change password</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                </div>

                {/* Email row */}
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 shrink-0 w-10">Email</span>
                  <input
                    className="flex-1 text-xs bg-transparent border-b border-slate-200 dark:border-slate-700
                               text-slate-700 dark:text-slate-300 outline-none py-0.5
                               focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                    placeholder="Not set — password reset via email won't work"
                    value={hasEdit(admin.username) ? editEmail[admin.username] : (admin.email || '')}
                    onChange={e => setEditEmail(prev => ({ ...prev, [admin.username]: e.target.value }))}
                  />
                  {hasEdit(admin.username) && (
                    <button
                      onClick={() => saveEmail(admin.username)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold
                                 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shrink-0">
                      Save
                    </button>
                  )}
                  {hasEdit(admin.username) && (
                    <button
                      onClick={() => setEditEmail(prev => { const n = { ...prev }; delete n[admin.username]; return n; })}
                      className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alert-info text-xs mt-4">
        <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">i</span>
        <span>
          Resetting a password sets it back to the admin's username. The admin must change it on next login.
          Admins with a stored email can use "Forgot password?" on the login page.
        </span>
      </div>
    </div>
  );
}
