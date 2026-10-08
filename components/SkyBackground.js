'use client';
import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Time-of-day "flow" background.
 *
 *   dawn    05–07  soft pink / peach
 *   day     07–16  bright sunny yellow
 *   sunset  16–19  bright orange → rose
 *   night   19–05  moonlit indigo with stars
 *
 * The phase picks the hues; the site's light/dark mode picks how bright they
 * are, so text keeps its contrast in every combination.
 * Preview any phase with ?sky=dawn|day|sunset|night.
 */

export const SKY_PHASES = ['dawn', 'day', 'sunset', 'night'];

export function phaseForHour(h) {
  if (h >= 5 && h < 7)   return 'dawn';
  if (h >= 7 && h < 16)  return 'day';
  if (h >= 16 && h < 19) return 'sunset';
  return 'night';
}

export const GREETING = { dawn: 'Good morning', day: 'Good day', sunset: 'Good evening', night: 'Good night' };
export const WEATHER_CONDITIONS = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'storm'];

const toMin = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
/** Minutes since midnight in India time, whatever the device's time zone */
const nowMinIST = () => { const d = new Date(Date.now() + 5.5 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

/** Phase from the real sunrise / sunset at Vaddeswaram */
export function phaseForSun(now, sunrise, sunset) {
  const sr = toMin(sunrise), ss = toMin(sunset);
  if (now >= sr - 45 && now < sr + 60) return 'dawn';
  if (now >= sr + 60 && now < ss - 90) return 'day';
  if (now >= ss - 90 && now < ss + 30) return 'sunset';
  return 'night';
}

/**
 * Live sky: { phase, condition, weather } — phase follows today's sunrise/sunset,
 * condition follows the current weather at KL University (via /api/weather).
 * Falls back to clock-based phases and a clear sky if weather is unavailable.
 * Preview with ?sky=dawn|day|sunset|night and/or ?weather=clear|partly|cloudy|fog|rain|storm.
 */
function useSkyState(mode) {
  const [sky, setSky] = useState({ phase: null, condition: 'clear', weather: null });
  useEffect(() => {
    if (mode === 'skip') return;
    const q = new URLSearchParams(window.location.search);
    const forcedPhase = SKY_PHASES.includes(q.get('sky')) ? q.get('sky') : null;
    const forcedCond  = WEATHER_CONDITIONS.includes(q.get('weather')) ? q.get('weather') : null;
    let weather = null, alive = true;

    const compute = () => {
      if (!alive) return;
      const phase = forcedPhase
        || (weather ? phaseForSun(nowMinIST(), weather.sunrise, weather.sunset) : phaseForHour(Math.floor(nowMinIST() / 60)));
      setSky({ phase, condition: forcedCond || weather?.condition || 'clear', weather });
    };
    const load = () => fetch('/api/weather')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && !d.error) weather = d; })
      .catch(() => {})
      .finally(compute);

    compute();
    load();
    const tick = setInterval(compute, 60_000);
    const refresh = setInterval(load, 10 * 60_000);
    return () => { alive = false; clearInterval(tick); clearInterval(refresh); };
  }, [mode]);
  return sky;
}

const SkyContext = createContext(null);

/** Live sky shared by the whole site (falls back to its own state outside a SkyProvider) */
export function useSky() {
  const shared = useContext(SkyContext);
  const own = useSkyState(shared ? 'skip' : undefined);
  return shared || own;
}

function useIsDarkClass() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/**
 * Mount once in the root layout: draws the sky behind every page and shares
 * phase + weather (one /api/weather call for the whole site).
 */
export function SkyProvider({ children }) {
  const sky = useSkyState();
  const dark = useIsDarkClass();

  // One theme for the whole site: publish the sky's colours as CSS variables
  // (and re-point the existing --accent / --ring tokens at them).
  useEffect(() => {
    if (!sky.phase) return;
    const key = skyKey(sky);
    const u = UI[key], m = u[dark ? 'dark' : 'light'];
    const [ta, tb] = ACCENTS[key][dark ? 'dark' : 'light'];
    const vars = {
      '--sky-a': u.btn[0], '--sky-b': u.btn[1], '--sky-on': u.btnText, '--sky-glow': `${u.btn[0]}55`,
      '--sky-soft': m.soft, '--sky-edge': m.edge, '--sky-ink': m.ink, '--sky-dot': m.dot,
      '--sky-text-a': ta, '--sky-text-b': tb,
      '--accent': m.dot, '--accent-soft': m.soft, '--ring': m.soft,
    };
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(vars)) root.setProperty(k, v);
    document.documentElement.dataset.sky = key;
  }, [sky.phase, sky.condition, dark]);
  return (
    <SkyContext.Provider value={sky}>
      <SkyBackground dark={dark} sky={sky} />
      {children}
    </SkyContext.Provider>
  );
}

