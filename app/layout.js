import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'CRT Attendance Portal — KL University',
  description: '2023-27 Batch Y-23 Summer CRT Training',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        ` }} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
