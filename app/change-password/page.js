'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [np, setNp]           = useState('');
  const [cp, setCp]           = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!np || np.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (np !== cp)            { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: np }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push('/student');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-black
                            text-white bg-slate-800 dark:bg-slate-700">KL</div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">CRT Attendance Portal</span>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Set New Password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              You must change your default password before continuing.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">
                  New Password{' '}
                  <span className="normal-case font-normal text-slate-400">(min. 6 characters)</span>
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Enter new password"
                  value={np}
                  onChange={e => setNp(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Re-enter new password"
                  value={cp}
                  onChange={e => setCp(e.target.value)}
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
                className="btn-primary w-full justify-center py-2.5 text-sm">
                {loading ? 'Saving…' : 'Set Password & Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
