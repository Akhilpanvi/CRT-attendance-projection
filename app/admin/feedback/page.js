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
            Students are asked if <b>{fmtDay(d.startDate)}</b> is the right start date · {total} answer{total !== 1 ? 's' : ''}
          </p>
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
