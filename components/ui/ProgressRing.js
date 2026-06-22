'use client';
import { motion, useReducedMotion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';

/**
 * Animated attendance ring. Draws the arc on mount and counts the % up.
 * Threshold ticks (75 / 85) are rendered as faint marks on the track.
 *
 * @param value      0–100 percentage
 * @param color      hex stroke color (defaults to brand)
 * @param size       px diameter
 * @param thresholds array of percentages to mark on the track
 * @param label      small caption beneath the number
 */
export default function ProgressRing({
  value = 0,
  color = 'var(--brand)',
  size = 168,
  stroke = 12,
  thresholds = [75, 85],
  label = 'attendance',
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--border)" strokeWidth={stroke}
        />
        {/* Threshold ticks */}
        {thresholds.map((t) => {
          const a = (t / 100) * 2 * Math.PI;
          const x1 = size / 2 + (r - stroke / 2) * Math.cos(a);
          const y1 = size / 2 + (r - stroke / 2) * Math.sin(a);
          const x2 = size / 2 + (r + stroke / 2) * Math.cos(a);
          const y2 = size / 2 + (r + stroke / 2) * Math.sin(a);
          return (
            <line key={t} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--fg-faint)" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
          );
        })}
        {/* Progress arc */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? offset : c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2.4rem] font-extrabold leading-none tabular" style={{ color }}>
          <AnimatedNumber value={pct} suffix="%" />
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">{label}</span>
      </div>
    </div>
  );
}
