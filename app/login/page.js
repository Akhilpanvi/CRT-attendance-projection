'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const CAT_COLOR = { info: '#3b82f6', warning: '#d97706', important: '#dc2626' };
const CAT_LABEL = { info: 'Info', warning: 'Warning', important: 'Important' };

// ── Splash / Loading Screen ────────────────────────────────────────────────
function Splash({ onDone }) {
  const [bar, setBar] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBar(100), 50);
    const t2 = setTimeout(() => setOut(true), 1600);
    const t3 = setTimeout(onDone, 2000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070c18] transition-opacity duration-500 ${out ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', top: '20%', left: '30%', animation: 'orbFloat 6s ease-in-out infinite' }} />
        <div className="absolute w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', bottom: '25%', right: '25%', animation: 'orbFloat2 8s ease-in-out infinite' }} />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Animated KL mark */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl"
               style={{ animation: 'splashPop 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
            <span className="text-xl font-black text-slate-900">KL</span>
          </div>
          {/* Ring pulse */}
          <div className="absolute inset-0 rounded-2xl border-2 border-white/20"
               style={{ animation: 'ringPulse 1.5s ease-out 0.3s infinite' }} />
        </div>

        {/* Text */}
        <div className="text-center" style={{ animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <p className="text-white font-bold text-lg tracking-tight">CRT Attendance Tracker</p>
          <p className="text-white/40 text-xs mt-1">Y-23 · KL University</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden" style={{ animation: 'fadeUp 0.4s ease 0.5s both' }}>
          <div className="h-full bg-white/70 rounded-full transition-all duration-1000 ease-out"
               style={{ width: `${bar}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [ready,      setReady]      = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [updates,  setUpdates]  = useState([]);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch('/api/updates').then(r => r.json()).then(d => setUpdates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const [fpOpen,    setFpOpen]    = useState(false);
  const [fpRoll,    setFpRoll]    = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg,     setFpMsg]     = useState('');
  const [fbOpen,    setFbOpen]    = useState(false);
  const [fbMsg,     setFbMsg]     = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbStatus,  setFbStatus]  = useState('');

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!fpRoll.trim()) return;
    setFpLoading(true); setFpMsg('');
    try {
      const r = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rollNumber: fpRoll.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFpMsg('sent');
    } catch (e) { setFpMsg(e.message || 'Something went wrong.'); }
    finally { setFpLoading(false); }
  }

  async function handleFeedback(e) {
    e.preventDefault();
    if (!fbMsg.trim()) return;
    setFbLoading(true); setFbStatus('');
    try {
      const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: fbMsg.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFbStatus('sent'); setFbMsg('');
    } catch (e) { setFbStatus(e.message || 'Failed to send.'); }
    finally { setFbLoading(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Enter username and password.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.mustChangePassword) { router.push('/change-password'); return; }
      router.push(d.role === 'admin' ? '/admin/upload' : d.role === 'aprameya' ? '/aprameya' : '/student');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const features = [
    { icon: '📊', title: 'Live Attendance',  sub: 'Real-time tracking with weekly breakdown and projections' },
    { icon: '🎯', title: 'Smart Planner',    sub: 'Know exactly how many sessions you can skip or need to attend' },
    { icon: '📈', title: 'Self Progression', sub: 'Track your own sessions and see projected percentage instantly' },
  ];

  return (
    <>
      {showSplash && <Splash onDone={() => { setShowSplash(false); setTimeout(() => setReady(true), 50); }} />}

      <div className={`min-h-screen flex transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
           style={{ background: isDark ? 'linear-gradient(135deg, #070c18 0%, #0d1425 50%, #080d1c 100%)' : '#f8fafc' }}>

        {/* Animated background orbs — dark only */}
        {isDark && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-[600px] h-[600px] rounded-full opacity-30"
                 style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)', top: '-10%', left: '-5%', animation: 'orbFloat 12s ease-in-out infinite' }} />
            <div className="absolute w-[500px] h-[500px] rounded-full opacity-20"
                 style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 65%)', bottom: '-5%', right: '10%', animation: 'orbFloat2 15s ease-in-out infinite' }} />
            <div className="absolute w-[300px] h-[300px] rounded-full opacity-15"
                 style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 65%)', top: '40%', right: '35%', animation: 'orbFloat 18s ease-in-out infinite 3s' }} />
          </div>
        )}

        {/* ── Left panel ── */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-12 relative overflow-hidden"
             style={isDark
               ? { borderRight: '1px solid rgba(255,255,255,0.06)' }
               : { background: '#1e293b', borderRight: '1px solid #0f172a' }}>

          {/* Top brand */}
          <div style={{ animation: ready ? 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-slate-900 mb-10"
                 style={{ background: '#ffffff', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }}>KL</div>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
              CRT Attendance<br />
              <span style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(135deg, #60a5fa, #a78bfa)' }}>
                Tracker
              </span>
            </h1>
            <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Y-23 Summer CRT Training · KL University
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-3 flex-1 flex flex-col justify-center my-10">
            {features.map((f, i) => (
              <div key={f.title}
                   className="rounded-xl px-4 py-3.5 flex items-start gap-3"
                   style={{
                     background: 'rgba(255,255,255,0.04)',
                     border: '1px solid rgba(255,255,255,0.07)',
                     animation: ready ? `fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) ${200 + i * 100}ms both` : 'none',
                   }}>
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)', animation: ready ? 'fadeUp 0.6s ease 600ms both' : 'none' }}>
            Made by{' '}
            <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer"
               style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Akhil Panvi
            </a>
            {' '}· Y-23, KL University · with personal interest.
          </p>
        </div>

        {/* ── Right — form ── */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end p-4">
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center justify-center gap-12 px-6 pb-12">

            {/* Form card */}
            <div className="w-full max-w-sm shrink-0"
                 style={{ animation: ready ? 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 100ms both' : 'none' }}>

              {/* Mobile logo */}
              <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                     style={{ background: isDark ? '#ffffff' : '#1e293b', color: isDark ? '#0f172a' : '#ffffff' }}>KL</div>
                <span className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>CRT Attendance Tracker</span>
              </div>

              {/* Mobile notices */}
              {updates.length > 0 && (
                <div className="lg:hidden mb-6 rounded-xl overflow-hidden"
                     style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}>Notices</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {updates.slice(0, 3).map((u, i) => (
                      <div key={u._id} className="px-4 py-2.5" style={{ borderTop: i > 0 ? (isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9') : 'none' }}>
                        {u.title && <p className="text-xs font-semibold mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#0f172a' }}>{u.title}</p>}
                        <p className="text-[11px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>{u.content?.slice(0, 80)}{u.content?.length > 80 ? '…' : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form card */}
              <div className="rounded-2xl p-7"
                   style={isDark
                     ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }
                     : { background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

                <div className="mb-6">
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Welcome back</h2>
                  <p className="text-sm mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>
                    Sign in to view your attendance
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username field */}
                  <div className="space-y-1.5" style={{ animation: ready ? 'fadeUp 0.5s ease 250ms both' : 'none' }}>
                    <label className="text-[11px] font-semibold uppercase tracking-wider"
                           style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                      Registration No.
                    </label>
                    <input
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200"
                      placeholder="Registration number"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      autoFocus
                      style={isDark
                        ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', caretColor: '#60a5fa' }
                        : { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
                      onFocus={e => { e.target.style.borderColor = isDark ? 'rgba(96,165,250,0.6)' : '#93c5fd'; e.target.style.boxShadow = isDark ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 0 0 3px rgba(59,130,246,0.08)'; }}
                      onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5" style={{ animation: ready ? 'fadeUp 0.5s ease 330ms both' : 'none' }}>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider"
                             style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                        Password
                      </label>
                      <button type="button" onClick={() => { setFpOpen(o => !o); setFpMsg(''); setFpRoll(''); }}
                        className="text-[11px] transition-colors duration-150"
                        style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}
                        onMouseEnter={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.7)' : '#475569'}
                        onMouseLeave={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'}>
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={isDark
                        ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', caretColor: '#60a5fa' }
                        : { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
                      onFocus={e => { e.target.style.borderColor = isDark ? 'rgba(96,165,250,0.6)' : '#93c5fd'; e.target.style.boxShadow = isDark ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 0 0 3px rgba(59,130,246,0.08)'; }}
                      onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20"
                         style={{ animation: 'fadeUp 0.3s ease both' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden group"
                    style={{ animation: ready ? 'fadeUp 0.5s ease 400ms both' : 'none',
                             background: loading ? (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0') : (isDark ? '#ffffff' : '#0f172a'),
                             color: loading ? (isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8') : (isDark ? '#0f172a' : '#ffffff') }}>
                    {/* Shimmer on hover */}
                    {!loading && (
                      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)', animation: 'shimmer 1.5s ease infinite' }} />
                    )}
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in…
                      </span>
                    ) : 'Sign In'}
                  </button>
                </form>

                {/* Feedback trigger */}
                <button type="button" onClick={() => { setFbOpen(o => !o); setFbStatus(''); setFbMsg(''); }}
                  className="w-full mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all duration-200"
                  style={{ border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed #cbd5e1', color: isDark ? 'rgba(255,255,255,0.35)' : '#64748b', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <span>Feedback or suggestion?</span>
                  <svg className="w-3 h-3 ml-auto shrink-0 transition-transform duration-200" style={{ transform: fbOpen ? 'rotate(180deg)' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Feedback panel */}
                {fbOpen && (
                  <div className="mt-1 rounded-b-xl rounded-t-lg px-4 pb-4 pt-3"
                       style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', animation: 'fadeUp 0.25s ease both' }}>
                    {fbStatus === 'sent' ? (
                      <div className="text-center py-3">
                        <p className="text-sm font-semibold mb-1 text-emerald-400">Feedback received!</p>
                        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>Recorded anonymously. Thank you.</p>
                        <button onClick={() => { setFbOpen(false); setFbStatus(''); }} className="mt-2 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>Close</button>
                      </div>
                    ) : (
                      <form onSubmit={handleFeedback} className="space-y-3">
                        <textarea rows={3} maxLength={1000} placeholder="Your thoughts — no details needed…" value={fbMsg} onChange={e => setFbMsg(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-xs outline-none resize-none transition-all duration-200"
                          style={isDark ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } : { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }} />
                        <div className="flex gap-2">
                          <button type="submit" disabled={fbLoading || !fbMsg.trim()} className="btn-primary flex-1 justify-center py-2 text-xs">{fbLoading ? 'Sending…' : 'Submit'}</button>
                          <button type="button" onClick={() => { setFbOpen(false); setFbMsg(''); }} className="px-3 py-2 text-xs rounded-lg transition-colors" style={{ border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Forgot password */}
                {fpOpen && (
                  <div className="mt-3 rounded-xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0', animation: 'fadeUp 0.3s ease both' }}>
                    {fpMsg === 'sent' ? (
                      <div className="text-center py-1">
                        <p className="text-sm font-semibold text-emerald-400 mb-1">Check your KL email!</p>
                        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>Reset link sent to <strong style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#1e293b' }}>@kluniversity.in</strong>. Expires in 2 min.</p>
                        <button onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }} className="mt-2 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>Close</button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>Reset password</p>
                        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>Enter your reg. number — a link will be sent to your KL email.</p>
                        <input className="w-full px-3 py-2.5 rounded-lg text-xs outline-none" placeholder="Registration number" value={fpRoll} onChange={e => setFpRoll(e.target.value)} autoFocus
                          style={isDark ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } : { background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a' }} />
                        {fpMsg && fpMsg !== 'sent' && <p className="text-xs text-red-400">{fpMsg}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={fpLoading || !fpRoll.trim()} className="btn-primary flex-1 justify-center py-2 text-xs">{fpLoading ? 'Sending…' : 'Send link'}</button>
                          <button type="button" onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }} className="px-3 py-2 text-xs rounded-lg" style={{ border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 text-center space-y-1" style={{ animation: ready ? 'fadeUp 0.5s ease 550ms both' : 'none' }}>
                <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
                  Use your registration number as username · First login prompts a password change
                </p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <a href="/privacy" className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : '#94a3b8' }}>Privacy</a>
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1', fontSize: '10px' }}>·</span>
                  <a href="/terms" className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : '#94a3b8' }}>Terms</a>
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1', fontSize: '10px' }}>·</span>
                  <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer" className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : '#94a3b8' }}>Akhil Panvi</a>
                </div>
              </div>
            </div>

            {/* Notices — desktop */}
            {updates.length > 0 && (
              <div className="hidden lg:block w-80 shrink-0 self-center"
                   style={{ animation: ready ? 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 200ms both' : 'none' }}>
                <div className="rounded-2xl overflow-hidden"
                     style={isDark
                       ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }
                       : { background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
                  <div className="px-5 py-3.5 flex items-center justify-between"
                       style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9', background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#475569' }}>Notices</span>
                    </div>
                    <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>Showing {updates.length}</span>
                  </div>
                  <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    {updates.map((u, i) => {
                      const cc = CAT_COLOR[u.category] || CAT_COLOR.info;
                      const cl = CAT_LABEL[u.category] || 'Info';
                      return (
                        <div key={u._id} className="px-5 py-3.5 transition-colors duration-150"
                             style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f1f5f9', cursor: 'default' }}
                             onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#fafafa'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: cc, background: `${cc}20`, padding: '2px 7px', borderRadius: '4px' }}>
                              {u.pinned ? '📌 ' : ''}{cl}
                            </span>
                            <span style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#94a3b8', fontSize: '10px' }}>{fmtDate(u.createdAt)}</span>
                          </div>
                          {u.title && <p style={{ fontSize: '12px', fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.85)' : '#0f172a', marginBottom: '3px', lineHeight: '1.4' }}>{u.title}</p>}
                          <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.45)' : '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{u.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
