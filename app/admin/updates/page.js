'use client';
import { useState, useEffect } from 'react';

const TYPE_STYLES = {
  info:      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  warning:   'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  important: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
};
const TYPE_LABELS = { info: 'Info', warning: 'Warning', important: 'Important' };

export default function UpdatesPage() {
  const [updates,  setUpdates]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [type,    setType]    = useState('info');
  const [pinned,  setPinned]  = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/updates');
    const d = await r.json();
    setUpdates(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/admin/updates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, content, type, pinned }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setTitle(''); setContent(''); setType('info'); setPinned(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this update?')) return;
    await fetch('/api/admin/updates', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    });
    await load();
  }

  function formatDate(d) {
    return new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tracker Updates</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Updates posted here appear on the login page for all students to see.
        </p>
      </div>

      {/* Add update form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Post an update</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            className="form-input"
            placeholder="Title (optional) — e.g. Attendance Freeze, Important Date"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="form-input min-h-[90px] resize-y"
            placeholder="Write your update here…"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="form-input w-auto"
              value={type}
              onChange={e => setType(e.target.value)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="important">Important</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="rounded"
              />
              Pin to top
            </label>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="btn-primary ml-auto py-2 px-5 text-sm">
              {saving ? 'Posting…' : 'Post Update'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      </div>

      {/* Updates list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
        ) : updates.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No updates posted yet.</p>
        ) : updates.map(u => (
          <div key={u._id}
               className={`rounded-lg border p-4 ${TYPE_STYLES[u.type] || TYPE_STYLES.info}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {TYPE_LABELS[u.type]}
                  </span>
                  {u.pinned && (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">· Pinned</span>
                  )}
                  <span className="text-[10px] opacity-50 ml-auto">{formatDate(u.createdAt)}</span>
                </div>
                {u.title && (
                  <p className="font-semibold text-sm mb-0.5">{u.title}</p>
                )}
                <p className="text-sm opacity-90 whitespace-pre-wrap">{u.content}</p>
              </div>
              <button
                onClick={() => handleDelete(u._id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-current">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
