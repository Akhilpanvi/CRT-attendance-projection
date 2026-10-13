import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SkyProvider } from '@/components/SkyBackground';

export const metadata = {
  title: 'CRT Attendance Tracker — KL University',
  applicationName: 'CRT Attendance Tracker',
  appleWebApp: { title: 'CRT Y24', capable: true, statusBarStyle: 'black-translucent' },
  description: 'Attendance tracker for Y-24 CRT Training students at KL University — an independent, student-developed portal, not an official university website.',
};

export const viewport = { themeColor: '#0f1b3d' };

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
      <body className="bg-bg text-fg">
        <SkyProvider>{children}</SkyProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
