'use client';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import useScrolled from '@/components/useScrolled';

export const CONTACT_EMAIL = 'contact@akhilpanvi.com';

/* Small typographic helpers for long-form pages */
export const P  = ({ children }) => <p className="text-[15px] leading-7 text-slate-700 dark:text-slate-200 mb-3">{children}</p>;
export const H3 = ({ children }) => <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mt-5 mb-1.5">{children}</h3>;
export const UL = ({ items }) => (
  <ul className="space-y-2 mb-3">
    {items.map((it, i) => (
      <li key={i} className="flex gap-2.5 text-[15px] leading-7 text-slate-700 dark:text-slate-200">
        <span className="sky-dot mt-[11px] w-1.5 h-1.5 rounded-full shrink-0" />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);
export const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`} className="sky-ink font-semibold underline underline-offset-2">{CONTACT_EMAIL}</a>;

/**
 * Shared layout for About / Privacy / Terms.
 * @param {{ kicker, title, intro, updated?, sections: Array<{ id, title, body }> }} props
 */
export default function InfoPage({ kicker, title, intro, updated, sections }) {
  const scrolled = useScrolled();
  return (
    <div className="min-h-screen">
      <header className={`sticky top-0 z-30 transition-all duration-300 border-b ${scrolled
        ? 'bg-white/55 dark:bg-slate-950/55 backdrop-blur-xl backdrop-saturate-150 border-white/60 dark:border-white/10'
        : 'bg-transparent border-transparent'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:opacity-80">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
            Back to sign in
          </Link>
          <span className="text-sm font-bold text-slate-900 dark:text-white ml-2 hidden sm:inline">CRT Attendance <span className="sky-text">Tracker</span></span>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-14">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest sky-ink">{kicker}</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1.5">{title}</h1>
          {intro && <p className="text-[15px] leading-7 text-slate-600 dark:text-slate-300 mt-3 max-w-2xl">{intro}</p>}
          {updated && <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Last updated: {updated}</p>}
        </div>

        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
          <nav aria-label="On this page" className="glass rounded-2xl p-4 lg:sticky lg:top-20 hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">On this page</p>
            <ol className="space-y-1">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block text-[13px] py-1 text-slate-600 dark:text-slate-300 hover:underline">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-4 min-w-0">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="glass rounded-3xl p-5 sm:p-7 scroll-mt-20">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">
                  <span className="sky-ink mr-2">{i + 1}.</span>{s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/about" className="hover:underline">About</Link>
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="hover:underline">Terms of Use</Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">{CONTACT_EMAIL}</a>
        <span>Y-24 CRT Training · KL University</span>
      </footer>
    </div>
  );
}
