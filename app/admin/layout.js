'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  {
    href: '/admin/upload',
    label: 'Upload CSV',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    href: '/admin/students',
    label: 'All Students',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/mark',
    label: 'Mark Attendance',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const Sidebar = ({ mobile }) => (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col h-full bg-slate-800 dark:bg-slate-950`}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded bg-white/15 border border-white/20 flex items-center
                        justify-center text-sm font-black text-white shrink-0">KL</div>
        <div>
          <div className="text-sm font-semibold text-white leading-none">CRT Portal</div>
          <div className="text-[10px] text-white/50 mt-0.5">KL University</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Navigation
        </p>
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2
                ${active
                  ? 'bg-white/10 border-white text-white font-semibold'
                  : 'border-transparent text-white/65 hover:bg-white/8 hover:text-white'}`}>
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/8 rounded px-3 py-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center
                          text-xs font-bold text-white shrink-0">A</div>
          <div>
            <div className="text-xs font-semibold text-white">CRT Admin</div>
            <div className="text-[10px] text-white/50">Administrator</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-xs font-medium text-white/75 bg-white/8 hover:bg-white/15
                     border border-white/15 rounded py-1.5 transition-colors">
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="hidden lg:block w-56 shrink-0 fixed left-0 top-0 bottom-0 z-20">
        <Sidebar />
      </div>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute left-0 top-0 bottom-0 w-56">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700
                           flex items-center px-4 gap-3 sticky top-0 z-10"
                style={{ height: 52 }}>
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            CRT Attendance Portal
          </span>
          <span className="hidden sm:block text-slate-300 dark:text-slate-600 text-xs">·</span>
          <span className="hidden sm:block text-slate-400 dark:text-slate-500 text-xs">
            2023-27 Batch · Y-23 Summer CRT Training
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 bg-slate-50 dark:bg-slate-900">{children}</main>
      </div>
    </div>
  );
}
