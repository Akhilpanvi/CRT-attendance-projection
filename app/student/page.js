'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LOGO_RED, LOGO_WHITE } from '@/lib/logos';
import { TIME_SLOTS } from '@/lib/helpers';
import { CLUSTER_DAYS, clusterDaysLabel } from '@/lib/attendanceCalc';
import ThemeToggle from '@/components/ThemeToggle';
import ChatWidget from '@/components/ChatWidget';
import useScrolled from '@/components/useScrolled';
import { useSky, GREETING } from '@/components/SkyBackground';

// ── Tokens (light / dark) ───────────────────────────────────────────────────
const TOK = {
  light: {
    fg: '#0f172a', muted: '#475569', glass: 'rgba(255,255,255,0.80)', sheet: '#ffffff', well: 'rgba(15,23,42,0.05)',
    line: 'rgba(15,23,42,0.09)', track: 'rgba(15,23,42,0.08)', shadow: '0 10px 30px rgba(15,23,42,0.07)',
    chipSoft: 'var(--sky-soft)', chipInk: 'var(--sky-ink)',
    ok: '#15803d', okBar: '#16a34a', okHi: '#4ade80', okSoft: '#dcfce7', okGlow: 'rgba(22,163,74,0.35)', spHi: '#fde047',
    badStripe: 'rgba(239,68,68,0.35)', badEdge: 'rgba(220,38,38,0.55)', heatMiss: '#fecaca',
    warn: '#b45309', warnBar: '#f59e0b', warnSoft: '#fef3c7', warnGlow: 'rgba(245,158,11,0.35)',
    bad: '#b91c1c', badBar: '#ef4444', badSoft: '#fee2e2', badGlow: 'rgba(239,68,68,0.35)',
    sp: '#eab308', self: 'var(--sky-ink)', selfSoft: 'var(--sky-soft)', pendingBg: 'rgba(251,191,36,0.14)', holidayBg: 'rgba(15,23,42,0.03)',
  },
  dark: {
    fg: '#f8fafc', muted: '#cbd5e1', glass: 'rgba(17,21,34,0.74)', sheet: '#121726', well: 'rgba(255,255,255,0.07)',
    line: 'rgba(255,255,255,0.12)', track: 'rgba(255,255,255,0.10)', shadow: '0 12px 36px rgba(0,0,0,0.45)',
    chipSoft: 'var(--sky-soft)', chipInk: 'var(--sky-ink)',
    ok: '#4ade80', okBar: '#16a34a', okHi: '#4ade80', okSoft: 'rgba(34,197,94,0.16)', okGlow: 'rgba(74,222,128,0.35)', spHi: '#fef08a',
    badStripe: 'rgba(248,113,113,0.45)', badEdge: 'rgba(248,113,113,0.7)', heatMiss: 'rgba(248,113,113,0.22)',
    warn: '#fcd34d', warnBar: '#f59e0b', warnSoft: 'rgba(245,158,11,0.18)', warnGlow: 'rgba(252,211,77,0.5)',
    bad: '#fca5a5', badBar: '#f87171', badSoft: 'rgba(239,68,68,0.18)', badGlow: 'rgba(248,113,113,0.5)',
    sp: '#facc15', self: 'var(--sky-ink)', selfSoft: 'var(--sky-soft)', pendingBg: 'rgba(245,158,11,0.10)', holidayBg: 'rgba(255,255,255,0.03)',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const utc = d => new Date(d + 'T00:00:00Z');
const dayLabel = d => { const x = utc(d); return `${DAY[x.getUTCDay()]} ${String(x.getUTCDate()).padStart(2, '0')} ${MON[x.getUTCMonth()]}`; };
const shortDate = d => { const x = utc(d); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
const todayIST = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(utc(d).getTime() + n * 86400000).toISOString().slice(0, 10);
const weekStart = d => addDays(d, -((utc(d).getUTCDay() + 6) % 7)); // Monday

function useIsDark() {
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

/** Where the student stands against 75% (minimum) and 85% (goal) */
function standing(present, total) {
  if (!total) return { tone: 'none', pct: 0, canMiss: 0, need75: 0, need85: 0 };
  const pct = Math.round(present / total * 100);
  const canMiss = Math.max(0, Math.floor(present / 0.75 - total));
  const need75 = Math.max(0, Math.ceil((0.75 * total - present) / 0.25));
  const need85 = Math.max(0, Math.ceil((0.85 * total - present) / 0.15));
  const tone = present / total >= 0.75 ? (canMiss >= 4 ? 'ok' : 'warn') : 'bad';
  return { tone, pct, canMiss, need75, need85 };
}

// ── Small pieces ────────────────────────────────────────────────────────────
const Glass = ({ t, className = '', style, children, as: Tag = 'section', ...rest }) => (
  <Tag className={`glass ${className}`} style={style} {...rest}>{children}</Tag>
);

const InfoIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9.5" /><path d="M12 11v6" /><path d="M12 7.5v.01" />
  </svg>
);

function Ring({ pct, color, glow, t, size = 148 }) {
  const C = 2 * Math.PI * 62;
  // Threshold markers sit ON the ring as dots (a tick beside the number read like a minus sign)
  const dot = f => {
    const a = f * 2 * Math.PI - Math.PI / 2;
    return { cx: 74 + Math.cos(a) * 62, cy: 74 + Math.sin(a) * 62 };
  };
  return (
    <svg width={size} height={size} viewBox="0 0 148 148" aria-hidden="true">
      <circle cx="74" cy="74" r="62" fill="none" stroke={t.track} strokeWidth="13" />
      <circle cx="74" cy="74" r="62" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 74 74)"
              style={{ filter: `drop-shadow(0 0 6px ${glow})`, transition: 'stroke-dasharray 0.9s ease' }} />
      <circle {...dot(0.85)} r="4.5" fill={t.muted} stroke={t.sheet} strokeWidth="2" />
      <circle {...dot(0.75)} r="5.5" fill={t.fg} stroke={t.sheet} strokeWidth="2" />
    </svg>
  );
}

const SEG_CSS = `
@keyframes cellIn { from { transform: scale(.4); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.heat-cell { animation: cellIn .35s cubic-bezier(.34,1.56,.64,1) both }
.heat-row { --cell: 21px; --sq: 17px; --lunch: 8px }
@media (max-width: 379px) { .heat-row { --cell: 18px; --sq: 14px; --lunch: 6px } }
@media (min-width: 640px)  { .heat-row { --cell: 30px; --sq: 20px; --lunch: 12px } }
@media (min-width: 1024px) { .heat-row { --cell: 40px; --sq: 22px } }
@media (prefers-reduced-motion: reduce) { .heat-cell { animation: none } }
`;

const STATUS_WORD = { present: 'Present', sp: 'Permission', absent: 'Missed' };
const attended = m => m === 'present' || m === 'sp';
/** Split a day's sessions into morning / afternoon halves (lunch gap between) */
const halves = list => (list.length >= 6 ? [list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))] : [list]);

