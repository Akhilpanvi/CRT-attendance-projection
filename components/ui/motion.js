'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   Motion primitives — thin, opinionated wrappers around Framer Motion.
   All wrappers honor prefers-reduced-motion automatically (Framer's
   useReducedMotion is respected via the `reduce` variant fallbacks).
   ───────────────────────────────────────────────────────────────────────────── */
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1];

/** Fade + rise on mount. */
export function FadeIn({ children, delay = 0, y = 16, duration = 0.5, className, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its <Item> children into view. */
export function Stagger({ children, delay = 0, gap = 0.07, className, ...rest }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Child of <Stagger>. */
export function Item({ children, y = 18, className, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
        show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Subtle press/hover affordance for interactive cards. */
export function Pressable({ children, className, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.2, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
