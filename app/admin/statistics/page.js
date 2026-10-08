'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { fmtDate } from '@/lib/helpers';

// Fixed categorical slot per group (color follows the group, never its rank)
const GROUP_ORDER = ['CGN', 'GK', 'IS', 'RS', 'SI'];
const groupVar = g => {
  const i = GROUP_ORDER.indexOf(g);
  return i >= 0 ? `var(--g${i + 1})` : 'var(--g-other)';
};
const BANDS = [
  { key: 'ge85', label: '85% +',   color: 'var(--good)' },
  { key: 'b75',  label: '75–85%',  color: 'var(--warn)' },
  { key: 'b60',  label: '60–75%',  color: 'var(--serious)' },
  { key: 'lt60', label: 'Below 60%', color: 'var(--crit)' },
];
const fmtN = n => (n ?? 0).toLocaleString('en-IN');
const pctOf = (a, b) => (b ? Math.round(a / b * 100) : 0);

const VIZ_CSS = `
.viz{--g1:#2a78d6;--g2:#eb6834;--g3:#1baf7a;--g4:#eda100;--g5:#e87ba4;--g-other:#94a3b8;
  --good:#0ca30c;--warn:#fab219;--serious:#ec835a;--crit:#d03b3b;--seq:var(--sky-dot);
  --grid:rgba(15,23,42,.08);--axis:#64748b;--ink:#0f172a;--surface:#ffffff}
.dark .viz{--g1:#3987e5;--g2:#d95926;--g3:#199e70;--g4:#c98500;--g5:#d55181;--g-other:#64748b;
  --grid:rgba(255,255,255,.08);--axis:#94a3b8;--ink:#f1f5f9;--surface:#1e293b}
`;

// ── Tooltip (follows the pointer) ──────────────────────────────────────────
function useTooltip() {
  const [tip, setTip] = useState(null);
  const show = (e, content) => setTip({ x: e.clientX, y: e.clientY, content });
  const hide = () => setTip(null);
  const node = tip && (
    <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-xs shadow-lg
                    bg-slate-900 text-white dark:bg-white dark:text-slate-900"
         style={{ left: Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 220), top: tip.y + 14, maxWidth: 220 }}>
      {tip.content}
    </div>
  );
  return { show, hide, node };
}

