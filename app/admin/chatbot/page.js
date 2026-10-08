'use client';
import { useEffect, useState } from 'react';
import { useToast, Toast } from '@/components/Toast';
import ChatWidget from '@/components/ChatWidget';

const AUD = { all: 'Everyone', students: 'Students only', admins: 'Admins only' };
const EMPTY = { title: '', content: '', audience: 'all' };

export default function ChatbotKnowledgePage() {
  const { toast, show } = useToast();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = () => fetch('/api/admin/knowledge').then(r => r.json())
    .then(d => setRows(Array.isArray(d) ? d : [])).catch(e => show(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function call(method, body) {
    const r = await fetch('/api/admin/knowledge', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await call(editId ? 'PATCH' : 'POST', editId ? { id: editId, ...form } : form);
      show(editId ? 'Updated — CRT Y24 uses it right away' : 'Added — CRT Y24 uses it right away');
      setForm(EMPTY); setEditId(null); load();
    } catch (err) { show(err.message, 'error'); }
    finally { setSaving(false); }
  }
  async function toggle(row) {
    try { await call('PATCH', { id: row._id, active: !row.active }); load(); } catch (err) { show(err.message, 'error'); }
  }
  async function remove(row) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    try { await call('DELETE', { id: row._id }); show('Deleted'); load(); } catch (err) { show(err.message, 'error'); }
  }

  return (
    <div className="max-w-6xl">
      <Toast toast={toast} />
      <div className="mb-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chatbot Knowledge</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Train CRT Y24: add facts, rules or ready answers. They apply instantly to every conversation — no redeploy.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
        <div className="space-y-4">
          <form onSubmit={save} className="card mb-0">
            <p className="card-title">{editId ? 'Edit entry' : 'Add knowledge'}</p>
            <div className="space-y-3">
              <div>
                <label className="form-label" htmlFor="kb-title">Topic / question</label>
                <input id="kb-title" className="form-input" maxLength={120} placeholder="e.g. Is there CRT during Dussehra week?"
                       value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" htmlFor="kb-content">What CRT Y24 should know / answer</label>
                <textarea id="kb-content" className="form-input min-h-[120px]" maxLength={2000}
                          placeholder="e.g. No CRT from 19–23 Oct 2026 for both clusters. Classes resume Mon 26 Oct (C1) and Wed 28 Oct (C2)."
                          value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                <div className="text-[11px] text-slate-400 text-right mt-1">{form.content.length}/2000</div>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="form-label" htmlFor="kb-aud">Who can be told this</label>
                  <select id="kb-aud" className="form-input" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                    {Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 ml-auto">
                  {editId && <button type="button" className="btn-outline" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</button>}
                  <button className="btn-primary" disabled={saving || !form.title.trim() || !form.content.trim()}>
                    {saving ? 'Saving…' : editId ? 'Save changes' : 'Add to CRT Y24'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="card p-0 overflow-hidden mb-0">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Knowledge entries</p>
              <span className="text-xs text-slate-400">{rows.filter(r => r.active).length} active · {rows.length} total</span>
            </div>
            {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
              : rows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 px-6">
                  Nothing yet. CRT Y24 already knows the site rules (clusters, 75%, holidays, SP, login) and each student’s own attendance —
                  add anything extra here, like holiday announcements, room changes or CRT office contacts.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {rows.map(r => (
                    <li key={r._id} className={`px-4 py-3 ${r.active ? '' : 'opacity-50'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.title}</span>
                            <span className="chip">{AUD[r.audience]}</span>
                            {!r.active && <span className="chip">Off</span>}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{r.content}</p>
                          <p className="text-[10px] text-slate-400 mt-1">by {r.updatedBy || '—'} · {new Date(r.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button className="btn-outline btn-sm" onClick={() => toggle(r)}>{r.active ? 'Turn off' : 'Turn on'}</button>
                          <button className="btn-outline btn-sm" onClick={() => { setEditId(r._id); setForm({ title: r.title, content: r.content, audience: r.audience }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                          <button className="btn-outline btn-sm text-red-600" onClick={() => remove(r)}>Delete</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>

        <div className="lg:sticky lg:top-16">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Test CRT Y24 (as admin)</p>
          <ChatWidget role="admin" inline />
        </div>
      </div>
    </div>
  );
}
