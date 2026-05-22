'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const CAT_COLOR = { info: '#3b82f6', warning: '#d97706', important: '#dc2626' };
const CAT_LABEL = { info: 'Info', warning: 'Warning', important: 'Important' };

function NoticesPanel({ updates, isDark, maxHeight = '400px' }) {
  const darkPanel  = { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' };
  const lightPanel = { border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' };
  const darkHdr    = { padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const lightHdr   = { padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' };
  const darkCols   = { padding: '5px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)' };
  const lightCols  = { padding: '5px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', background: '#f8fafc' };
  const colLbl     = { color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px', fontWeight: '600' };
  return (
    <div style={isDark ? darkPanel : lightPanel}>
      <div style={isDark ? darkHdr : lightHdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} />
          <span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#1e293b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notices</span>
        </div>
        <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px' }}>Showing {updates.length}</span>
      </div>
      <div style={isDark ? darkCols : lightCols}>
        <span style={{ ...colLbl, minWidth: '16px' }}>#</span>
        <span style={{ ...colLbl, flex: 1 }}>Subject / Notice</span>
        <span style={{ ...colLbl, whiteSpace: 'nowrap' }}>Date</span>
      </div>
      <div style={{ maxHeight, overflowY: 'auto' }}>
        {updates.map((u, i) => {
          const cc = CAT_COLOR[u.category] || CAT_COLOR.info;
          const cl = CAT_LABEL[u.category] || 'Info';
          return (
            <div key={u._id} style={{ display: 'flex', gap: '10px', padding: '11px 16px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9', alignItems: 'flex-start' }}>
              <span style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', fontSize: '11px', minWidth: '16px', paddingTop: '2px' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: cc, background: `${cc}22`, padding: '2px 6px', borderRadius: '3px' }}>{u.pinned ? '📌 ' : ''}{cl}</span>
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px' }}>{fmtDate(u.createdAt)}</span>
                </div>
                {u.title && <p style={{ fontSize: '12px', fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a', marginBottom: '3px', lineHeight: '1.4' }}>{u.title}</p>}
                <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.5)' : '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{u.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [updates, setUpdates] = useState([]);
  useEffect(() => {
    fetch('/api/updates').then(r => r.json()).then(d => setUpdates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const [fpOpen,    setFpOpen]    = useState(false);
  const [fpRoll,    setFpRoll]    = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg,     setFpMsg]     = useState('');  // '' | 'sent' | error string

  const [fbOpen,    setFbOpen]    = useState(false);
  const [fbMsg,     setFbMsg]     = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbStatus,  setFbStatus]  = useState('');  // '' | 'sent' | error string

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!fpRoll.trim()) return;
    setFpLoading(true);
    setFpMsg('');
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: fpRoll.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFpMsg('sent');
    } catch (e) {
      setFpMsg(e.message || 'Something went wrong. Try again.');
    } finally {
      setFpLoading(false);
    }
  }

  async function handleFeedback(e) {
    e.preventDefault();
    if (!fbMsg.trim()) return;
    setFbLoading(true);
    setFbStatus('');
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fbMsg.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFbStatus('sent');
      setFbMsg('');
    } catch (e) {
      setFbStatus(e.message || 'Failed to send. Try again.');
    } finally {
      setFbLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Enter username and password.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.mustChangePassword) { router.push('/change-password'); return; }
      router.push(d.role === 'admin' ? '/admin/upload' : d.role === 'aprameya' ? '/aprameya' : '/student');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const darkBg = 'radial-gradient(ellipse at 30% 60%, rgba(29,78,216,0.12) 0%, #080d1a 55%, #050810 100%)';

  return (
    <div className="min-h-screen flex" style={{ background: isDark ? darkBg : undefined }}
         data-theme={isDark ? 'dark' : 'light'}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10"
           style={isDark ? { background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)' }
                         : { background: '#1e293b', borderRight: '1px solid #334155' }}>
        <div>
          <div className="w-9 h-9 rounded flex items-center justify-center text-sm font-black text-white mb-8"
               style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>KL</div>
          <h2 className="text-2xl font-bold text-white leading-snug">
            CRT Attendance<br />Tracker
          </h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            KL University · 2023-27 Batch<br />
            Y-23 Summer CRT Training
          </p>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Not an official KL University platform.<br />
          Made by a Y23 student with personal interest.<br />
          © {new Date().getFullYear()} KL University
        </p>
      </div>

      {/* Right — form + updates */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-transparent">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center gap-10 px-6 pb-12">

          {/* Login form */}
          <div className="w-full max-w-sm shrink-0">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-black text-white"
                   style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#1e293b', border: isDark ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>KL</div>
              <span className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>CRT Attendance Tracker</span>
            </div>

            {/* Notices — mobile only */}
            {updates.length > 0 && (
              <div className="lg:hidden mb-6">
                <NoticesPanel updates={updates} isDark={isDark} maxHeight="220px" />
              </div>
            )}

            <h1 className="text-xl font-bold mb-1" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Sign in</h1>
            <p className="text-sm mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
              Enter your credentials to access the tracker.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label">Username / Reg. No.</label>
                <input
                  className="form-input"
                  placeholder="CRT or registration number"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => { setFpOpen(o => !o); setFpMsg(''); setFpRoll(''); }}
                    className="text-xs text-slate-400 dark:text-slate-500
                               hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="alert-danger">
                  <span className="shrink-0">&#9888;</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 text-sm mt-1">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Feedback trigger */}
            <button
              type="button"
              onClick={() => { setFbOpen(o => !o); setFbStatus(''); setFbMsg(''); }}
              className="w-full mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-colors"
              style={isDark
                ? { border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.02)' }
                : { border: '1px dashed #cbd5e1', color: '#64748b', background: '#f8fafc' }}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span>Have a suggestion or feedback? Share it here</span>
              <svg className="w-3 h-3 shrink-0 ml-auto transition-transform" style={{ transform: fbOpen ? 'rotate(180deg)' : 'none' }}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Feedback panel */}
            {fbOpen && (
              <div className="rounded-b-lg px-4 pb-4 pt-3"
                   style={isDark
                     ? { border: '1px dashed rgba(255,255,255,0.15)', borderTop: 'none', background: 'rgba(255,255,255,0.02)' }
                     : { border: '1px dashed #cbd5e1', borderTop: 'none', background: '#f8fafc' }}>
                {fbStatus === 'sent' ? (
                  <div className="text-center py-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: isDark ? '#4ade80' : '#16a34a' }}>
                      Thank you for your feedback!
                    </p>
                    <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>
                      Your response has been recorded anonymously.
                    </p>
                    <button
                      onClick={() => { setFbOpen(false); setFbStatus(''); }}
                      className="mt-3 text-xs transition-colors"
                      style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFeedback} className="space-y-3">
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="Your review or suggestion — no details needed…"
                      value={fbMsg}
                      onChange={e => setFbMsg(e.target.value)}
                      className="form-input resize-none"
                      style={{ fontSize: '13px' }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
                        {fbMsg.length}/1000
                      </span>
                      {fbStatus && fbStatus !== 'sent' && (
                        <p className="text-[11px] text-red-400">{fbStatus}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={fbLoading || !fbMsg.trim()}
                        className="btn-primary flex-1 justify-center py-2 text-xs">
                        {fbLoading ? 'Sending…' : 'Submit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFbOpen(false); setFbStatus(''); setFbMsg(''); }}
                        className="px-3 py-2 text-xs rounded-md transition-colors"
                        style={isDark
                          ? { border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                          : { border: '1px solid #e2e8f0', color: '#64748b' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Forgot-password panel */}
            {fpOpen && (
              <div className="mt-4 rounded-lg p-4"
                   style={isDark
                     ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
                     : { background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                {fpMsg === 'sent' ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold mb-1" style={{ color: isDark ? '#4ade80' : '#16a34a' }}>
                      Check your KL University email!
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
                      A password reset link has been sent to your
                      <strong style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#1e293b' }}> @kluniversity.in</strong> email.
                      The link expires in 2 minutes.
                    </p>
                    <button
                      onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }}
                      className="mt-3 text-xs transition-colors"
                      style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-xs font-semibold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                      Reset password request
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
                      Enter your registration number / username. A reset link will be sent to your KL University email.
                    </p>
                    <input
                      className="form-input"
                      placeholder="Registration number / username"
                      value={fpRoll}
                      onChange={e => setFpRoll(e.target.value)}
                      autoFocus
                    />
                    {fpMsg && fpMsg !== 'sent' && (
                      <p className="text-xs text-red-500">{fpMsg}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={fpLoading || !fpRoll.trim()}
                        className="btn-primary flex-1 justify-center py-2 text-xs">
                        {fpLoading ? 'Sending…' : 'Send request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }}
                        className="px-3 py-2 text-xs rounded-md transition-colors"
                        style={isDark
                          ? { border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                          : { border: '1px solid #e2e8f0', color: '#64748b' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <p className="text-xs mt-5 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
              Students: use your registration number as username.<br />
              First-time login will prompt a password change.
            </p>
            <p className="text-[10px] mt-4 leading-relaxed text-center" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#94a3b8' }}>
              Not an official KL University platform.<br />
              Made by a student of Y23 KL University with personal interest and easy tracking.
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <a href="/privacy" className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
                Privacy Policy
              </a>
              <span style={{ color: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1', fontSize: '10px' }}>·</span>
              <a href="/terms" className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
                Terms of Service
              </a>
            </div>
          </div>

          {/* Notices — desktop only, right of form */}
          {updates.length > 0 && (
            <div className="hidden lg:block w-80 shrink-0 self-center">
              <NoticesPanel updates={updates} isDark={isDark} maxHeight="460px" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