/** Heat square for one session */
function heatStyle(m, t, faded) {
  const base = { width: 'var(--sq)', height: 'var(--sq)', borderRadius: 6, boxSizing: 'border-box', opacity: faded ? 0.5 : 1 };
  if (m === 'present') return { ...base, background: t.okBar, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)' };
  if (m === 'sp')      return { ...base, background: t.sp, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.10)' };
  if (m === 'absent')  return { ...base, background: t.heatMiss, boxShadow: `inset 0 0 0 1.5px ${t.badBar}` };
  return { ...base, border: `1.5px dashed ${t.line}` };
}

/** Grid used by both the day rows and the time header so columns line up */
const halfGrid = n => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, var(--cell))` });

/** A CRT day as heat squares: 4 morning + 4 afternoon with a lunch gap */
function Segments({ marks, slots, t, faded, animate }) {
  let idx = 0;
  return (
    <div className="heat-row flex-1 min-w-0 flex items-center" style={{ gap: 'var(--lunch)' }}>
      {halves(marks).map((g, gi) => {
        const base = idx; idx += g.length;
        return (
          <div key={gi} style={halfGrid(g.length)}>
            {g.map((m, j) => (
              <span key={j} className="flex items-center justify-center">
                <span className={animate ? 'heat-cell' : undefined} title={`${slots[base + j] || ''} · ${STATUS_WORD[m] || 'No record'}`}
                      style={{ ...heatStyle(m, t, faded), animationDelay: animate ? `${(base + j) * 35}ms` : undefined }} />
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Day score, coloured by how the day went */
function ScorePill({ present, total, t }) {
  const r = total ? present / total : 0;
  const ink = r === 1 ? t.ok : r >= 0.75 ? t.fg : r >= 0.5 ? t.warn : t.bad;
  return <span className="shrink-0 w-9 sm:w-10 text-right text-[13px] font-bold tabular-nums font-mono" style={{ color: ink }}>{present}/{total}</span>;
}

function Sheet({ t, onClose, labelledBy, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(3px)' }}
         onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={e => e.stopPropagation()}
           className="glass w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl px-5 pt-6 pb-7"
           style={{ color: t.fg }}>
        {children}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function StudentPage() {
  const router = useRouter();
  const dark = useIsDark();
  const t = dark ? TOK.dark : TOK.light;
  const sky = useSky();
  const scrolled = useScrolled();

  const [data, setData]         = useState(null);
  const [error, setError]       = useState('');
  const [updates, setUpdates]   = useState([]);
  const [selfByDate, setSelfByDate] = useState({});
  const [view, setView]         = useState('home');          // 'home' | 'history'
  const [expanded, setExpanded] = useState(null);
  const [sheet, setSheet]       = useState(null);            // { type: 'info' | 'notices' | 'track', date? }
  const [draft, setDraft]       = useState({});
  const [saving, setSaving]     = useState(false);

  function loadSelf() {
    return fetch('/api/student/self-attendance').then(r => r.json()).then(records => {
      const m = {};
      for (const r of Array.isArray(records) ? records : []) (m[r.date] ||= {})[r.slot] = r.status;
      setSelfByDate(m);
    }).catch(() => {});
  }
  useEffect(() => {
    fetch('/api/student/me').then(r => r.json()).then(d => (d.error ? setError(d.error) : setData(d))).catch(e => setError(e.message));
    fetch('/api/updates').then(r => r.json()).then(d => setUpdates(Array.isArray(d) ? d : [])).catch(() => {});
    loadSelf();
  }, []);

  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }

  // ── Derived data ──
  const model = useMemo(() => {
    if (!data) return null;
    const { stats } = data;
    const slots = stats.slots?.length ? stats.slots : TIME_SLOTS;
    const today = todayIST();

    const days = [];
    for (const [date, map] of Object.entries(stats.byDate || {}))
      days.push({ date, kind: 'official', marks: slots.map(sl => map[sl]) });
    for (const [date, map] of Object.entries(selfByDate))
      if (!stats.byDate?.[date]) days.push({ date, kind: 'self', marks: slots.map(sl => map[sl]) });
    const futureHolidays = [];
    for (const m of stats.missingDays || []) {
      if (m.future) { futureHolidays.push(m); continue; }
      if (selfByDate[m.date] || stats.byDate?.[m.date]) continue;
      days.push({ date: m.date, kind: m.status === 'holiday' ? 'holiday' : 'pending', reason: m.reason, isToday: m.today });
    }
    days.sort((a, b) => b.date.localeCompare(a.date));
    for (const d of days) {
      d.present = d.marks ? d.marks.filter(m => m === 'present' || m === 'sp').length : 0;
      d.marked  = d.marks ? d.marks.filter(Boolean).length : 0;
    }

    const selfDays = days.filter(d => d.kind === 'self');
    const selfP = selfDays.reduce((n, d) => n + d.present, 0);
    const selfT = selfDays.reduce((n, d) => n + d.marked, 0);
    const estimate = selfT ? Math.round((stats.present + selfP) / (stats.total + selfT) * 100) : null;

    // Next CRT day for this cluster (skipping marked holidays)
    const cdays = CLUSTER_DAYS[stats.cluster] || [];
    const holidaySet = new Set((stats.missingDays || []).filter(m => m.status === 'holiday').map(m => m.date));
    let next = null;
    if (cdays.length) {
      for (let i = 0; i < 21 && !next; i++) {
        const d = addDays(today, i);
        if (cdays.includes(utc(d).getUTCDay()) && !holidaySet.has(d) && !stats.byDate?.[d]) next = d;
      }
    }

    // Weeks (history view)
    const byWeek = new Map();
    for (const d of days) {
      const k = weekStart(d.date);
      if (!byWeek.has(k)) byWeek.set(k, []);
      byWeek.get(k).push(d);
    }
    const weekKeys = [...byWeek.keys()].sort();
    const weeks = weekKeys.reverse().map(k => {
      const list = byWeek.get(k);
      const off = list.filter(d => d.kind === 'official');
      const p = off.reduce((n, d) => n + d.present, 0), n = off.length * slots.length;
      return {
        key: k, n: weekKeys.length - weekKeys.indexOf(k), list,
        range: `${shortDate(list[list.length - 1].date)} – ${shortDate(list[0].date)}`,
        p, total: n, pct: n ? Math.round(p / n * 100) : null,
      };
    });

    return {
      slots, days, selfDays, estimate, next, futureHolidays, weeks,
      st: standing(stats.present, stats.total),
      pendingCount: days.filter(d => d.kind === 'pending').length,
    };
  }, [data, selfByDate]);

  // ── Self-tracking ──
  function openTrack(date) {
    const existing = selfByDate[date] || {};
    setDraft(Object.fromEntries(model.slots.map(sl => [sl, existing[sl] || ''])));
    setSheet({ type: 'track', date });
  }
  async function saveTrack(remove = false) {
    setSaving(true);
    try {
      const entries = model.slots.map(slot => ({ slot, status: remove ? '' : (draft[slot] || '') }));
      await fetch('/api/student/self-attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: sheet.date, entries }),
      });
      await loadSelf();
      setExpanded(sheet.date);
      setSheet(null);
    } finally { setSaving(false); }
  }

  // ── Render helpers ──
  const shell = children => (
    <div className="min-h-[100dvh] relative" style={{ color: t.fg }}>
      <style>{SEG_CSS}</style>
      {children}
      {data && <ChatWidget role="student" />}
    </div>
  );

  if (error) return shell(
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <Glass t={t} className="rounded-3xl p-8 max-w-sm text-center">
        <p className="font-semibold">Couldn’t load your attendance</p>
        <p className="text-sm mt-2" style={{ color: t.muted }}>{error}</p>
        <button onClick={logout} className="sky-btn mt-5 h-11 px-5 rounded-xl text-sm font-bold">Back to login</button>
      </Glass>
    </div>
  );
  if (!data || !model) return shell(
    <div className="min-h-[100dvh] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: t.track, borderTopColor: t.chipInk }} aria-label="Loading" />
    </div>
  );

  const { student: s, stats } = data;
  const { st } = model;
  const firstWord = (s.name || '').split(' ').find(w => w.length > 2) || s.name || '';
  const firstName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  const toneInk  = st.tone === 'none' ? t.muted : t[st.tone];
  const toneBar  = st.tone === 'none' ? t.track : t[st.tone + 'Bar'];
  const toneSoft = st.tone === 'none' ? t.well : t[st.tone + 'Soft'];
  const toneGlow = st.tone === 'none' ? 'transparent' : t[st.tone + 'Glow'];
  const pill = { ok: '✓ You’re safe', warn: 'Close to the limit', bad: 'Below 75%', none: 'No data yet' }[st.tone];
  const mainMsg = st.tone === 'none'
    ? 'No attendance has been uploaded for your cluster yet.'
    : st.tone === 'bad'
      ? `Attend the next ${st.need75} sessions in a row to get back to 75%.`
      : st.canMiss > 0
        ? `You can miss ${st.canMiss} more session${st.canMiss === 1 ? '' : 's'} and still stay above 75%.`
        : 'Don’t miss any session — you’re right at 75%.';
  const goalMsg = st.tone === 'none' ? 'Your percentage appears after the first upload.'
    : st.need85 > 0 ? `Goal: attend ${st.need85} sessions in a row to reach 85%.` : 'You’re above the 85% goal too — great work.';

  const latestNotice = updates[0];
  const recent = model.days.slice(0, 6);
  const iconBtn = 'w-11 h-11 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80';

  function DayRow({ d, compact }) {
    const isRecord = d.kind === 'official' || d.kind === 'self';
    const open = expanded === d.date && isRecord;
    if (d.kind === 'holiday') return (
      <div className="flex items-center gap-3 px-4 min-h-[58px]" style={{ background: t.holidayBg, borderTop: `1px solid ${t.line}` }}>
        <div className="w-[76px] sm:w-[86px] shrink-0 text-[12px] min-[380px]:text-[13px] font-bold whitespace-nowrap" style={{ color: t.muted }}>{dayLabel(d.date)}</div>
        <div className="flex-1 text-[13px]" style={{ color: t.muted }}>Holiday{d.reason ? ` · ${d.reason}` : ''}</div>
        <div className="text-[11px]" style={{ color: t.muted }}>not counted</div>
      </div>
    );
    if (d.kind === 'pending') return (
      <div className="flex items-center gap-3 px-4 min-h-[58px]" style={{ background: t.pendingBg, borderTop: `1px solid ${t.line}` }}>
        <div className="w-[76px] sm:w-[86px] shrink-0 text-[12px] min-[380px]:text-[13px] font-bold whitespace-nowrap">{dayLabel(d.date)}</div>
        <div className="flex-1 text-[13px] font-semibold" style={{ color: t.warn }}>{d.isToday ? 'Today · not uploaded yet' : 'Not uploaded yet'}</div>
        <button onClick={() => openTrack(d.date)} className="sky-btn h-9 px-3 rounded-[10px] text-xs font-bold">Track it</button>
      </div>
    );
    return (
      <div style={{ borderTop: `1px solid ${t.line}` }}>
        <div className="flex items-center">
          <button onClick={() => setExpanded(open ? null : d.date)} aria-expanded={open}
                  className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 min-h-[58px] text-left">
            <div className="w-[76px] sm:w-[86px] shrink-0">
              <div className="text-[12px] min-[380px]:text-[13px] font-bold whitespace-nowrap">{dayLabel(d.date)}</div>
              {d.kind === 'self' && <div className="text-[10px] font-bold tracking-wide mt-0.5" style={{ color: t.self }}>SELF-TRACKED</div>}
            </div>
            <Segments marks={d.marks} slots={model.slots} t={t} faded={d.kind === 'self'} animate={!compact} />
            <ScorePill present={d.present} total={model.slots.length} t={t} />
          </button>
          {d.kind === 'self' && (
            <button aria-label="Why is this day self-tracked?" onClick={() => setSheet({ type: 'info' })}
                    className="w-11 h-11 mr-1.5 flex items-center justify-center" style={{ color: t.self }}>
              <InfoIcon />
            </button>
          )}
        </div>
        {open && (
          <div className="px-4 pb-3.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {model.slots.map((sl, i) => {
              const m = d.marks[i];
              const [label, color] = m === 'present' ? ['Present', t.ok] : m === 'sp' ? ['Permission', t.sp] : m === 'absent' ? ['Missed', t.bad] : ['—', t.muted];
              return (
                <div key={sl} className="flex justify-between text-xs px-2.5 py-1.5 rounded-[10px]" style={{ background: t.well }}>
                  <span className="font-mono" style={{ color: t.muted }}>{sl}</span>
                  <span className="font-bold" style={{ color }}>{label}</span>
                </div>
              );
            })}
            {d.kind === 'self' && (
              <button onClick={() => openTrack(d.date)} className="col-span-2 sm:col-span-4 text-xs font-bold h-9 rounded-[10px]"
                      style={{ border: `1px solid ${t.line}`, color: t.self }}>Edit self-tracked day</button>
            )}
          </div>
        )}
      </div>
    );
  }

  const Legend = () => (
    <div className="heat-row flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[11px] font-medium" style={{ color: t.muted, borderTop: `1px solid ${t.line}` }}>
      {[['present', 'Present'], ['absent', 'Missed'], ['sp', 'Permission']].map(([m, l]) => (
        <span key={m} className="flex items-center gap-1.5"><span style={{ ...heatStyle(m, t), width: 14, height: 14, borderRadius: 4 }} />{l}</span>
      ))}
      <span className="flex items-center gap-1.5"><span style={{ ...heatStyle('present', t, true), width: 14, height: 14, borderRadius: 4 }} />Self-tracked (unofficial)</span>
    </div>
  );

  // ── Header ──
  const header = (
    <div className="sticky top-0 z-40 transition-all duration-300"
         style={scrolled
           ? { background: dark ? 'rgba(8,10,18,0.55)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', borderBottom: `1px solid ${t.line}`, boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(15,23,42,0.06)' }
           : { background: 'transparent', borderBottom: '1px solid transparent' }}>
    <header className="max-w-6xl mx-auto flex items-center gap-2.5 px-4 sm:px-6 py-3.5">
      <img src={dark ? LOGO_WHITE : LOGO_RED} alt="KL University" className="h-9 w-auto" style={dark ? {} : { mixBlendMode: 'multiply' }} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-bold leading-tight">CRT Tracker</div>
        <div className="text-[11px]" style={{ color: t.muted }}>Y-24 · KL University</div>
      </div>
      {sky.weather && (
        <span className="hidden sm:inline text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: t.glass, border: `1px solid ${t.line}` }}
              title={`Sunrise ${sky.weather.sunrise} · Sunset ${sky.weather.sunset}`}>
          {sky.weather.temp}° · {sky.weather.label}
        </span>
      )}
      <div className={iconBtn} style={{ background: t.glass, border: `1px solid ${t.line}` }}><ThemeToggle /></div>
      <button onClick={logout} aria-label="Log out" className={iconBtn} style={{ background: t.glass, border: `1px solid ${t.line}` }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
      </button>
    </header>
    </div>
  );

  // ── History view ──
  if (view === 'history') return shell(
    <>
      {header}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 space-y-3">
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => setView('home')} aria-label="Back to home" className={iconBtn} style={{ background: t.glass, border: `1px solid ${t.line}` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-extrabold">Full history</h1>
            <p className="text-xs" style={{ color: t.muted }}>Cluster {stats.cluster} · {clusterDaysLabel(stats.cluster)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            [`${st.pct}%`, 'official', toneInk],
            [Object.keys(stats.byDate || {}).length, 'days uploaded', t.fg],
            [model.pendingCount, 'not uploaded', t.warn],
          ].map(([v, l, c]) => (
            <Glass key={l} t={t} as="div" className="rounded-2xl py-3 text-center">
              <div className="text-[22px] font-extrabold" style={{ color: c }}>{v}</div>
              <div className="text-[11px] font-semibold" style={{ color: t.muted }}>{l}</div>
            </Glass>
          ))}
        </div>
        {model.weeks.map(w => (
          <Glass key={w.key} t={t} className="rounded-[20px] overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
              <div className="flex-1">
                <div className="text-[15px] font-bold">Week {w.n}</div>
                <div className="text-xs" style={{ color: t.muted }}>{w.range}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono" style={{ color: w.pct == null ? t.muted : w.pct >= 75 ? t.ok : t.bad }}>{w.total ? `${w.p}/${w.total}` : '—'}</div>
                <div className="text-[11px]" style={{ color: t.muted }}>{w.pct == null ? 'nothing counted' : `${w.pct}% official`}</div>
              </div>
            </div>
            <div className="h-1 mx-4 mb-3 rounded-full" style={{ background: t.track }}>
              <div className="h-1 rounded-full" style={{ width: `${w.pct || 0}%`, background: (w.pct || 0) >= 75 ? t.okBar : t.badBar }} />
            </div>
            {w.list.map(d => <DayRow key={d.date} d={d} compact />)}
          </Glass>
        ))}
        {model.weeks.length === 0 && <p className="text-sm text-center py-10" style={{ color: t.muted }}>No CRT days yet.</p>}
        <p className="text-xs leading-relaxed px-1 pt-1" style={{ color: t.muted }}>
          Only uploaded days count towards your percentage. Holidays and days that are not uploaded yet are never counted against you.
        </p>
      </main>
      {renderSheet()}
    </>
  );

  // ── Home view ──
  return shell(
    <>
      {header}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="pt-1 pb-4">
          <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight">{sky.phase ? GREETING[sky.phase] : 'Hi'}, {firstName}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: t.glass, border: `1px solid ${t.line}` }}>{s.rollNumber}</span>
            {stats.cluster && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: t.chipSoft, color: t.chipInk }}>Cluster {stats.cluster} · {clusterDaysLabel(stats.cluster)}</span>}
            {s.crtSec && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: t.glass, border: `1px solid ${t.line}` }}>{s.crtSec}{s.crtRoom ? ` · ${s.crtRoom}` : ''}</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-[400px_minmax(0,1fr)] gap-4 items-start">
          {/* Left column */}
          <div className="space-y-3.5">
            <Glass t={t} className="rounded-[26px] p-5 sm:p-6" aria-label="Your attendance">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: t.muted }}>Official attendance</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: toneSoft, color: toneInk }}>{pill}</span>
              </div>
              <div className="flex items-center gap-5 mt-3.5 flex-wrap">
                <div className="relative w-[148px] h-[148px] shrink-0">
                  <Ring pct={st.pct} color={toneBar} glow={toneGlow} t={t} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[38px] font-extrabold tracking-tight leading-none" style={{ color: toneInk }}>{st.pct}%</div>
                    <div className="text-[11px] font-medium mt-1" style={{ color: t.muted }}>{stats.present} of {stats.total}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-[150px] space-y-2">
                  <div className="flex items-center gap-2 text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{ background: t.fg }} /><span><b>75%</b> minimum</span></div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: t.muted }}><span className="w-2 h-2 rounded-full" style={{ background: t.muted }} /><span><b>85%</b> goal</span></div>
                  <div className="flex gap-1.5 pt-1">
                    <div className="flex-1 rounded-xl py-2 text-center" style={{ background: t.well }}>
                      <div className="text-[17px] font-extrabold" style={{ color: t.ok }}>{stats.present}</div>
                      <div className="text-[10px] font-semibold" style={{ color: t.muted }}>attended</div>
                    </div>
                    <div className="flex-1 rounded-xl py-2 text-center" style={{ background: t.well }}>
                      <div className="text-[17px] font-extrabold" style={{ color: t.bad }}>{stats.absent}</div>
                      <div className="text-[10px] font-semibold" style={{ color: t.muted }}>missed</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 px-3.5 py-3 rounded-2xl" style={{ background: toneSoft }}>
                <p className="text-[15px] leading-snug font-semibold" style={{ color: toneInk }}>{mainMsg}</p>
                <p className="text-[12.5px] mt-1" style={{ color: t.fg, opacity: 0.85 }}>{goalMsg}</p>
              </div>
              {stats.sp > 0 && (
                <p className="text-xs mt-2.5" style={{ color: t.muted }}>Includes {stats.sp} session{stats.sp > 1 ? 's' : ''} with permission (counted as present).</p>
              )}
              {model.estimate != null && (
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="flex-1 text-[13px]" style={{ color: t.muted }}>
                    With your self-tracked days: <b style={{ color: t.self }}>{model.estimate}%</b> <span className="text-[11px]">(estimate)</span>
                  </div>
                  <button aria-label="What is self-tracked attendance?" onClick={() => setSheet({ type: 'info' })}
                          className="w-11 h-11 -m-2.5 flex items-center justify-center" style={{ color: t.self }}><InfoIcon /></button>
                </div>
              )}
            </Glass>

            <div className="grid grid-cols-2 gap-2.5">
              <Glass t={t} className="rounded-[20px] p-3.5" aria-label="Next CRT day">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: t.chipSoft, color: t.chipInk }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
                </div>
                <div className="text-[11px] font-semibold mt-2.5" style={{ color: t.muted }}>Next CRT day</div>
                <div className="text-[15px] font-bold mt-0.5">{model.next ? (model.next === todayIST() ? 'Today' : dayLabel(model.next)) : '—'}</div>
                <div className="text-[11px]" style={{ color: t.muted }}>{model.slots.length} sessions</div>
              </Glass>
              <Glass t={t} className="rounded-[20px] p-3.5" aria-label="Latest notice">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: t.warnSoft, color: t.warn }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l15-6v14L3 13z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
                </div>
                <div className="text-[11px] font-semibold mt-2.5" style={{ color: t.muted }}>Notice</div>
                <div className="text-[13px] font-bold mt-0.5 leading-snug line-clamp-2">
                  {latestNotice ? (latestNotice.title || latestNotice.content) : model.futureHolidays[0] ? `No CRT on ${dayLabel(model.futureHolidays[0].date)}` : 'No new notices'}
                </div>
                {updates.length > 0 && (
                  <button onClick={() => setSheet({ type: 'notices' })} className="text-[11px] font-bold mt-0.5 underline underline-offset-2" style={{ color: t.chipInk }}>
                    All notices ({updates.length})
                  </button>
                )}
              </Glass>
            </div>
          </div>

          {/* Right column */}
          <Glass t={t} className="rounded-[24px] overflow-hidden" aria-label="Recent CRT days">
            <div className="flex items-baseline justify-between px-4 pt-4 pb-2.5">
              <h2 className="text-base font-bold">Recent CRT days</h2>
              <span className="text-[11px]" style={{ color: t.muted }}>Tap a day for details</span>
            </div>
            <div className="hidden lg:flex items-center gap-3 px-4 pb-1.5 text-[10.5px] font-mono" style={{ color: t.muted }}>
              <div className="w-[76px] sm:w-[86px] shrink-0" />
              <div className="heat-row flex-1 min-w-0 flex" style={{ gap: 'var(--lunch)' }}>
                {halves(model.slots).map((g, gi) => (
                  <div key={gi} style={halfGrid(g.length)}>
                    {g.map(sl => <span key={sl} className="text-center">{sl.slice(0, 5)}</span>)}
                  </div>
                ))}
              </div>
              <div className="w-10 shrink-0" />
            </div>
            {recent.length === 0
              ? <p className="text-sm text-center py-10" style={{ color: t.muted, borderTop: `1px solid ${t.line}` }}>No CRT days yet.</p>
              : recent.map(d => <DayRow key={d.date} d={d} />)}
            <Legend />
            <button onClick={() => setView('history')} className="w-full flex items-center justify-center gap-1.5 h-[52px] text-sm font-bold"
                    style={{ borderTop: `1px solid ${t.line}`, color: t.chipInk }}>
              See full history
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </Glass>
        </div>

        <p className="text-center text-[11px] mt-8" style={{ color: t.muted }}>
          Y-24 CRT Training · KL University · <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Akhil Panvi</a>
        </p>
      </main>
      {renderSheet()}
    </>
  );

  // ── Sheets ──
  function renderSheet() {
    if (!sheet) return null;
    const close = () => setSheet(null);

    if (sheet.type === 'info') return (
      <Sheet t={t} onClose={close} labelledBy="self-title">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.selfSoft, color: t.self }}><InfoIcon /></span>
          <h2 id="self-title" className="text-lg font-extrabold">Self-tracked attendance</h2>
        </div>
        <p className="text-sm leading-relaxed mt-3.5">The CRT office has not sent official attendance for these dates, so you tracked them yourself:</p>
        <div className="mt-2.5 space-y-1.5">
          {model.selfDays.map(d => (
            <div key={d.date} className="flex justify-between text-[13px] px-3 py-2.5 rounded-xl" style={{ background: t.well }}>
              <b>{dayLabel(d.date)}</b><span>{d.present}/{d.marked} present</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] leading-relaxed mt-3" style={{ color: t.muted }}>
          <b style={{ color: t.fg }}>This is not an official record.</b> It is only used for your estimate and is replaced automatically when the official attendance is uploaded.
        </p>
        <button onClick={close} className="sky-btn mt-5 w-full h-[50px] rounded-2xl text-[15px] font-bold">Got it</button>
      </Sheet>
    );

    if (sheet.type === 'notices') return (
      <Sheet t={t} onClose={close} labelledBy="notices-title">
        <h2 id="notices-title" className="text-lg font-extrabold">Notices</h2>
        <div className="mt-3 space-y-2">
          {updates.map(u => (
            <div key={u._id} className="px-3.5 py-3 rounded-2xl" style={{ background: t.well }}>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: t.muted }}>
                <span className="font-bold uppercase tracking-wide" style={{ color: u.category === 'important' ? t.bad : u.category === 'warning' ? t.warn : t.chipInk }}>
                  {u.pinned ? 'Pinned · ' : ''}{u.category === 'important' ? 'Important' : u.category === 'warning' ? 'Warning' : 'Info'}
                </span>
                <span className="ml-auto">{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </div>
              {u.title && <p className="text-sm font-bold mt-1">{u.title}</p>}
              <p className="text-[13px] leading-relaxed mt-0.5 whitespace-pre-wrap" style={{ color: t.muted }}>{u.content}</p>
            </div>
          ))}
        </div>
        <button onClick={close} className="sky-btn mt-5 w-full h-[50px] rounded-2xl text-[15px] font-bold">Close</button>
      </Sheet>
    );

    // track
    const hasExisting = !!selfByDate[sheet.date];
    const pillStyle = (on, color, soft) => ({
      height: 38, padding: '0 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
      border: `1.5px solid ${on ? color : t.line}`, background: on ? soft : 'transparent', color: on ? color : t.muted,
    });
    return (
      <Sheet t={t} onClose={close} labelledBy="track-title">
        <h2 id="track-title" className="text-lg font-extrabold">Track {dayLabel(sheet.date)} yourself</h2>
        <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: t.muted }}>Official attendance isn’t uploaded yet. Mark each session — this stays private and unofficial.</p>
        <div className="flex gap-2 mt-3">
          <button className="text-xs font-bold px-3 h-8 rounded-lg" style={{ border: `1px solid ${t.line}` }}
                  onClick={() => setDraft(Object.fromEntries(model.slots.map(sl => [sl, 'present'])))}>All present</button>
          <button className="text-xs font-bold px-3 h-8 rounded-lg" style={{ border: `1px solid ${t.line}` }}
                  onClick={() => setDraft(Object.fromEntries(model.slots.map(sl => [sl, 'absent'])))}>All missed</button>
        </div>
        <div className="mt-3 space-y-1.5">
          {model.slots.map(sl => (
            <div key={sl} className="flex items-center gap-2">
              <span className="flex-1 text-[13px] font-mono" style={{ color: t.muted }}>{sl}</span>
              <button aria-pressed={draft[sl] === 'present'} style={pillStyle(draft[sl] === 'present', t.ok, t.okSoft)}
                      onClick={() => setDraft(p => ({ ...p, [sl]: 'present' }))}>Present</button>
              <button aria-pressed={draft[sl] === 'absent'} style={pillStyle(draft[sl] === 'absent', t.bad, t.badSoft)}
                      onClick={() => setDraft(p => ({ ...p, [sl]: 'absent' }))}>Missed</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={close} className="flex-1 h-[50px] rounded-2xl text-[15px] font-bold" style={{ border: `1px solid ${t.line}` }}>Cancel</button>
          <button onClick={() => saveTrack(false)} disabled={saving || !Object.values(draft).some(Boolean)}
                  className="sky-btn flex-[2] h-[50px] rounded-2xl text-[15px] font-bold disabled:opacity-40">
            {saving ? 'Saving…' : 'Save as self-tracked'}
          </button>
        </div>
        {hasExisting && (
          <button onClick={() => saveTrack(true)} disabled={saving} className="w-full mt-3 text-[13px] font-bold h-10" style={{ color: t.bad }}>
            Remove my self-tracking for this day
          </button>
        )}
      </Sheet>
    );
  }
}
