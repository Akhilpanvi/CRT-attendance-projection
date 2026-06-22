'use client';
import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Weekly attendance trend — animated area + line chart with a threshold guide.
 * Responsive: scales to its container width via a viewBox.
 *
 * @param data       [{ label, pct }]  ordered oldest → newest
 * @param threshold  percentage guide line (default 75)
 * @param color      line/area color (token or hex)
 * @param height     px height
 */
export default function TrendChart({ data = [], threshold = 75, color = 'var(--brand)', height = 168 }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const W = 640, H = height, padX = 16, padTop = 16, padBot = 26;
  const n = data.length;

  if (n === 0) return null;

  const x = (i) => padX + (n === 1 ? (W - padX * 2) / 2 : (i * (W - padX * 2)) / (n - 1));
  const y = (p) => padTop + (1 - p / 100) * (H - padTop - padBot);

  const pts = data.map((d, i) => [x(i), y(d.pct)]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - padBot).toFixed(1)} L${x(0).toFixed(1)},${(H - padBot).toFixed(1)} Z`;
  const yT = y(threshold);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="Weekly attendance trend">
      <defs>
        <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Threshold guide */}
      <line x1={padX} y1={yT} x2={W - padX} y2={yT} stroke="var(--fg-faint)" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
      <text x={W - padX} y={yT - 5} textAnchor="end" fontSize="10" fill="var(--fg-subtle)">{threshold}%</text>

      {/* Area */}
      <motion.path d={area} fill={`url(#area-${uid})`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.8, delay: 0.2 }} />

      {/* Line */}
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }} />

      {/* Points + labels */}
      {pts.map(([px, py], i) => (
        <g key={i}>
          <motion.circle cx={px} cy={py} r="3.5" fill="var(--surface)" stroke={color} strokeWidth="2.5"
            initial={{ scale: reduce ? 1 : 0 }} animate={{ scale: 1 }} transition={{ delay: reduce ? 0 : 0.4 + i * 0.06, type: 'spring', stiffness: 300, damping: 18 }} />
          <text x={px} y={H - 9} textAnchor="middle" fontSize="10" fill="var(--fg-subtle)">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}
