'use client';
import { Item } from './motion';
import AnimatedNumber from './AnimatedNumber';

/**
 * Compact metric tile. Use inside a <Stagger> for entrance choreography.
 *
 * @param label   caption
 * @param value   number (count-up animated) or node
 * @param accent  hex/token color for the value
 * @param hint    optional secondary line
 * @param icon    optional leading node
 * @param animate whether to count-up a numeric value (default true)
 */
export default function StatCard({ label, value, accent = 'var(--fg)', hint, icon, animate = true }) {
  const numeric = typeof value === 'number';
  return (
    <Item>
      <div className="rounded-xl px-4 py-3.5 h-full bg-surface border border-line shadow-token-sm transition-shadow duration-200 hover:shadow-token-md">
        <div className="flex items-center gap-2">
          {icon && <span className="text-fg-subtle">{icon}</span>}
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{label}</p>
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular leading-none" style={{ color: accent }}>
          {numeric && animate ? <AnimatedNumber value={value} /> : value}
        </p>
        {hint && <p className="mt-1 text-[11px] text-fg-subtle">{hint}</p>}
      </div>
    </Item>
  );
}
