'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Counts up to `value` once when it scrolls into view (or on mount). */
export default function AnimatedNumber({ value = 0, duration = 900, suffix = '', className }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) { setDisplay(value); return; }
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const from = 0;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setDisplay(Math.round(from + (value - from) * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, reduce]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
}
