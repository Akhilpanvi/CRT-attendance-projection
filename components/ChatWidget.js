'use client';
import { useEffect, useRef, useState } from 'react';

const STORE_KEY = 'crt-y24-chat';
const SUGGEST = {
  student: ['How many sessions can I still miss?', 'Which days are not uploaded yet?', 'When is my next CRT day?', 'What does SP mean?'],
  admin:   ['Which sections need attention?', 'Compare C1 and C2', 'How is the IS group doing?', 'How many students are below 75%?'],
};

/** Inline **bold** → <strong>, rendered as React nodes (no raw HTML) */
function inline(text, key) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
      : <span key={`${key}-${i}`}>{part}</span>);
}

/** Minimal markdown: paragraphs, - / * / 1. lists, **bold** */
function Rich({ text }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) {
      if (!list) { list = []; blocks.push({ type: 'ul', items: list, key: i }); }
      list.push(m[1]);
    } else {
      list = null;
      if (line.trim()) blocks.push({ type: 'p', text: line.replace(/^#+\s*/, ''), key: i });
    }
  });
  return blocks.map(b => b.type === 'ul'
    ? <ul key={b.key} className="list-disc pl-5 space-y-0.5 my-1">{b.items.map((it, j) => <li key={j}>{inline(it, `${b.key}-${j}`)}</li>)}</ul>
    : <p key={b.key} className="my-1">{inline(b.text, b.key)}</p>);
}

const Sparkle = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" opacity=".7" />
  </svg>
);

/**
 * Floating "Ask CRT Y24" assistant.
 * @param {'student'|'admin'} role  picks the suggested questions
 */
export default function ChatWidget({ role = 'student', inline: inlineMode = false }) {
  const [open, setOpen]         = useState(inlineMode);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const listRef  = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Keep the conversation for this browser tab
  useEffect(() => {
    if (inlineMode) return;
    try { const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); if (Array.isArray(saved)) setMessages(saved); } catch {}
  }, [inlineMode]);
  useEffect(() => {
    if (inlineMode || busy) return;
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages, busy, inlineMode]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);
  useEffect(() => {
    if (!open || inlineMode) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, inlineMode]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(''); setError('');
    const next = [...messages, { role: 'user', text: q }];
    setMessages([...next, { role: 'model', text: '' }]);
    setBusy(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }), signal: ctrl.signal,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Something went wrong.');
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...next, { role: 'model', text: acc }]);
      }
      if (!acc.trim()) throw new Error('No reply — please try again.');
    } catch (e) {
      if (e.name !== 'AbortError') { setError(e.message); setMessages(next); }
    } finally { setBusy(false); abortRef.current = null; }
  }

  function clear() { abortRef.current?.abort(); setMessages([]); setError(''); }

  const panel = (
    <div className={inlineMode
      ? 'glass flex flex-col h-[560px] rounded-2xl overflow-hidden'
      : 'glass fixed z-[60] inset-x-0 bottom-0 sm:inset-auto sm:right-5 sm:bottom-24 sm:w-[390px] h-[78vh] sm:h-[600px] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl'}
         role="dialog" aria-label="CRT Y24 assistant">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-900/10 dark:border-white/10">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center sky-btn">
          <Sparkle className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white">CRT Y24</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-300">{busy ? 'Typing…' : 'Your CRT attendance assistant'}</div>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="text-xs font-semibold px-2.5 h-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10">New chat</button>
        )}
        {!inlineMode && (
          <button onClick={() => setOpen(false)} aria-label="Close assistant" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center pt-6">
            <span className="inline-flex w-12 h-12 rounded-2xl items-center justify-center sky-btn">
              <Sparkle className="w-6 h-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Hi! I’m CRT Y24.</p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 px-6">
              {role === 'admin' ? 'Ask me about batch, cluster and section attendance.' : 'Ask me about your attendance, CRT days, holidays or how the site works.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 px-2">
              {SUGGEST[role].map(s => (
                <button key={s} onClick={() => send(s)}
                        className="text-left text-[13px] px-3.5 py-2.5 rounded-xl border border-white/80 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:border-[color:var(--sky-dot)] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] text-[13.5px] leading-relaxed px-3.5 py-2 rounded-2xl ${m.role === 'user'
              ? 'sky-btn rounded-br-md'
              : 'bg-white/70 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 border border-white/80 dark:border-white/10 rounded-bl-md'}`}>
              {m.role === 'model'
                ? (m.text ? <Rich text={m.text} /> : <span className="inline-flex gap-1 py-1.5">{[0, 1, 2].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d * 120}ms` }} />)}</span>)
                : <span className="whitespace-pre-wrap">{m.text}</span>}
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-center text-red-600 dark:text-red-400 px-4">{error}</p>}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(); }} className="p-3 border-t border-slate-900/10 dark:border-white/10 flex gap-2 items-end">
        <label htmlFor="crt-y24-input" className="sr-only">Message CRT Y24</label>
        <textarea id="crt-y24-input" ref={inputRef} rows={1} value={input} maxLength={1500}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask about your attendance…"
                  className="flex-1 resize-none max-h-32 rounded-xl px-3.5 py-2.5 text-sm outline-none bg-white/60 dark:bg-white/[0.06] border border-white/80 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 focus:border-[color:var(--sky-dot)] focus:ring-[3px] focus:ring-[color:var(--sky-soft)]" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
                className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center sky-btn disabled:opacity-40">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 pb-2 -mt-1">CRT Y24 can make mistakes — official records are final.</p>
    </div>
  );

  if (inlineMode) return panel;
  return (
    <>
      {open && panel}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Close CRT Y24' : 'Ask CRT Y24'}
              className="fixed z-[61] right-4 bottom-4 sm:right-5 sm:bottom-5 h-14 pl-4 pr-5 rounded-full flex items-center gap-2 font-semibold text-sm sky-btn active:scale-95">
        <Sparkle className="w-5 h-5" />
        {open ? 'Close' : 'Ask CRT Y24'}
      </button>
    </>
  );
}
