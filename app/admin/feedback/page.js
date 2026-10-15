'use client';
import { useState, useEffect } from 'react';

const fmtDay = iso => (iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** Students' answers to "Is the CRT start date correct?" */
function StartDateSummary() {
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { fetch('/api/admin/start-date-feedback').then(r => r.json()).then(x => !x.error && setD(x)).catch(() => {}); }, []);
  if (!d) return null;
  const total = d.correct + d.wrong;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">CRT start date check</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {total} answer{total !== 1 ? 's' : ''} from students{d.changed > 0 ? ` · ${d.changed} changed their answer (earlier answers kept)` : ''}
          </p>
          <div className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
            {d.byCluster.map(c => (
              <div key={c.startDate + c.cluster}>Shown <b>{fmtDay(c.startDate)}</b> · {c.cluster} — <span className="text-green-700 dark:text-green-400">{c.correct} yes</span> / <span className="text-red-600 dark:text-red-400">{c.wrong} no</span></div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{d.correct} correct</span>
          <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">{d.wrong} wrong</span>
        </div>
      </div>
      {d.suggested.length > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3">
          Suggested instead: {d.suggested.map(s => `${fmtDay(s.date)} (${s.count})`).join(' · ')}
        </p>
      )}
      {d.responses.length > 0 && (
        <>
          <button onClick={() => setOpen(!open)} className="text-xs font-semibold text-sky-600 dark:text-sky-400 mt-2">
            {open ? 'Hide' : 'Show'} {d.responses.length} “wrong” response{d.responses.length !== 1 ? 's' : ''}
          </button>
          {open && (
            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
              {d.responses.map(r => (
                <div key={r.rollNumber} className="py-2 text-xs">
                  <div className="text-slate-700 dark:text-slate-200">
                    <b>{r.rollNumber}</b> {r.name && `· ${r.name}`} {r.cluster && `· ${r.cluster}`} {r.crtSec && `· ${r.crtSec}`}
                    <span className="ml-1 text-slate-400">shown {fmtDay(r.shownDate)}</span>
                    {r.suggestedDate && <span className="ml-1 text-amber-600 dark:text-amber-400">→ {fmtDay(r.suggestedDate)}</span>}
                  </div>
                  {r.note && <p className="text-slate-500 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">{r.note}</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(r.updatedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const MSG_STATUS = {
  unread:     ['Not seen yet', 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'],
  read:       ['Seen, no answer', 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'],
  solved:     ['Solved', 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'],
  not_solved: ['Still a problem', 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'],
  dismissed:  ['Read', 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'],
};

/** Personal notices shown to individual students when they sign in */
function PersonalMessages() {
  const [list, setList]   = useState([]);
  const [rolls, setRolls] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [ask, setAsk]     = useState(true);
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState('');
  const load = () => fetch('/api/admin/messages').then(r => r.json()).then(d => Array.isArray(d) && setList(d)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function send(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumbers: rolls, title, body, askSolved: ask }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setMsg(`Sent to ${d.sent} student${d.sent !== 1 ? 's' : ''}. They’ll see it when they sign in.`);
      setRolls(''); setTitle(''); setBody(''); load();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function remove(id) {
    if (!confirm('Withdraw this message? The student will no longer see it.')) return;
    await fetch('/api/admin/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  const count = s => list.filter(m => m.status === s).length;
  const field = 'form-input w-full text-sm';
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Personal messages</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        Shown as a floating notice when the student signs in. No email is sent.
        {list.length > 0 && ` · ${list.length} sent: ${count('solved')} solved, ${count('not_solved')} still a problem, ${count('read')} seen without answer, ${count('unread')} not seen yet`}
      </p>

      <form onSubmit={send} className="mt-3 space-y-2">
        <input className={field} placeholder="Registration numbers (comma or space separated)" value={rolls} onChange={e => setRolls(e.target.value)} />
        <input className={field} placeholder="Title" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className={`${field} resize-y`} rows={3} maxLength={2000} placeholder="Message. Use {name} for the student’s name." value={body} onChange={e => setBody(e.target.value)} />
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mr-auto">
            <input type="checkbox" checked={ask} onChange={e => setAsk(e.target.checked)} /> Ask “Is your issue solved?”
          </label>
          <button className="btn-primary btn-sm" disabled={busy || !rolls.trim() || !title.trim() || !body.trim()}>{busy ? 'Sending…' : 'Send message'}</button>
        </div>
        {msg && <p className="text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      </form>

      {list.length > 0 && (
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
          {list.map(m => {
            const [label, cls] = MSG_STATUS[m.status] || [m.status, ''];
            return (
              <div key={m._id} className="py-2 text-xs flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-slate-700 dark:text-slate-200"><b>{m.rollNumber}</b>{m.name && ` · ${m.name}`}{m.crtSec && ` · ${m.crtSec}`}</div>
                  <div className="text-slate-500 dark:text-slate-400 truncate">{m.title}</div>
                  {m.reply && <p className="mt-0.5 text-red-600 dark:text-red-400 whitespace-pre-wrap">“{m.reply}”</p>}
                  <p className="text-[10px] text-slate-400 mt-0.5">Sent {fmtDate(m.createdAt)}{m.readAt ? ` · seen ${fmtDate(m.readAt)}` : ''}{m.answeredAt ? ` · answered ${fmtDate(m.answeredAt)}` : ''}</p>
                </div>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>{label}</span>
                <button onClick={() => remove(m._id)} title="Withdraw" className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-400">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading,  setLoading]  = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/feedback');
    const d = await r.json();
    setFeedback(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this feedback?')) return;
    await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student Feedback</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Anonymous feedback submitted by students from the login page.
        </p>
      </div>

      <PersonalMessages />
      <StartDateSummary />

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-12">Loading…</p>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <svg className="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <p className="text-sm">No feedback submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">{feedback.length} response{feedback.length !== 1 ? 's' : ''}</p>
          {feedback.map((f, i) => (
            <div key={f._id}
                 className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0 pt-0.5">
                    #{feedback.length - i}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {f.message}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(f._id)}
                  className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 ml-6">
                {fmtDate(f.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
