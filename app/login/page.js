'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LOGO_RED, LOGO_WHITE } from '@/lib/logos';
import ThemeToggle from '@/components/ThemeToggle';
import { useSky, GREETING, skyAccent, skyUI } from '@/components/SkyBackground';
import { motion } from 'framer-motion';

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
const CAT_COLOR = { info: '#3b82f6', warning: '#d97706', important: '#dc2626' };
const CAT_LABEL = { info: 'Info', warning: 'Warning', important: 'Important' };

// Theme-aware splash screen
function Splash({ onDone }) {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [bar, setBar] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBar(100), 40);
    const t2 = setTimeout(() => setOut(true), 850);
    const t3 = setTimeout(onDone, 1150);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ${out ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
         style={{ background: dark ? 'rgba(4,6,14,0.35)' : 'rgba(255,255,255,0.30)', backdropFilter: 'blur(26px) saturate(150%)', WebkitBackdropFilter: 'blur(26px) saturate(150%)' }}>

      {/* KL logo */}
      <div className="relative mb-6 inline-block">
        <img src={dark ? LOGO_WHITE : LOGO_RED} alt="KL University"
             className="h-20 w-auto block relative z-10"
             style={{ animation: 'splashPop 0.7s cubic-bezier(0.16,1,0.3,1) both', ...(dark ? {} : { mixBlendMode: 'multiply' }) }} />
        <div className="absolute inset-0" style={{ border: `2px solid ${dark ? 'rgba(255,255,255,0.3)' : 'rgba(30,41,59,0.2)'}`, animation: 'ringPulse 1.5s ease-out 0.5s infinite' }} />
        <div className="absolute inset-0" style={{ border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(30,41,59,0.1)'}`, animation: 'ringPulse2 2s ease-out 0.8s infinite' }} />
      </div>

      {/* Text */}
      <div className="text-center space-y-1" style={{ animation: 'fadeUp 0.5s ease 0.35s both' }}>
        <p className="font-bold text-xl tracking-tight" style={{ color: dark ? '#ffffff' : '#0f172a' }}>CRT Attendance Tracker</p>
        <p className="text-sm" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)' }}>Y-24 · KL University</p>
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-40 h-0.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)', animation: 'fadeUp 0.4s ease 0.55s both' }}>
        <div className="h-full rounded-full transition-all duration-[750ms] ease-out relative overflow-hidden"
             style={{ width: `${bar}%`, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.5)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)', animation: 'shimmer 1.2s ease 0.2s infinite' }} />
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
  const [fpOpen,    setFpOpen]    = useState(false);
  const [fpRoll,    setFpRoll]    = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg,     setFpMsg]     = useState('');
  const [fbOpen,    setFbOpen]    = useState(false);
  const [fbMsg,     setFbMsg]     = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbStatus,  setFbStatus]  = useState('');

  const [isDark, setIsDark] = useState(true);
  const sky = useSky();
  const ui = skyUI(sky, isDark);
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

  async function handleForgotPassword(e) {
    e.preventDefault(); if (!fpRoll.trim()) return;
    setFpLoading(true); setFpMsg('');
    try {
      const r = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rollNumber: fpRoll.trim() }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setFpMsg('sent');
    } catch (e) { setFpMsg(e.message || 'Something went wrong.'); } finally { setFpLoading(false); }
  }
  async function handleFeedback(e) {
    e.preventDefault(); if (!fbMsg.trim()) return;
    setFbLoading(true); setFbStatus('');
    try {
      const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: fbMsg.trim() }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setFbStatus('sent'); setFbMsg('');
    } catch (e) { setFbStatus(e.message || 'Failed.'); } finally { setFbLoading(false); }
  }
  async function handleLogin(e) {
    e.preventDefault(); setError('');
    if (!username || !password) { setError('Enter username and password.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      if (d.mustChangePassword) { router.push('/change-password'); return; }
      router.push(d.role === 'admin' ? '/admin/upload' : d.role === 'aprameya' ? '/aprameya' : '/student');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  const ICON = 'w-[18px] h-[18px]';
  const features = [
    { title: 'Know where you stand',
      sub: 'Your official %, and exactly how many sessions you can still miss before 75%.',
      tint: '#22c55e',
      icon: <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 5-6" /></svg> },
    { title: 'Made for your cluster',
      sub: 'C1 (Mon & Tue) and C2 (Wed & Thu) are counted separately. Holidays never count against you.',
      tint: '#6366f1',
      icon: <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path strokeLinecap="round" d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg> },
    { title: 'Day not uploaded? Track it',
      sub: 'Mark missing days yourself and see an estimate — clearly labelled as unofficial.',
      tint: '#f59e0b',
      icon: <svg className={ICON} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9" /></svg> },
  ];

  // Light mode colors
  const LBG   = '#faf8f5';
  const LCard = '#ffffff';
  const LBorder = '#ede9e3';

  return (
    <>
      {showSplash && <Splash onDone={() => { setShowSplash(false); setTimeout(() => setReady(true), 60); }} />}

      <div className={`min-h-[100dvh] flex transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
           style={{ background: 'transparent' }}>

        {/* ── Left panel ── */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-12 relative z-10 overflow-hidden"
             style={isDark ? { borderRight: '1px solid rgba(255,255,255,0.06)' } : { borderRight: `1px solid ${LBorder}` }}>

          <div style={{ animation: ready ? 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
            <div className="inline-flex items-center mb-10"
                 style={{ animation: 'none' }}>
              <img src={isDark ? LOGO_WHITE : LOGO_RED} alt="KL University"
                   className="h-14 w-auto block"
                   style={isDark ? {} : { mixBlendMode: 'multiply' }} />
            </div>
            <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-tight mb-3">
              <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>CRT Attendance</span><br />
              <span className="sky-text">Tracker</span>
            </h1>
            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(15,23,42,0.5)' }}>
              Y-24 CRT Training · KL University
            </p>
            <a href="/about" className="sky-soft inline-flex items-center gap-1.5 mt-4 px-3.5 py-2 rounded-xl text-sm font-semibold transition-transform hover:-translate-y-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9.5" /><path strokeLinecap="round" d="M12 11v6M12 7.5v.01" /></svg>
              About this site
            </a>
          </div>

          {/* Feature cards */}
          <div className="space-y-2.5 flex-1 flex flex-col justify-center my-8">
            {features.map((f, i) => (
              <motion.div key={f.title} className="rounded-xl px-4 py-3.5 flex items-start gap-3 group"
                   style={{
                     background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.45)',
                     border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.9)',
                     backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)',
                     boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.35)' : '0 8px 30px rgba(15,23,42,0.06)',
                   }}
                   initial={ready ? { opacity: 0, y: 14 } : false}
                   animate={ready ? { opacity: 1, y: 0 } : false}
                   transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                   whileHover={{ x: 4, backgroundColor: isDark ? 'rgba(25,30,48,0.7)' : 'rgba(255,255,255,0.92)' }}>
                <span className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: f.tint + (isDark ? '2e' : '1f'), color: f.tint }}>{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.78)' : '#475569' }}>{f.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-[10px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.3)', animation: ready ? 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
            Built for Y-24 CRT students · KL University
          </p>
        </div>

        {/* ── Right ── */}
        <div className="flex-1 flex flex-col relative z-10">
          <div className="flex justify-end items-center gap-2 p-4 relative z-10">
            {sky.weather && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md"
                    title={`Live weather · sunrise ${sky.weather.sunrise} · sunset ${sky.weather.sunset}`}
                    style={{ background: isDark ? 'rgba(15,18,30,0.55)' : 'rgba(255,255,255,0.75)', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.9)', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                {sky.weather.place} · {sky.weather.temp}° · {sky.weather.label}
              </span>
            )}
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center justify-center gap-12 px-6 pb-10">

            {/* Form */}
            <div className="w-full max-w-sm shrink-0"
                 style={{ animation: ready ? 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>

              {/* Mobile logo */}
              <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <img src={isDark ? LOGO_WHITE : LOGO_RED} alt="KL"
                     className="h-9 w-auto block"
                     style={isDark ? {} : { mixBlendMode: 'multiply' }} />
                <span className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>CRT Attendance Tracker</span>
                <a href="/about" className="sky-soft ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg">About</a>
              </div>

              {/* Mobile notices */}
              {updates.length > 0 && (
                <div className="lg:hidden mb-6 rounded-xl overflow-hidden"
                     style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.75)'}`, backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)' }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: ui.soft, borderBottom: `1px solid ${ui.edge}` }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ui.dot }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ui.ink }}>Notices</span>
                  </div>
                  {updates.slice(0, 3).map((u, i) => (
                    <div key={u._id} className="px-4 py-2.5" style={{ borderTop: i > 0 ? (isDark ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${LBorder}`) : 'none' }}>
                      {u.title && <p className="text-xs font-semibold mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#0f172a' }}>{u.title}</p>}
                      <p className="text-[11px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>{u.content?.slice(0, 80)}{u.content?.length > 80 ? '…' : ''}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Form card */}
              <div className="rounded-2xl p-7 relative overflow-hidden"
                   style={isDark
                     ? { background: 'linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)', boxShadow: '0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)' }
                     : { background: 'linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))', border: '1px solid rgba(255,255,255,0.75)', backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)', boxShadow: '0 20px 60px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)' }}>

                {/* Top card shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px"
                     style={{ background: isDark ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.46),transparent)' : 'linear-gradient(90deg,transparent,rgba(0,0,0,0.05),transparent)' }} />

                <div className="mb-7">
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{sky.phase ? `${GREETING[sky.phase]}!` : 'Welcome back'}</h2>
                  <p className="text-sm mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.62)' : '#64748b' }}>Sign in to see your CRT attendance</p>
                </div>

                <div className="mb-5 flex gap-2.5 items-start rounded-xl px-3.5 py-3 text-xs leading-relaxed"
                     style={{ background: ui.soft, border: `1px solid ${ui.edge}`, color: ui.ink, transition: 'all 1.2s ease' }}>
                  <svg className="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9.5" /><path strokeLinecap="round" d="M12 11v6M12 7.5v.01" /></svg>
                  <span><strong>First time logging in?</strong> Your password is your <strong>Registration No.</strong> (same as your ID). You’ll be asked to set a new password right after.</span>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {[
                    { label: 'Registration No.', type: 'text',     ph: 'Registration number',  val: username, set: setUsername, delay: '200ms' },
                    { label: 'Password',          type: 'password', ph: 'Enter your password',  val: password, set: setPassword, delay: '300ms' },
                  ].map(({ label, type, ph, val, set, delay }) => (
                    <div key={label} className="space-y-1.5" style={{ animation: ready ? `fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both` : 'none' }}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>{label}</label>
                        {type === 'password' && (
                          <button type="button" onClick={() => { setFpOpen(o => !o); setFpMsg(''); setFpRoll(''); }}
                            className="text-[11px] transition-colors duration-150" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#64748b' }}
                            onMouseEnter={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.7)' : '#334155'}
                            onMouseLeave={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.55)' : '#64748b'}>
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
                        autoFocus={type === 'text'}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-250"
                        style={isDark
                          ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(15,23,42,0.10)', color: '#0f172a' }}
                        onFocus={e => { e.target.style.borderColor = ui.dot; e.target.style.boxShadow = `0 0 0 3px ${ui.soft}`; e.target.style.background = isDark ? 'rgba(255,255,255,0.09)' : '#ffffff'; }}
                        onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.10)'; e.target.style.boxShadow = 'none'; e.target.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)'; }}
                      />
                    </div>
                  ))}

                  {error && (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20"
                         style={{ animation: 'fadeDown 0.3s ease both' }}>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl text-sm font-bold relative overflow-hidden transition-all duration-200 group"
                    style={{ animation: ready ? 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                             ...(loading
                               ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }
                               : ui.button),
                             transform: 'translateY(0)',
                             boxShadow: !loading ? `0 6px 22px ${ui.glow}` : 'none' }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 30px ${ui.glow}`; }}}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = !loading ? `0 6px 22px ${ui.glow}` : 'none'; }}>
                    {/* Shimmer sweep */}
                    {!loading && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                       style={{ background: 'linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.46) 50%,transparent 65%)', animation: 'shimmer 1.4s ease infinite' }} />}
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

                {/* Feedback */}
                <button type="button" onClick={() => { setFbOpen(o => !o); setFbStatus(''); setFbMsg(''); }}
                  className="w-full mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all duration-200"
                  style={{ border: isDark ? '1px dashed rgba(255,255,255,0.1)' : `1px dashed ${LBorder}`, color: isDark ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}
                  onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#faf8f5'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.46)' : '#c5bdb3'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : LBorder; }}>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <span>Feedback or suggestion?</span>
                  <svg className="w-3 h-3 ml-auto shrink-0 transition-transform duration-200" style={{ transform: fbOpen ? 'rotate(180deg)' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {fbOpen && (
                  <div className="mt-1 rounded-xl px-4 pb-4 pt-3" style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${LBorder}`, animation: 'fadeDown 0.25s ease both' }}>
                    {fbStatus === 'sent' ? (
                      <div className="text-center py-3">
                        <p className="text-sm font-semibold text-emerald-400 mb-1">Received!</p>
                        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#64748b' }}>Recorded anonymously. Thank you.</p>
                        <button onClick={() => { setFbOpen(false); setFbStatus(''); }} className="mt-2 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>Close</button>
                      </div>
                    ) : (
                      <form onSubmit={handleFeedback} className="space-y-3">
                        <textarea rows={3} maxLength={1000} placeholder="Your thoughts…" value={fbMsg} onChange={e => setFbMsg(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-xs outline-none resize-none"
                          style={isDark ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } : { background: '#faf8f5', border: `1px solid ${LBorder}`, color: '#0f172a' }} />
                        <div className="flex gap-2">
                          <button type="submit" disabled={fbLoading || !fbMsg.trim()} className="btn-primary flex-1 justify-center py-2 text-xs">{fbLoading ? 'Sending…' : 'Submit'}</button>
                          <button type="button" onClick={() => { setFbOpen(false); setFbMsg(''); }} className="px-3 py-2 text-xs rounded-lg" style={{ border: isDark ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${LBorder}`, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {fpOpen && (
                  <div className="mt-3 rounded-xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#faf8f5', border: isDark ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${LBorder}`, animation: 'fadeDown 0.3s ease both' }}>
                    {fpMsg === 'sent' ? (
                      <div className="text-center py-1">
                        <p className="text-sm font-semibold text-emerald-400 mb-1">Check your KL email!</p>
                        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>Reset link sent to <strong style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#1e293b' }}>@kluniversity.in</strong>. Expires in 2 min.</p>
                        <button onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }} className="mt-2 text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>Close</button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#0f172a' }}>Reset password</p>
                        <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#64748b' }}>Enter your reg. number. A link will be sent to your KL email.</p>
                        <input className="w-full px-3 py-2.5 rounded-lg text-xs outline-none" placeholder="Registration number" value={fpRoll} onChange={e => setFpRoll(e.target.value)} autoFocus
                          style={isDark ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } : { background: '#fff', border: `1px solid ${LBorder}`, color: '#0f172a' }} />
                        {fpMsg && fpMsg !== 'sent' && <p className="text-xs text-red-400">{fpMsg}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={fpLoading || !fpRoll.trim()} className="btn-primary flex-1 justify-center py-2 text-xs">{fpLoading ? 'Sending…' : 'Send link'}</button>
                          <button type="button" onClick={() => { setFpOpen(false); setFpMsg(''); setFpRoll(''); }} className="px-3 py-2 text-xs rounded-lg" style={{ border: isDark ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${LBorder}`, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Footer links */}
              <div className="mt-5 text-center" style={{ animation: ready ? 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
                <p className="text-[10px] mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.35)' }}>
                  Username = Registration No. · First-time password = Registration No.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {[['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
                    <a key={l} href={h} className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.46)' : 'rgba(15,23,42,0.3)' }}
                       onMouseEnter={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.6)'}
                       onMouseLeave={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.46)' : 'rgba(15,23,42,0.3)'}>{l}</a>
                  ))}
                </div>
              </div>
            </div>

            {/* Notices desktop */}
            {updates.length > 0 && (
              <div className="hidden lg:block w-80 shrink-0 self-center"
                   style={{ animation: ready ? 'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
                <div className="rounded-2xl overflow-hidden"
                     style={isDark
                       ? { background: 'linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
                       : { background: 'linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))', border: '1px solid rgba(255,255,255,0.75)', backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)', boxShadow: '0 20px 60px rgba(15,23,42,0.10)' }}>
                  <div className="px-5 py-3.5 flex items-center justify-between"
                       style={{ background: ui.soft, borderBottom: `1px solid ${ui.edge}`, transition: 'all 1.2s ease' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ui.dot }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ui.ink }}>Notices</span>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: ui.ink, opacity: 0.8 }}>{updates.length} items</span>
                  </div>
                  <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    {updates.map((u, i) => {
                      const cc = CAT_COLOR[u.category] || CAT_COLOR.info;
                      const cl = CAT_LABEL[u.category] || 'Info';
                      return (
                        <div key={u._id} className="px-5 py-3.5 transition-colors duration-150 cursor-default"
                             style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.06)' }}
                             onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: cc, background: `${cc}20`, padding: '2px 7px', borderRadius: '4px' }}>
                              {u.pinned ? '📌 ' : ''}{cl}
                            </span>
                            <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8', fontSize: '10px' }}>{fmtDate(u.createdAt)}</span>
                          </div>
                          {u.title && <p style={{ fontSize: '12px', fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a', marginBottom: '4px', lineHeight: '1.4' }}>{u.title}</p>}
                          <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.72)' : '#475569', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{u.content}</p>
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
