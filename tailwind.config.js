/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
      },
      // Semantic, token-driven colors. Consume as bg-surface, text-fg, border-line, etc.
      colors: {
        bg:            'var(--bg)',
        'bg-elevated': 'var(--bg-elevated)',
        surface:       'var(--surface)',
        'surface-2':   'var(--surface-2)',
        'surface-hover': 'var(--surface-hover)',
        line:          'var(--border)',
        'line-strong': 'var(--border-strong)',
        fg:            'var(--fg)',
        'fg-muted':    'var(--fg-muted)',
        'fg-subtle':   'var(--fg-subtle)',
        'fg-faint':    'var(--fg-faint)',
        brand:         'var(--brand)',
        'brand-strong':'var(--brand-strong)',
        'brand-soft':  'var(--brand-soft)',
        accent:        'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        success:       'var(--success)',
        'success-soft':'var(--success-soft)',
        warning:       'var(--warning)',
        'warning-soft':'var(--warning-soft)',
        danger:        'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        inverse:       'var(--inverse)',
        'inverse-fg':  'var(--inverse-fg)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        'token-sm': 'var(--shadow-sm)',
        'token-md': 'var(--shadow-md)',
        'token-lg': 'var(--shadow-lg)',
        glow:       'var(--shadow-glow)',
      },
      keyframes: {
        fadeUp:   { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeDown: { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-up':   'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'fade-down': 'fadeDown 0.3s ease both',
        'scale-in':  'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};