/**
 * Accent gradient for headline text, matched to the sky and weather.
 * Light-mode stops are dark enough to read on the pale skies; dark-mode stops are bright.
 */
const ACCENTS = {
  dawn:   { light: ['#e11d48', '#ea580c'], dark: ['#fda4af', '#fdba74'] },
  day:    { light: ['#ca8a04', '#ea580c'], dark: ['#fde047', '#fb923c'] },
  sunset: { light: ['#ea580c', '#db2777'], dark: ['#fdba74', '#f472b6'] },
  night:  { light: ['#4f46e5', '#7c3aed'], dark: ['#a5b4fc', '#c4b5fd'] },
  rain:   { light: ['#0369a1', '#475569'], dark: ['#7dd3fc', '#cbd5e1'] },
};
/**
 * UI colours matched to the sky/weather: primary button, tinted info boxes, focus rings.
 * Button text colour is picked per gradient so it stays readable (e.g. dark text on daytime amber).
 */
const UI = {
  dawn:   { btn: ['#e11d48', '#c2410c'], btnText: '#ffffff',
            light: { soft: 'rgba(244,63,94,0.10)',  edge: 'rgba(225,29,72,0.28)',  ink: '#881337', dot: '#e11d48' },
            dark:  { soft: 'rgba(244,63,94,0.14)',  edge: 'rgba(253,164,175,0.35)', ink: '#fecdd3', dot: '#fb7185' } },
  day:    { btn: ['#fbbf24', '#f59e0b'], btnText: '#422006',
            light: { soft: 'rgba(251,191,36,0.16)', edge: 'rgba(217,119,6,0.35)',  ink: '#78350f', dot: '#d97706' },
            dark:  { soft: 'rgba(251,191,36,0.12)', edge: 'rgba(251,191,36,0.38)', ink: '#fde68a', dot: '#fbbf24' } },
  sunset: { btn: ['#c2410c', '#be123c'], btnText: '#ffffff',
            light: { soft: 'rgba(249,115,22,0.12)', edge: 'rgba(234,88,12,0.32)',  ink: '#7c2d12', dot: '#ea580c' },
            dark:  { soft: 'rgba(249,115,22,0.14)', edge: 'rgba(253,186,116,0.38)', ink: '#fed7aa', dot: '#fb923c' } },
  night:  { btn: ['#4f46e5', '#7c3aed'], btnText: '#ffffff',
            light: { soft: 'rgba(99,102,241,0.10)', edge: 'rgba(79,70,229,0.30)',  ink: '#312e81', dot: '#4f46e5' },
            dark:  { soft: 'rgba(129,140,248,0.14)', edge: 'rgba(165,180,252,0.38)', ink: '#c7d2fe', dot: '#a5b4fc' } },
  rain:   { btn: ['#0369a1', '#334155'], btnText: '#ffffff',
            light: { soft: 'rgba(14,165,233,0.10)', edge: 'rgba(3,105,161,0.30)',  ink: '#0c4a6e', dot: '#0284c7' },
            dark:  { soft: 'rgba(56,189,248,0.12)', edge: 'rgba(125,211,252,0.38)', ink: '#bae6fd', dot: '#38bdf8' } },
};
export function skyUI(sky, dark) {
  const key = ['rain', 'storm'].includes(sky?.condition) ? 'rain' : (sky?.phase || 'day');
  const u = UI[key];
  return {
    ...u[dark ? 'dark' : 'light'],
    button: { backgroundImage: `linear-gradient(135deg, ${u.btn[0]}, ${u.btn[1]})`, color: u.btnText },
    glow: `${u.btn[0]}55`,
  };
}

const skyKey = sky => (['rain', 'storm'].includes(sky?.condition) ? 'rain' : (sky?.phase || 'day'));

export function skyAccent(sky, dark) {
  const [a, b] = ACCENTS[skyKey(sky)][dark ? 'dark' : 'light'];
  return {
    backgroundImage: `linear-gradient(90deg, ${a}, ${b})`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
    WebkitTextFillColor: 'transparent', color: 'transparent',
    transition: 'background-image 1.2s ease',
  };
}

