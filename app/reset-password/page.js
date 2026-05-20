'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
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

      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-black
                            text-white bg-slate-800 dark:bg-slate-700">KL</div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">CRT Attendance Portal</span>
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center
                              justify-center mx-auto mb-4 text-green-600 dark:text-green-400 text-xl font-bold">
                ✓
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Password updated!</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Your password has been changed successfully. You can now sign in.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="btn-primary w-full justify-center py-2.5 text-sm">
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Set new password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Confirm Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
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
                  disabled={loading || !token}
                  className="btn-primary w-full justify-center py-2.5 text-sm mt-1">
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">
                <a href="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  Back to Sign In
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
