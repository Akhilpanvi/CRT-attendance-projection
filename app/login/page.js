'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LOGO_RED, LOGO_WHITE } from '@/lib/logos';
import ThemeToggle from '@/components/ThemeToggle';
import { motion } from 'framer-motion';

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
const CAT_COLOR = { info: '#3b82f6', warning: '#d97706', important: '#dc2626' };
const CAT_LABEL = { info: 'Info', warning: 'Warning', important: 'Important' };

// Floating particle dot
function Particle({ style }) {
  return <div className="absolute w-1 h-1 rounded-full" style={{ ...style, animation: `particleRise ${3 + Math.random() * 4}s ease-out infinite` }} />;
}

// Theme-aware splash screen
function Splash({ onDone }) {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [bar, setBar] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBar(100), 80);
    const t2 = setTimeout(() => setOut(true), 1700);
    const t3 = setTimeout(onDone, 2100);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ${out ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
         style={{ background: dark ? 'linear-gradient(135deg,#070c18 0%,#0d1425 60%,#060a15 100%)' : 'linear-gradient(135deg,#faf8f5 0%,#f0ebe3 60%,#faf8f5 100%)' }}>

      {/* Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-80 h-80 rounded-full" style={{
          background: dark ? 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(180,150,100,0.2) 0%, transparent 70%)',
          top: '15%', left: '20%', filter: 'blur(40px)', animation: 'orbFloat 8s ease-in-out infinite'
        }} />
        <div className="absolute w-64 h-64 rounded-full" style={{
          background: dark ? 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(200,160,80,0.15) 0%, transparent 70%)',
          bottom: '20%', right: '20%', filter: 'blur(50px)', animation: 'orbFloat2 10s ease-in-out infinite'
        }} />
      </div>

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
        <p className="text-sm" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)' }}>Y-23 · KL University</p>
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-40 h-0.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)', animation: 'fadeUp 0.4s ease 0.55s both' }}>
        <div className="h-full rounded-full transition-all duration-[1400ms] ease-out relative overflow-hidden"
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

  // Particle positions — stable
  const particles = useRef([...Array(12)].map((_, i) => ({
    left: `${8 + (i * 7.5) % 84}%`,
    top:  `${15 + (i * 11) % 70}%`,
    animationDelay: `${i * 0.4}s`,
    background: isDark ? `rgba(${[96,165,250][i%3]},${[130,92,139][i%3]},${[250,246,250][i%3]},0.25)` : `rgba(180,140,80,0.2)`,
  })));

  const features = [
    { icon: '📊', title: 'Live Attendance',   sub: 'Real-time tracking with weekly breakdown and projections' },
    { icon: '🎯', title: 'Smart Planner',     sub: 'Know exactly how many sessions you can skip or need to attend' },
    { icon: '📈', title: 'Self Progression',  sub: 'Track your own sessions and see projected percentage instantly' },
  ];

  // Light mode colors
  const LBG   = '#faf8f5';
  const LCard = '#ffffff';
  const LBorder = '#ede9e3';

  return (
    <>
      {showSplash && <Splash onDone={() => { setShowSplash(false); setTimeout(() => setReady(true), 60); }} />}

      <div className={`min-h-[100dvh] flex transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
           style={{ background: isDark ? 'linear-gradient(135deg,#070c18 0%,#0d1425 55%,#060a14 100%)' : `linear-gradient(135deg,${LBG} 0%,#f0ebe3 50%,${LBG} 100%)` }}>

        {/* Animated orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute rounded-full" style={{
            width: 700, height: 700,
            background: isDark ? 'radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(180,140,80,0.12) 0%,transparent 65%)',
            top: '-15%', left: '-8%', filter: 'blur(60px)', animation: 'orbFloat 14s ease-in-out infinite'
          }} />
          <div className="absolute rounded-full" style={{
            width: 550, height: 550,
            background: isDark ? 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(200,160,90,0.1) 0%,transparent 65%)',
            bottom: '-10%', right: '5%', filter: 'blur(70px)', animation: 'orbFloat2 18s ease-in-out infinite'
          }} />
          <div className="absolute rounded-full" style={{
            width: 350, height: 350,
            background: isDark ? 'radial-gradient(circle,rgba(16,185,129,0.1) 0%,transparent 65%)' : 'radial-gradient(circle,rgba(150,190,120,0.08) 0%,transparent 65%)',
            top: '45%', right: '35%', filter: 'blur(80px)', animation: 'orbFloat3 22s ease-in-out infinite 4s'
          }} />
          {/* Particles — dark only */}
          {isDark && particles.current.map((p, i) => <Particle key={i} style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, background: p.background }} />)}
        </div>

        {/* ── Left panel ── */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-12 relative overflow-hidden"
             style={isDark ? { borderRight: '1px solid rgba(255,255,255,0.06)' } : { borderRight: `1px solid ${LBorder}` }}>

          <div style={{ animation: ready ? 'fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 80ms both' : 'none' }}>
            <div className="inline-flex items-center mb-10"
                 style={{ animation: ready ? 'scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) both' : 'none' }}>
              <img src={isDark ? LOGO_WHITE : LOGO_RED} alt="KL University"
                   className="h-14 w-auto block"
                   style={isDark ? {} : { mixBlendMode: 'multiply' }} />
            </div>
            <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-tight mb-3">
              <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>CRT Attendance</span><br />
              <span className="text-gradient-blue">Tracker</span>
            </h1>
            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.5)' }}>
              Y-23 Summer CRT Training · KL University
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-2.5 flex-1 flex flex-col justify-center my-8">
            {features.map((f, i) => (
              <motion.div key={f.title} className="rounded-xl px-4 py-3.5 flex items-start gap-3 group"
                   style={{
                     background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                     border: isDark ? '1px solid rgba(255,255,255,0.07)' : `1px solid ${LBorder}`,
                     backdropFilter: 'blur(8px)',
                   }}
                   initial={ready ? { opacity: 0, y: 14 } : false}
                   animate={ready ? { opacity: 1, y: 0 } : false}
                   transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.11 }}
                   whileHover={{ x: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.92)' }}>
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#1e293b' }}>{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.5)' }}>{f.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-[10px] leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.3)', animation: ready ? 'fadeUp 0.5s ease 650ms both' : 'none' }}>
            Made by{' '}
            <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer"
               style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.5)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Akhil Panvi
            </a>
            {' '}· Y-23 · KL University
          </p>
        </div>

        {/* ── Right ── */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex justify-end p-4 relative z-10">
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center justify-center gap-12 px-6 pb-10">

            {/* Form */}
            <div className="w-full max-w-sm shrink-0"
                 style={{ animation: ready ? 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 120ms both' : 'none' }}>

              {/* Mobile logo */}
              <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <img src={isDark ? LOGO_WHITE : LOGO_RED} alt="KL"
                     className="h-9 w-auto block"
                     style={isDark ? {} : { mixBlendMode: 'multiply' }} />
                <span className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>CRT Attendance Tracker</span>
              </div>

              {/* Mobile notices */}
              {updates.length > 0 && (
                <div className="lg:hidden mb-6 rounded-xl overflow-hidden"
                     style={{ background: isDark ? 'rgba(255,255,255,0.04)' : LCard, border: isDark ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${LBorder}` }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${LBorder}` }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}>Notices</span>
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
                     ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }
                     : { background: LCard, border: `1px solid ${LBorder}`, boxShadow: '0 8px 50px rgba(0,0,0,0.07)' }}>

                {/* Top card shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px"
                     style={{ background: isDark ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' : 'linear-gradient(90deg,transparent,rgba(0,0,0,0.05),transparent)' }} />

                <div className="mb-7">
                  <h2 className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Welcome back</h2>
                  <p className="text-sm mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.42)' : '#64748b' }}>Sign in to view your attendance</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {[
                    { label: 'Registration No.', type: 'text',     ph: 'Registration number',  val: username, set: setUsername, delay: '200ms' },
                    { label: 'Password',          type: 'password', ph: 'Enter your password',  val: password, set: setPassword, delay: '300ms' },
                  ].map(({ label, type, ph, val, set, delay }) => (
                    <div key={label} className="space-y-1.5" style={{ animation: ready ? `fadeUp 0.5s ease ${delay} both` : 'none' }}>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDark ? 'rgba(255,255,255,0.38)' : '#64748b' }}>{label}</label>
                        {type === 'password' && (
                          <button type="button" onClick={() => { setFpOpen(o => !o); setFpMsg(''); setFpRoll(''); }}
                            className="text-[11px] transition-colors duration-150" style={{ color: isDark ? 'rgba(255,255,255,0.32)' : '#64748b' }}
                            onMouseEnter={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.7)' : '#334155'}
                            onMouseLeave={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.32)' : '#64748b'}>
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
                        autoFocus={type === 'text'}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-250"
                        style={isDark
                          ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
                          : { background: '#faf8f5', border: `1px solid ${LBorder}`, color: '#0f172a' }}
                        onFocus={e => { e.target.style.borderColor = isDark ? 'rgba(96,165,250,0.7)' : '#93c5fd'; e.target.style.boxShadow = isDark ? '0 0 0 3px rgba(59,130,246,0.12)' : '0 0 0 3px rgba(59,130,246,0.08)'; e.target.style.background = isDark ? 'rgba(255,255,255,0.09)' : '#ffffff'; }}
                        onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : LBorder; e.target.style.boxShadow = 'none'; e.target.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#faf8f5'; }}
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
                    style={{ animation: ready ? 'fadeUp 0.5s ease 400ms both' : 'none',
                             background: loading ? (isDark ? 'rgba(255,255,255,0.08)' : '#e9e5df') : (isDark ? '#ffffff' : '#1e293b'),
                             color: loading ? (isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8') : (isDark ? '#0f172a' : '#ffffff'),
                             transform: 'translateY(0)',
                             boxShadow: !loading ? (isDark ? '0 4px 20px rgba(255,255,255,0.08)' : '0 4px 20px rgba(15,23,42,0.15)') : 'none' }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isDark ? '0 8px 30px rgba(255,255,255,0.15)' : '0 8px 30px rgba(15,23,42,0.2)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = !loading ? (isDark ? '0 4px 20px rgba(255,255,255,0.08)' : '0 4px 20px rgba(15,23,42,0.15)') : 'none'; }}>
                    {/* Shimmer sweep */}
                    {!loading && <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                       style={{ background: 'linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.2) 50%,transparent 65%)', animation: 'shimmer 1.4s ease infinite' }} />}
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
                  style={{ border: isDark ? '1px dashed rgba(255,255,255,0.1)' : `1px dashed ${LBorder}`, color: isDark ? 'rgba(255,255,255,0.32)' : '#94a3b8' }}
                  onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#faf8f5'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : '#c5bdb3'; }}
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
              <div className="mt-5 text-center" style={{ animation: ready ? 'fadeUp 0.5s ease 550ms both' : 'none' }}>
                <p className="text-[10px] mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.35)' }}>
                  Use your registration number as username · First login prompts a password change
                </p>
                <div className="flex items-center justify-center gap-3">
                  {[['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
                    <a key={l} href={h} className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.3)' }}
                       onMouseEnter={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.6)'}
                       onMouseLeave={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.3)'}>{l}</a>
                  ))}
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.2)', fontSize: '10px' }}>·</span>
                  <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer" className="text-[10px] transition-colors" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.3)' }}
                     onMouseEnter={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.6)'}
                     onMouseLeave={e => e.target.style.color = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.3)'}>Akhil Panvi</a>
                </div>
              </div>
            </div>

            {/* Notices desktop */}
            {updates.length > 0 && (
              <div className="hidden lg:block w-80 shrink-0 self-center"
                   style={{ animation: ready ? 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 220ms both' : 'none' }}>
                <div className="rounded-2xl overflow-hidden"
                     style={isDark
                       ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
                       : { background: LCard, border: `1px solid ${LBorder}`, boxShadow: '0 8px 50px rgba(0,0,0,0.06)' }}>
                  <div className="px-5 py-3.5 flex items-center justify-between"
                       style={{ background: isDark ? 'rgba(255,255,255,0.025)' : '#f8f5f1', borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${LBorder}` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#475569' }}>Notices</span>
                    </div>
                    <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>{updates.length} items</span>
                  </div>
                  <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    {updates.map((u, i) => {
                      const cc = CAT_COLOR[u.category] || CAT_COLOR.info;
                      const cl = CAT_LABEL[u.category] || 'Info';
                      return (
                        <div key={u._id} className="px-5 py-3.5 transition-colors duration-150 cursor-default"
                             style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${LBorder}` }}
                             onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#faf8f5'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: cc, background: `${cc}20`, padding: '2px 7px', borderRadius: '4px' }}>
                              {u.pinned ? '📌 ' : ''}{cl}
                            </span>
                            <span style={{ color: isDark ? 'rgba(255,255,255,0.22)' : '#94a3b8', fontSize: '10px' }}>{fmtDate(u.createdAt)}</span>
                          </div>
                          {u.title && <p style={{ fontSize: '12px', fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.88)' : '#0f172a', marginBottom: '4px', lineHeight: '1.4' }}>{u.title}</p>}
                          <p style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.45)' : '#475569', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{u.content}</p>
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