const THEMES = {
  dawn: {
    light: { base: 'linear-gradient(180deg,#fff1f0 0%,#fff6ee 55%,#faf8f5 100%)', blobs: ['rgba(251,113,133,0.38)', 'rgba(253,186,116,0.45)', 'rgba(196,181,253,0.30)'], wave: 'rgba(225,29,72,0.16)' },
    dark:  { base: 'linear-gradient(180deg,#140a10 0%,#0a0608 60%,#000 100%)',  blobs: ['rgba(244,63,94,0.26)', 'rgba(251,146,60,0.22)', 'rgba(167,139,250,0.18)'], wave: 'rgba(253,164,175,0.16)' },
  },
  day: {
    light: { base: 'linear-gradient(180deg,#fff7cc 0%,#fffbea 50%,#faf8f5 100%)', blobs: ['rgba(253,224,71,0.60)', 'rgba(251,191,36,0.38)', 'rgba(125,211,252,0.32)'], wave: 'rgba(202,138,4,0.20)' },
    dark:  { base: 'linear-gradient(180deg,#0f0c02 0%,#070601 60%,#000 100%)',  blobs: ['rgba(234,179,8,0.26)', 'rgba(245,158,11,0.18)', 'rgba(56,189,248,0.14)'], wave: 'rgba(253,224,71,0.16)' },
  },
  sunset: {
    light: { base: 'linear-gradient(180deg,#ffe7d6 0%,#ffeee6 50%,#faf8f5 100%)', blobs: ['rgba(251,146,60,0.58)', 'rgba(244,63,94,0.36)', 'rgba(168,85,247,0.24)'], wave: 'rgba(234,88,12,0.20)' },
    dark:  { base: 'linear-gradient(180deg,#160904 0%,#0a0402 60%,#000 100%)',  blobs: ['rgba(249,115,22,0.32)', 'rgba(225,29,72,0.24)', 'rgba(147,51,234,0.18)'], wave: 'rgba(251,146,60,0.18)' },
  },
  night: {
    light: { base: 'linear-gradient(180deg,#eceffd 0%,#f3f1fb 55%,#faf8f5 100%)', blobs: ['rgba(129,140,248,0.36)', 'rgba(196,181,253,0.32)', 'rgba(148,163,184,0.26)'], wave: 'rgba(79,70,229,0.15)' },
    dark:  { base: 'linear-gradient(180deg,#060a1c 0%,#050714 55%,#000 100%)',  blobs: ['rgba(79,70,229,0.30)', 'rgba(30,64,175,0.28)', 'rgba(148,163,184,0.10)'], wave: 'rgba(165,180,252,0.18)' },
  },
};

// Deterministic star field (same on every render)
const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: `${(i * 37.7) % 100}%`,
  top:  `${(i * 23.3 + (i % 5) * 7) % 62}%`,
  size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  delay: `${(i % 9) * 0.6}s`,
}));

const CLOUDS = [
  { top: '8vh',  w: 340, dur: 95,  delay: -10 },
  { top: '26vh', w: 260, dur: 120, delay: -60 },
  { top: '15vh', w: 420, dur: 140, delay: -95 },
  { top: '40vh', w: 300, dur: 110, delay: -35 },
];
const DROPS = Array.from({ length: 70 }, (_, i) => ({
  left: `${(i * 14.3) % 110}%`, h: 14 + (i % 4) * 6,
  dur: 0.55 + (i % 5) * 0.12, delay: -((i * 0.137) % 1.2),
}));

