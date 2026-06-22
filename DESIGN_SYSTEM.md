# CRT Attendance — Design System

A token-driven design system for the CRT Attendance Tracker, inspired by the
craft of **Linear, Stripe, Vercel, Apple and Notion**: restrained palette,
soft layered elevation, generous radii, real motion, and a single source of
truth for light/dark theming.

> **Backend is untouched.** This system is presentation-only — all API routes,
> auth, MongoDB models and data flow are exactly as before.

---

## 1. Tokens

All design decisions live as CSS custom properties in
[`app/globals.css`](app/globals.css) and are theme-aware (`:root` = light,
`.dark` = dark). They are also surfaced as Tailwind utilities via
[`tailwind.config.js`](tailwind.config.js).

| Group | Tokens | Tailwind utility |
|-------|--------|------------------|
| Surfaces | `--bg`, `--bg-elevated`, `--surface`, `--surface-2`, `--surface-hover` | `bg-bg`, `bg-surface`, `bg-bg-elevated`, … |
| Lines | `--border`, `--border-strong` | `border-line`, `border-line-strong` |
| Text | `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-faint` | `text-fg`, `text-fg-muted`, `text-fg-subtle` |
| Brand | `--brand`, `--brand-strong`, `--brand-soft` | `text-brand`, `bg-brand-soft` |
| Accent | `--accent`, `--accent-soft` | `text-accent`, `bg-accent-soft` |
| Status | `--success`, `--warning`, `--danger` (+ `-soft`) | `text-success`, `bg-danger-soft`, … |
| Inverse | `--inverse`, `--inverse-fg` | `bg-inverse text-inverse-fg` |
| Radii | `--r-sm/md/lg/xl` (8/12/16/22px) | `rounded-sm/md/lg/xl` |
| Elevation | `--shadow-sm/md/lg`, `--shadow-glow` | `shadow-token-sm/md/lg`, `shadow-glow` |

**Legacy compatibility:** the original `--cream*` variables are preserved so
existing inline styles keep working during incremental migration.

### Brand
KL University red is the anchor (`--brand: #dc2626`), softened to `#f87171` in
dark mode for contrast. Neutrals are warm in light mode (cream paper) and deep
slate-blue in dark mode.

---

## 2. Component classes

Token-driven, theme-aware classes in `globals.css` (`@layer components`).
Names are **backward compatible** with the existing pages.

- **Buttons** — `.btn-primary` (inverse), `.btn-brand` (KL gradient),
  `.btn-outline`, `.btn-ghost`, `.btn-sm`
- **Surfaces** — `.card`, `.card-hover`, `.glass`
- **Forms** — `.form-label`, `.form-input` (focus ring from `--ring`)
- **Badges** — `.badge-present`, `.badge-absent`, `.badge-dash`, `.chip`
- **Tables** — `.tbl-header`, `.tbl-cell`, `.tbl-row`
- **Alerts** — `.alert-info`, `.alert-success`, `.alert-warn`, `.alert-danger`
- **Feedback** — `.skeleton` (shimmer loader)

---

## 3. Motion primitives

Thin wrappers around **Framer Motion** in
[`components/ui/`](components/ui), all of which respect
`prefers-reduced-motion`.

```jsx
import { FadeIn, Stagger, Item, ProgressRing, StatCard, AnimatedNumber } from '@/components/ui';
```

| Primitive | Purpose |
|-----------|---------|
| `<FadeIn delay y>` | fade + rise on mount |
| `<Stagger gap>` + `<Item>` | choreographed list/grid entrances |
| `<Pressable>` | hover-lift + tap-scale for interactive cards |
| `<AnimatedNumber value suffix>` | count-up when scrolled into view |
| `<ProgressRing value color thresholds>` | animated attendance ring with 75/85 ticks |
| `<StatCard label value accent>` | metric tile (count-up + entrance) |

---

## 4. Where it's applied

- **`app/globals.css` / `tailwind.config.js`** — the foundation; lifts every
  page that uses the shared component classes (all admin screens, auth, etc.).
- **Student dashboard** (`app/student/page.js`) — flagship: animated
  `ProgressRing` attendance hero, staggered count-up `StatCard`s.
- **Login** (`app/login/page.js`) — feature cards modernized from hand-rolled
  mouse handlers to Framer Motion spring physics.

---

## 5. Principles

1. **One source of truth** — colors/spacing/elevation come from tokens, never
   hard-coded per component.
2. **Theme parity** — every token has a light and dark value; no `isDark ?`
   ternaries needed in new code.
3. **Motion with intent** — entrance choreography and count-ups, never gratuitous;
   always reduced-motion safe.
4. **Mobile-first** — layouts stack on small screens; the student dashboard ring
   + stats reflow to a column under `sm`.
5. **Backward compatible** — class names and legacy vars preserved so migration
   is incremental and safe.
