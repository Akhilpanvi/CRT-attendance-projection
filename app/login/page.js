'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
        <p className="text-white/25 text-xs">© {new Date().getFullYear()} KL University</p>
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
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">CRT Attendance Portal</span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Sign in</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Enter your credentials to access the portal.
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
                <label className="form-label">Password</label>
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

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-5 leading-relaxed">
              Students: use your registration number as username.<br />
              First-time login will prompt a password change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