const CSS = `
@keyframes skyDriftA { 0% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(6%,4%,0) scale(1.08) } 100% { transform: translate3d(0,0,0) scale(1) } }
@keyframes skyDriftB { 0% { transform: translate3d(0,0,0) scale(1.05) } 50% { transform: translate3d(-7%,3%,0) scale(0.95) } 100% { transform: translate3d(0,0,0) scale(1.05) } }
@keyframes skyWave   { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
@keyframes skyTwinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
@keyframes skyGlow   { 0%,100% { opacity: .85; transform: scale(1) } 50% { opacity: 1; transform: scale(1.06) } }
.sky-a { animation: skyDriftA 22s ease-in-out infinite }
.sky-b { animation: skyDriftB 28s ease-in-out infinite }
.sky-wave { animation: skyWave 38s linear infinite }
.sky-wave-slow { animation: skyWave 60s linear infinite }
.sky-star { animation: skyTwinkle 3.6s ease-in-out infinite }
.sky-glow { animation: skyGlow 7s ease-in-out infinite }
@keyframes skyCloud { 0% { transform: translateX(-30vw) } 100% { transform: translateX(130vw) } }
@keyframes skyRain  { 0% { transform: translate3d(0,-20vh,0) } 100% { transform: translate3d(-8vw,120vh,0) } }
@keyframes skyFlash { 0%, 89%, 93%, 100% { opacity: 0 } 90%, 92% { opacity: .55 } 91% { opacity: .15 } }
@keyframes skyMist  { 0%,100% { transform: translateX(-4%) } 50% { transform: translateX(4%) } }
.sky-cloud { animation: skyCloud linear infinite }
.sky-drop  { animation: skyRain linear infinite }
.sky-flash { animation: skyFlash 9s ease-out infinite }
.sky-mist  { animation: skyMist 18s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) {
  .sky-a,.sky-b,.sky-wave,.sky-wave-slow,.sky-star,.sky-glow,.sky-cloud,.sky-mist,.sky-flash { animation: none !important }
  .sky-drop { animation: none !important; top: var(--drop-top) !important }
}
`;

// One wave period is 720 wide; drawing two periods lets translateX(-50%) loop seamlessly
const wavePath = (y, amp) =>
  `M0 ${y} C 120 ${y - amp}, 240 ${y + amp}, 360 ${y} S 600 ${y - amp}, 720 ${y} S 960 ${y + amp}, 1080 ${y} S 1320 ${y - amp}, 1440 ${y}`;