// ── Pieces ─────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, tone }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${tone || 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function BandBar({ bands, total, tip, height = 12, showLabels = false }) {
  return (
    <div>
      <div className="flex w-full rounded-full overflow-hidden gap-[2px]" style={{ height }}>
        {BANDS.map(b => bands[b.key] > 0 && (
          <div key={b.key} style={{ flex: bands[b.key], background: b.color }}
               onMouseMove={e => tip?.show(e, <><b>{b.label}</b><br />{fmtN(bands[b.key])} students · {pctOf(bands[b.key], total)}%</>)}
               onMouseLeave={() => tip?.hide()} />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-600 dark:text-slate-300">
          {BANDS.map(b => (
            <span key={b.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
              {b.label}: <b className="tabular-nums">{fmtN(bands[b.key])}</b>
              <span className="text-slate-400">({pctOf(bands[b.key], total)}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Weekly trend: one line per group ───────────────────────────────────────
function WeeklyChart({ weekly, tip }) {
  const W = 760, H = 280, L = 40, R = 64, T = 14, B = 30;
  const [hover, setHover] = useState(null);
  const { weeks, series } = weekly;
  if (!weeks.length) return <p className="text-sm text-slate-400 py-10 text-center">No weekly data yet.</p>;

  const vals = series.flatMap(s => s.values).filter(v => v != null);
  const yMin = Math.max(0, Math.min(60, Math.floor((Math.min(...vals) - 5) / 10) * 10));
  const x = i => weeks.length === 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (weeks.length - 1);
  const y = v => T + (100 - v) / (100 - yMin) * (H - T - B);
  const ticks = []; for (let v = yMin; v <= 100; v += 10) ticks.push(v);

  // End labels, nudged apart so they never collide
  const ends = series.map(s => {
    let i = s.values.length - 1; while (i >= 0 && s.values[i] == null) i--;
    return i >= 0 ? { group: s.group, v: s.values[i], ly: y(s.values[i]) } : null;
  }).filter(Boolean).sort((a, b) => a.ly - b.ly);
  for (let k = 1; k < ends.length; k++) if (ends[k].ly - ends[k - 1].ly < 17) ends[k].ly = ends[k - 1].ly + 17;

  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * W;
    let best = 0;
    weeks.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
    const rows = series.map(s => ({ g: s.group, v: s.values[best] })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
    tip.show(e, (
      <div>
        <div className="font-semibold mb-1">{weeks[best].label} · {weeks[best].key}</div>
        {rows.map(r => (
          <div key={r.g} className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded" style={{ background: groupVar(r.g) }} />{r.g}</span>
            <b className="tabular-nums">{r.v}%</b>
          </div>
        ))}
      </div>
    ));
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Weekly attendance by section group">
      {ticks.map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--axis)">{v}%</text>
        </g>
      ))}
      {yMin < 75 && (
        <g>
          <line x1={L} x2={W - R} y1={y(75)} y2={y(75)} stroke="var(--crit)" strokeDasharray="4 4" strokeWidth="1.5" />
          <text x={L + 4} y={y(75) - 5} fontSize="10.5" fontWeight="600" fill="var(--crit)">75% minimum</text>
        </g>
      )}
      {weeks.map((w, i) => (
        <text key={w.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--axis)">{w.label}</text>
      ))}
      {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--axis)" strokeOpacity="0.5" />}
      {series.map(s => {
        const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
        return (
          <g key={s.group}>
            <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={groupVar(s.group)}
                      strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {hover != null && s.values[hover] != null && (
              <circle cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={groupVar(s.group)} stroke="var(--surface)" strokeWidth="2" />
            )}
          </g>
        );
      })}
      {ends.map(e => (
        <text key={e.group} x={W - R + 8} y={e.ly + 4} fontSize="13" fontWeight="600" fill="var(--ink)">
          <tspan fill={groupVar(e.group)}>●</tspan> {e.group}
        </text>
      ))}
      <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent"
            onMouseMove={move} onMouseLeave={() => { setHover(null); tip.hide(); }} />
    </svg>
  );
}

// ── Daily turnout bars ─────────────────────────────────────────────────────
function DailyChart({ daily, tip }) {
  const H = 220, L = 40, R = 10, T = 12, B = 34;
  const W = Math.max(560, daily.length * 34 + L + R);
  if (!daily.length) return <p className="text-sm text-slate-400 py-10 text-center">No uploads yet.</p>;
  const bw = Math.min(22, (W - L - R) / daily.length - 6);
  const x = i => L + (i + 0.5) * (W - L - R) / daily.length;
  const y = v => T + (100 - v) / 100 * (H - T - B);
  const every = Math.ceil(daily.length / 16);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: W * 0.75 }} className="h-auto" role="img" aria-label="Daily turnout">
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 75 ? 'var(--crit)' : 'var(--grid)'} strokeDasharray={v === 75 ? '4 4' : undefined} strokeWidth={v === 75 ? 1.5 : 1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--axis)">{v}%</text>
          </g>
        ))}
        {daily.map((d, i) => (
          <g key={`${d.date}${d.cluster}`}
             onMouseMove={e => tip.show(e, <><b>{d.day} {fmtDate(d.date)}</b> · {d.cluster}<br />{d.rate}% of sessions attended</>)}
             onMouseLeave={() => tip.hide()}>
            <rect x={x(i) - (bw + 8) / 2} y={T} width={bw + 8} height={H - T - B} fill="transparent" />
            <path d={`M${x(i) - bw / 2},${y(0)} V${y(d.rate) + 4} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 V${y(0)} Z`} fill="var(--seq)" />
            {i % every === 0 && (
              <>
                <text x={x(i)} y={H - 18} textAnchor="middle" fontSize="10.5" fill="var(--axis)">{d.date.slice(8)}/{d.date.slice(5, 7)}</text>
                <text x={x(i)} y={H - 5} textAnchor="middle" fontSize="9.5" fill="var(--axis)">{d.cluster}</text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
const COLS = [
  { key: 'section', label: 'Section' },
  { key: 'cluster', label: 'Cluster' },
  { key: 'students', label: 'Students', num: true },
  { key: 'avg', label: 'Avg %', num: true },
  { key: 'ge85', label: '85%+', num: true, band: true },
  { key: 'b75', label: '75–85', num: true, band: true },
  { key: 'b60', label: '60–75', num: true, band: true },
  { key: 'lt60', label: '<60', num: true, band: true },
  { key: 'belowPct', label: 'Below 75%', num: true },
];

export default function StatisticsPage() {
  const { toast, show } = useToast();
  const tip = useTooltip();
  const [cluster, setCluster] = useState('ALL');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup]     = useState('ALL');
  const [sort, setSort]       = useState({ key: 'avg', dir: 1 });
  const cache = useRef({});

  useEffect(() => {
    if (cache.current[cluster]) { setData(cache.current[cluster]); return; }
    setLoading(true);
    fetch(`/api/admin/statistics?cluster=${cluster}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); cache.current[cluster] = d; setData(d); })
      .catch(e => show(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [cluster]);

  const sections = useMemo(() => {
    if (!data) return [];
    const list = data.groups
      .filter(g => group === 'ALL' || g.group === group)
      .flatMap(g => g.sections.map(s => ({ ...s, group: g.group, ...s.bands, belowPct: pctOf(s.below75, s.counted) })));
    const { key, dir } = sort;
    return list.sort((a, b) => {
      const va = a[key], vb = b[key];
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'en', { numeric: true })) * dir;
    });
  }, [data, group, sort]);

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.groups.map(g => ({
      Group: g.group, Sections: g.sectionCount, Students: g.students, 'Avg %': g.avg, 'Median %': g.median,
      '85%+': g.bands.ge85, '75–85%': g.bands.b75, '60–75%': g.bands.b60, 'Below 60%': g.bands.lt60,
      'Below 75%': g.below75, 'Below 75% (share)': `${pctOf(g.below75, g.counted)}%`,
    }))), 'Groups');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.groups.flatMap(g => g.sections.map(s => ({
      Group: g.group, Section: s.section, Cluster: s.cluster, Rooms: s.rooms, Students: s.students,
      'Avg %': s.avg, 'Median %': s.median, '85%+': s.bands.ge85, '75–85%': s.bands.b75, '60–75%': s.bands.b60,
      'Below 60%': s.bands.lt60, 'Below 75%': s.below75, 'Below 75% (share)': `${pctOf(s.below75, s.counted)}%`,
    })))), 'Sections');
    XLSX.writeFile(wb, `crt_statistics_${cluster.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const o = data?.overall;
  return (
    <div className="viz max-w-6xl">
      <style>{VIZ_CSS}</style>
      <Toast toast={toast} />
      {tip.node}

      <div className="mb-5 flex items-end gap-3 flex-wrap">
        <div className="mr-auto">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Statistics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Attendance by section group (SI, RS, IS, GK, CGN…) and every section inside it</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-semibold">
          {[['ALL', 'All students'], ['C1', 'C1 · Mon/Tue'], ['C2', 'C2 · Wed/Thu']].map(([k, l]) => (
            <button key={k} onClick={() => setCluster(k)}
              className={`px-3 py-2 transition-colors ${cluster === k ? 'sky-btn' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <button className="btn-outline btn-sm" disabled={!data} onClick={exportExcel}>Export Excel</button>
      </div>

      {!data ? (
        <p className="text-sm text-slate-400 py-16 text-center">{loading ? 'Crunching numbers…' : 'No data.'}</p>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi label="Students" value={fmtN(o.students)} sub={`${data.groups.length} groups · ${data.groups.reduce((n, g) => n + g.sectionCount, 0)} sections`} />
            <Kpi label="Average" value={`${o.avg}%`} sub={`median ${o.median}%`} />
            <Kpi label="Below 75%" value={fmtN(o.below75)} sub={`${pctOf(o.below75, o.counted)}% of students`} tone="text-red-600 dark:text-red-400" />
            <Kpi label="85% and above" value={fmtN(o.bands.ge85)} sub={`${pctOf(o.bands.ge85, o.counted)}% of students`} tone="text-green-700 dark:text-green-400" />
            <Kpi label="Days held" value={`${data.daysHeld.C1 ?? 0} + ${data.daysHeld.C2 ?? 0}`} sub="C1 + C2 uploaded days" />
          </div>

          {/* Distribution */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">How students are spread</div>
            <BandBar bands={o.bands} total={o.counted} tip={tip} height={16} showLabels />
          </div>

          {/* Group cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.groups.map(g => {
              const active = group === g.group;
              return (
                <button key={g.group} onClick={() => setGroup(active ? 'ALL' : g.group)}
                  className={`text-left bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all hover:shadow-md
                    ${active ? 'border-[color:var(--sky-dot)] ring-2 ring-[color:var(--sky-soft)]' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: groupVar(g.group) }} />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{g.group}</span>
                    <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{g.sectionCount} sec</span>
                  </div>
                  <div className={`text-3xl font-bold mt-2 tabular-nums ${g.avg >= 75 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>{g.avg}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">{fmtN(g.students)} students · avg</div>
                  <BandBar bands={g.bands} total={g.counted} tip={tip} />
                  <div className="text-xs mt-2.5 text-slate-600 dark:text-slate-300">
                    <b className="text-red-600 dark:text-red-400 tabular-nums">{fmtN(g.below75)}</b> below 75% ({pctOf(g.below75, g.counted)}%)
                  </div>
                </button>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Weekly attendance by group</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Share of held sessions attended, per week · hover for values</div>
              <WeeklyChart weekly={data.weekly} tip={tip} />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily turnout</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Share of sessions attended on each uploaded day · hover a bar</div>
              <DailyChart daily={data.daily} tip={tip} />
            </div>
          </div>

          {/* Section table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
              <div className="mr-auto">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sections</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Sorted worst first · click a column to sort</div>
              </div>
              {['ALL', ...data.groups.map(g => g.group)].map(k => (
                <button key={k} onClick={() => setGroup(k)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors
                    ${group === k ? 'sky-btn border-transparent' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
                  {k !== 'ALL' && <span className="w-2 h-2 rounded-full" style={{ background: groupVar(k) }} />}
                  {k === 'ALL' ? 'All groups' : k}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {COLS.map(c => (
                      <th key={c.key} className={`tbl-header ${c.num ? 'text-right' : ''}`}>
                        <button className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                                onClick={() => setSort(s => ({ key: c.key, dir: s.key === c.key ? -s.dir : (c.key === 'avg' ? 1 : -1) }))}>
                          {c.band && <span className="w-2 h-2 rounded-sm" style={{ background: BANDS.find(b => b.key === c.key).color }} />}
                          {c.label}{sort.key === c.key ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sections.map(s => (
                    <tr key={s.section} className="tbl-row">
                      <td className="tbl-cell font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: groupVar(s.group) }} />{s.section}
                        </span>
                        {s.rooms && <div className="text-[10px] font-normal text-slate-400 truncate max-w-[160px]" title={s.rooms}>Room {s.rooms}</div>}
                      </td>
                      <td className="tbl-cell">{s.cluster || '—'}</td>
                      <td className="tbl-cell text-right tabular-nums">{fmtN(s.students)}</td>
                      <td className="tbl-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.avg}%`, background: s.avg >= 85 ? 'var(--good)' : s.avg >= 75 ? 'var(--warn)' : s.avg >= 60 ? 'var(--serious)' : 'var(--crit)' }} />
                          </div>
                          <b className={`tabular-nums w-12 text-right ${s.avg < 75 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{s.avg}%</b>
                        </div>
                      </td>
                      {['ge85', 'b75', 'b60', 'lt60'].map(k => <td key={k} className="tbl-cell text-right tabular-nums">{fmtN(s[k])}</td>)}
                      <td className="tbl-cell text-right">
                        <span className={`tabular-nums font-semibold ${s.belowPct >= 25 ? 'text-red-600 dark:text-red-400' : s.belowPct >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {s.belowPct}%
                        </span>
                        <span className="text-xs text-slate-400 ml-1">({fmtN(s.below75)})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
