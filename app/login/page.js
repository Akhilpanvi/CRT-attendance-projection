'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const UPDATE_STYLES = {
  info:      { bar: 'bg-blue-400',  card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',  label: 'text-blue-500 dark:text-blue-400',  title: 'text-blue-800 dark:text-blue-200',  body: 'text-blue-700 dark:text-blue-300',  labelText: 'Info' },
  warning:   { bar: 'bg-amber-400', card: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'text-amber-600 dark:text-amber-400', title: 'text-amber-800 dark:text-amber-200', body: 'text-amber-700 dark:text-amber-300', labelText: 'Warning' },
  important: { bar: 'bg-rose-400',  card: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',  label: 'text-rose-500 dark:text-rose-400',  title: 'text-rose-800 dark:text-rose-200',  body: 'text-rose-700 dark:text-rose-300',  labelText: 'Important' },
};

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

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10
                      bg-slate-800 dark:bg-slate-950">
        <div>
          <div className="w-9 h-9 rounded bg-white/15 border border-white/20 flex items-center
                          justify-center text-sm font-black text-white mb-8">KL</div>
          <h2 className="text-2xl font-bold text-white leading-snug">
            CRT Attendance<br />Portal
          </h2>
          <p className="text-white/50 text-sm mt-2">
            KL University · 2023-27 Batch<br />
            Y-23 Summer CRT Training
          </p>
        </div>
        <p className="text-white/25 text-[10px] leading-relaxed">
          Not an official KL University platform.<br />
          Made by a Y23 student with personal interest.<br />
          © {new Date().getFullYear()} KL University
        </p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-black
                              text-white bg-slate-800 dark:bg-slate-700">KL</div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">CRT Attendance Tracker</span>
            </div>

            {/* Updates box */}
            {updates.length > 0 && (
              <div className="mb-6 space-y-2 max-h-52 overflow-y-auto">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  Updates
                </p>
                {updates.map(u => {
                  const s = UPDATE_STYLES[u.type] || UPDATE_STYLES.info;
                  return (
                    <div key={u._id}
                         className={`flex gap-2.5 rounded-lg border p-3 ${s.card}`}>
                      <div className={`w-0.5 shrink-0 rounded-full ${s.bar}`} />
                      <div className="min-w-0">
                        <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${s.label}`}>
                          {u.pinned ? '📌 ' : ''}{s.labelText}
                        </div>
                        {u.title && <p className={`text-xs font-semibold leading-snug mb-0.5 ${s.title}`}>{u.title}</p>}
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap ${s.body}`}>{u.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Sign in</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
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
              <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700
                              bg-slate-50 dark:bg-slate-800/50 p-4">
                {fpMsg === 'sent' ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                      Check your KL University email!
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      A password reset link has been sent to your
                      <strong className="text-slate-600 dark:text-slate-300"> @kluniversity.in</strong> email.
                      The link expires in 1 hour.
                    </p>
                    <button
                      onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }}
                      className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reset password request
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Enter your registration number / username. A reset request will be sent to your
                      KL University email and the admin will be notified.
                    </p>
                    <input
                      className="form-input"
                      placeholder="Registration number / username"
                      value={fpRoll}
                      onChange={e => setFpRoll(e.target.value)}
                      autoFocus
                    />
                    {fpMsg && fpMsg !== 'sent' && (
                      <p className="text-xs text-red-500 dark:text-red-400">{fpMsg}</p>
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
                        className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-600
                                   text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700
                                   transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-5 leading-relaxed">
              Students: use your registration number as username.<br />
              First-time login will prompt a password change.
            </p>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-4 leading-relaxed text-center">
              Not an official KL University platform.<br />
              Made by a student of Y23 KL University with personal interest and easy tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