export default function SkyBackground({ dark = false, sky }) {
  const { phase, condition } = sky || {};
  if (!phase) return null;
  const t = THEMES[phase][dark ? 'dark' : 'light'];
  const clouds = condition === 'partly' ? 2 : ['cloudy', 'rain', 'storm', 'fog'].includes(condition) ? 4 : 0;
  const overcast = ['cloudy', 'rain', 'storm', 'fog'].includes(condition);
  const cloudColor = dark ? 'rgba(148,163,184,0.20)' : 'rgba(255,255,255,0.85)';

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden"
         style={{ background: t.base, transition: 'background 1.2s ease', zIndex: -1 }}>
      <style>{CSS}</style>

      {/* Flowing colour fields */}
      <div className="sky-a absolute rounded-full" style={{ width: '62vmax', height: '62vmax', left: '-18vmax', top: '-26vmax', background: `radial-gradient(circle, ${t.blobs[0]} 0%, transparent 66%)`, filter: 'blur(30px)' }} />
      <div className="sky-b absolute rounded-full" style={{ width: '54vmax', height: '54vmax', right: '-20vmax', top: '-6vmax', background: `radial-gradient(circle, ${t.blobs[1]} 0%, transparent 66%)`, filter: 'blur(36px)' }} />
      <div className="sky-a absolute rounded-full" style={{ width: '46vmax', height: '46vmax', left: '22vw', bottom: '-24vmax', background: `radial-gradient(circle, ${t.blobs[2]} 0%, transparent 66%)`, filter: 'blur(40px)', animationDelay: '-8s' }} />

      {/* Sun / moon */}
      {phase === 'day' && !overcast && (
        <div className="sky-glow absolute rounded-full" style={{ width: 220, height: 220, right: '8vw', top: '6vh',
          background: dark ? 'radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(253,224,71,0.12) 45%, transparent 70%)'
                           : 'radial-gradient(circle, #fde047 0%, rgba(253,224,71,0.55) 34%, rgba(253,224,71,0) 70%)' }} />
      )}
      {phase === 'sunset' && condition !== 'storm' && (
        <div className="sky-glow absolute rounded-full" style={{ width: 380, height: 380, right: '6vw', bottom: '-170px',
          background: dark ? 'radial-gradient(circle, rgba(251,146,60,0.6) 0%, rgba(244,63,94,0.25) 45%, transparent 70%)'
                           : 'radial-gradient(circle, #fb923c 0%, rgba(251,113,133,0.55) 38%, rgba(251,146,60,0) 70%)' }} />
      )}
      {phase === 'dawn' && (
        <div className="sky-glow absolute rounded-full" style={{ width: 300, height: 300, left: '8vw', bottom: '-140px',
          background: 'radial-gradient(circle, rgba(253,186,116,0.75) 0%, rgba(251,113,133,0.3) 45%, transparent 70%)' }} />
      )}
      {phase === 'night' && !overcast && (
        <>
          {STARS.map((s, i) => (
            <span key={i} className="sky-star absolute rounded-full"
                  style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay,
                           background: dark ? '#e2e8f0' : 'rgba(79,70,229,0.55)' }} />
          ))}
          <div className="sky-glow absolute rounded-full" style={{ width: 180, height: 180, right: 'calc(8vw - 50px)', top: 'calc(7vh - 50px)',
            background: `radial-gradient(circle, ${dark ? 'rgba(199,210,254,0.30)' : 'rgba(129,140,248,0.25)'} 0%, transparent 65%)` }} />
          {/* Crescent: a lit disc with an offset inner shadow */}
          <div className="absolute rounded-full" style={{ width: 80, height: 80, right: '8vw', top: '7vh',
            boxShadow: `inset -20px 6px 0 0 ${dark ? '#e0e7ff' : '#a5b4fc'}`, transform: 'rotate(-20deg)' }} />
        </>
      )}

      {/* Flow lines */}
      <svg className="absolute left-0 w-[200%] sky-wave" style={{ top: '18vh', height: 260 }} viewBox="0 0 1440 260" preserveAspectRatio="none" fill="none">
        <path d={wavePath(90, 55)}  stroke={t.wave} strokeWidth="1.6" />
        <path d={wavePath(130, 55)} stroke={t.wave} strokeWidth="1.2" />
        <path d={wavePath(170, 55)} stroke={t.wave} strokeWidth="1" />
      </svg>
      <svg className="absolute left-0 w-[200%] sky-wave-slow" style={{ bottom: '8vh', height: 220 }} viewBox="0 0 1440 220" preserveAspectRatio="none" fill="none">
        <path d={wavePath(80, 45)}  stroke={t.wave} strokeWidth="1.2" />
        <path d={wavePath(120, 45)} stroke={t.wave} strokeWidth="1" />
      </svg>

      {/* ── Weather ── */}
      {overcast && (
        <div className="absolute inset-0" style={{ background: dark ? 'rgba(15,23,42,0.35)' : 'rgba(148,163,184,0.22)', transition: 'background 1.2s ease' }} />
      )}
      {CLOUDS.slice(0, clouds).map((c, i) => (
        <div key={i} className="sky-cloud absolute" style={{ top: c.top, left: 0, width: c.w, height: c.w * 0.42,
             animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <div className="absolute rounded-full" style={{ left: '8%',  top: '35%', width: '50%', height: '65%', background: cloudColor, filter: 'blur(14px)' }} />
          <div className="absolute rounded-full" style={{ left: '30%', top: '5%',  width: '45%', height: '85%', background: cloudColor, filter: 'blur(14px)' }} />
          <div className="absolute rounded-full" style={{ left: '52%', top: '30%', width: '42%', height: '62%', background: cloudColor, filter: 'blur(14px)' }} />
        </div>
      ))}
      {condition === 'fog' && [22, 48, 72].map((top, i) => (
        <div key={i} className="sky-mist absolute left-[-10%] w-[120%]" style={{ top: `${top}vh`, height: '14vh', animationDelay: `${-i * 5}s`,
             background: `linear-gradient(90deg, transparent, ${dark ? 'rgba(203,213,225,0.10)' : 'rgba(255,255,255,0.65)'} 30%, ${dark ? 'rgba(203,213,225,0.10)' : 'rgba(255,255,255,0.65)'} 70%, transparent)`,
             filter: 'blur(18px)' }} />
      ))}
      {(condition === 'rain' || condition === 'storm') && DROPS.map((d, i) => (
        <span key={i} className="sky-drop absolute top-0" style={{ left: d.left, '--drop-top': `${(i * 37) % 100}vh`, width: 2, height: d.h + 6, borderRadius: 2,
              background: dark ? 'rgba(186,230,253,0.6)' : 'rgba(51,65,85,0.45)', transform: 'rotate(12deg)',
              animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
      ))}
      {condition === 'storm' && (
        <div className="sky-flash absolute inset-0" style={{ background: dark ? '#e0e7ff' : '#ffffff' }} />
      )}
    </div>
  );
}
