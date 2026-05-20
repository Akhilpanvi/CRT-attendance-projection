'use client';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-wider">{title}</h2>
    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{children}</div>
  </div>
);

const Point = ({ icon, title, desc }) => (
  <div className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
    <span className="text-base shrink-0 mt-0.5">{icon}</span>
    <div>
      <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{title}</p>
      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default function PrivacyPage() {
  const router = useRouter();
  const updated = '20 May 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black
                              text-white bg-slate-800 dark:bg-slate-600">KL</div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">CRT Attendance Tracker</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Legal</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: {updated} &nbsp;·&nbsp; CRT Attendance Tracker &nbsp;·&nbsp; KL University Y-23 Batch
          </p>
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>Disclaimer:</strong> This is not an official KL University platform. It is built and maintained
              by a Y-23 student with personal interest for easy attendance tracking. Use of this tracker is voluntary.
            </p>
          </div>
        </div>

        {/* Security practices */}
        <Section title="Security Practices">
          <div className="grid gap-3">
            <Point
              icon="🔒"
              title="Passwords are never stored in plain text"
              desc="All passwords are hashed using bcrypt with a secure salt before being stored in the database. We cannot read or recover your password — only you know it."
            />
            <Point
              icon="🎟️"
              title="Session tokens are secure and short-lived"
              desc="Authentication uses signed JWT tokens stored in HttpOnly cookies, making them inaccessible to JavaScript and resistant to XSS attacks. Sessions expire automatically."
            />
            <Point
              icon="⏱️"
              title="Password reset links expire in 2 minutes"
              desc="Reset links are single-use, cryptographically random tokens. They expire within 2 minutes of generation and are invalidated immediately after use."
            />
            <Point
              icon="🗄️"
              title="Data stored on MongoDB Atlas"
              desc="All data is stored on MongoDB Atlas (cloud), which is encrypted at rest and in transit using TLS. No data is stored locally on any personal device."
            />
            <Point
              icon="📧"
              title="Email delivery via Resend"
              desc="Password reset emails are sent through Resend using our verified domain (kluniversity.me) with proper SPF and DKIM records to prevent spoofing."
            />
            <Point
              icon="🚫"
              title="No third-party tracking or ads"
              desc="We do not use Google Analytics, Meta Pixel, or any advertising or tracking SDK. Your usage data is not sold or shared with any third party."
            />
          </div>
        </Section>

        {/* Data we collect */}
        <Section title="Data We Collect">
          <p>We only collect data that is necessary to run the attendance tracker:</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-300">Data</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-300">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {[
                  ['Registration number', 'Used as your unique username to identify your account'],
                  ['Name', 'Displayed on your dashboard and used in emails'],
                  ['Password hash', 'To authenticate you — never the plain-text password'],
                  ['Attendance records', 'Core purpose of the tracker — slots marked Present/Absent'],
                  ['Section / batch info', 'To group students correctly in the attendance system'],
                ].map(([d, w]) => (
                  <tr key={d} className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{d}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* What we don't collect */}
        <Section title="What We Do NOT Collect">
          <div className="grid grid-cols-2 gap-2">
            {[
              'Phone numbers',
              'Aadhaar / ID numbers',
              'Location data',
              'Device identifiers',
              'Browser fingerprints',
              'IP address logs',
              'Payment information',
              'Social media profiles',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </Section>

        {/* Access control */}
        <Section title="Access Control">
          <p>Access to data is strictly role-based:</p>
          <div className="mt-3 space-y-2">
            {[
              { role: 'Student', access: 'Can only view their own attendance, percentage, and dashboard. Cannot see other students\' data.' },
              { role: 'Admin (CRT)', access: 'Can upload attendance CSVs, manage student profiles, view all records, and post notices. Cannot export passwords.' },
              { role: 'Aprameya', access: 'Read-only access to aggregated attendance data for reporting purposes.' },
            ].map(({ role, access }) => (
              <div key={role} className="flex gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <span className="text-xs font-bold text-white bg-slate-700 dark:bg-slate-600 px-2 py-0.5 rounded h-fit shrink-0">{role}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{access}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Data retention */}
        <Section title="Data Retention">
          <p>
            Attendance and student data is retained for the duration of the CRT training programme (Y-23 Summer CRT).
            Password reset tokens are automatically deleted within 2 minutes. There is no automated data deletion
            after the programme ends — data may be manually cleared by the admin.
          </p>
        </Section>

        {/* Your rights */}
        <Section title="Your Rights">
          <p>As a student using this tracker, you have the right to:</p>
          <ul className="mt-2 space-y-1 list-none">
            {[
              'Change your password at any time from your dashboard',
              'Request deletion of your account by contacting the admin',
              'Know what data is stored about you (your dashboard shows all of it)',
              'Stop using this tracker at any time — it is completely voluntary',
            ].map(r => (
              <li key={r} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <p>
            This tracker is maintained by a Y-23 KL University student. For questions, concerns, or data requests,
            contact the CRT admin directly through the institution. This platform has no official support channel.
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-2 flex flex-col items-center gap-2">
          <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-500">
            <a href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms of Service</a>
            <span>·</span>
            <a href="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Back to Login</a>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
            CRT Attendance Tracker &nbsp;·&nbsp; Not an official KL University platform &nbsp;·&nbsp;
            Made by a Y23 student with personal interest<br />
            © {new Date().getFullYear()} KL University
          </p>
        </div>
      </div>
    </div>
  );
}
