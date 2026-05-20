'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const CAT_COLOR = { info: '#3b82f6', warning: '#d97706', important: '#dc2626' };
const CAT_LABEL = { info: 'Info', warning: 'Warning', important: 'Important' };

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
                   style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>KL</div>
              <span className="text-sm font-bold text-white">CRT Attendance Tracker</span>
            </div>

            {/* Updates box — mobile only */}
            {updates.length > 0 && (
              <div className="lg:hidden mb-6 rounded-lg overflow-hidden"
                   style={isDark
                     ? { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
                     : { border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={isDark
                  ? { padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
                  : { padding: '8px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} />
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#1e293b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notices</span>
                  </div>
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px' }}>{updates.length} item{updates.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {updates.map((u, i) => {
                    const cc = CAT_COLOR[u.category] || CAT_COLOR.info;
                    const cl = CAT_LABEL[u.category] || 'Info';
                    return (
                      <div key={u._id} style={{ display: 'flex', gap: '10px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', minWidth: '14px', paddingTop: '2px' }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: cc, background: `${cc}22`, padding: '1px 5px', borderRadius: '3px' }}>{u.pinned ? '📌 ' : ''}{cl}</span>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(u.createdAt)}</span>
                          </div>
                          {u.title && <p style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: '2px', lineHeight: '1.4' }}>{u.title}</p>}
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{u.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h1 className="text-xl font-bold text-white mb-1">Sign in</h1>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
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

            {/* Forgot-password panel */}
            {fpOpen && (
              <div className="mt-4 rounded-lg p-4"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {fpMsg === 'sent' ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-400 mb-1">
                      Check your KL University email!
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      A password reset link has been sent to your
                      <strong style={{ color: 'rgba(255,255,255,0.8)' }}> @kluniversity.in</strong> email.
                      The link expires in 2 minutes.
                    </p>
                    <button
                      onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }}
                      className="mt-3 text-xs transition-colors"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-xs font-semibold text-white">
                      Reset password request
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                      <p className="text-xs text-red-400">{fpMsg}</p>
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
                        style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <p className="text-xs mt-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Students: use your registration number as username.<br />
              First-time login will prompt a password change.
            </p>
            <p className="text-[10px] mt-4 leading-relaxed text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Not an official KL University platform.<br />
              Made by a student of Y23 KL University with personal interest and easy tracking.
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <a href="/privacy" className="text-[10px] transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
                 onMouseOver={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                 onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.25)'}>
                Privacy Policy
              </a>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>·</span>
              <a href="/terms" className="text-[10px] transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
                 onMouseOver={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                 onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.25)'}>
                Terms of Service
              </a>
            </div>
          </div>

          {/* Updates panel — desktop only, right of form */}
          {updates.length > 0 && (
            <div className="hidden lg:flex flex-col w-80 shrink-0 self-center rounded-lg overflow-hidden"
                 style={isDark
                   ? { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
                   : { border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              {/* Header */}
              <div style={isDark
                ? { padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
                : { padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#1e293b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notices</span>
                </div>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px' }}>Showing {updates.length}</span>
              </div>
              {/* Column labels */}
              <div style={isDark
                ? { padding: '5px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)' }
                : { padding: '5px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', background: '#f8fafc' }}>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px', fontWeight: '600', minWidth: '16px' }}>#</span>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px', fontWeight: '600', flex: 1 }}>Subject / Notice</span>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap' }}>Date</span>
              </div>
              {/* Rows */}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {updates.map((u, i) => {
                  const cc = CAT_COLOR[u.category] || CAT_COLOR.info;
                  const cl = CAT_LABEL[u.category] || 'Info';
                  return (
                    <div key={u._id} style={{ display: 'flex', gap: '10px', padding: '11px 16px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                      <span style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', fontSize: '11px', minWidth: '16px', paddingTop: '2px' }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Badge + date on same line */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: cc, background: `${cc}22`, padding: '2px 6px', borderRadius: '3px' }}>{u.pinned ? '📌 ' : ''}{cl}</span>
                          <span style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(u.createdAt)}</span>
                        </div>
                        {/* Title + content below, full width */}
                        {u.title && <p style={{ fontSize: '12px', fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a', marginBottom: '3px', lineHeight: '1.4' }}>{u.title}</p>}
                        <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.5)' : '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{u.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
