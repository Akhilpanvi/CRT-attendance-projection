'use client';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

const sections = [
  { id: 'overview',    label: 'Overview' },
  { id: 'collected',   label: 'Data We Collect' },
  { id: 'not-collect', label: 'Data We Do Not Collect' },
  { id: 'security',    label: 'Security Measures' },
  { id: 'access',      label: 'Access Control' },
  { id: 'email',       label: 'Email Communications' },
  { id: 'retention',   label: 'Data Retention' },
  { id: 'rights',      label: 'Your Rights' },
  { id: 'contact',     label: 'Contact' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">

      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/login" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">CRT Attendance Tracker</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 lg:flex lg:gap-16">

        {/* Sidebar TOC — desktop */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Contents</p>
            <nav className="space-y-1">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`}
                   className="block text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 py-1 transition-colors">
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Link href="/terms" className="block text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Terms of Service →
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* Title block */}
          <div className="mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Legal</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Privacy Policy</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span>Effective: 7 Oct 2026</span>
              <span>CRT Attendance Tracker</span>
              <span>Y-24 Batch · KL University</span>
            </div>
          </div>

          {/* Management review notice */}
          <div className="mb-10 px-4 py-4 border-l-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              This platform has been reviewed by the <span className="font-semibold">Pro Vice Chancellor</span> and
              the <span className="font-semibold">Director, CRT</span> at KL University.
              Attendance data is sourced directly from the <span className="font-semibold">Department of CRT</span>.
              The platform operates with the knowledge of university management.
            </p>
          </div>

          <div className="space-y-10">

            <section id="overview">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Overview</h2>
              <div className="prose-sm space-y-3 text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                <p>
                  This Privacy Policy describes how the CRT Attendance Tracker ("the platform", "we")
                  collects, stores, and protects information belonging to students and staff of the Y-24
                  CRT Training at KL University.
                </p>
                <p>
                  Attendance records displayed on this platform are sourced from the Department of CRT and
                  reflect data maintained by the CRT administration. By accessing this platform, you
                  acknowledge that you have read and understood this policy.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="collected">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Data We Collect</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                We collect only the minimum data required to operate the attendance tracking service.
              </p>
              <div className="overflow-hidden rounded border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-2/5">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {[
                      ['Registration number', 'Serves as the unique account identifier (username)'],
                      ['Full name', 'Displayed on the student dashboard and in system-generated emails'],
                      ['Password hash', 'Enables secure authentication; the plain-text password is never stored'],
                      ['Attendance records', 'Core purpose of the platform — slots marked Present, Absent, or SP per session; sourced from the Department of CRT'],
                      ['Section and batch', 'Groups students correctly within the attendance system'],
                    ].map(([d, p]) => (
                      <tr key={d} className="bg-white dark:bg-slate-900">
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 align-top">{d}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 align-top">{p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="not-collect">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Data We Do Not Collect</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                The following categories of data are not collected at any point:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                {[
                  'Phone numbers or personal contact details',
                  'Aadhaar, PAN, or government ID numbers',
                  'Device identifiers or hardware fingerprints',
                  'Geographic or IP address data',
                  'Browser history or behavioural analytics',
                  'Payment or financial information',
                  'Social media profiles or external account data',
                  'Third-party tracking or advertising data',
                ].map(i => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="security">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Security Measures</h2>
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Password Storage</p>
                  <p>All passwords are hashed using bcrypt with a unique salt per account before being written to the database. The plain-text password is never stored, logged, or transmitted.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Session Management</p>
                  <p>Authentication is handled via signed JWT tokens stored in HttpOnly, Secure cookies. HttpOnly cookies are inaccessible to client-side JavaScript, protecting against cross-site scripting (XSS) attacks.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Password Reset Tokens</p>
                  <p>Reset tokens are cryptographically random, expire after 2 minutes, and are invalidated immediately upon use.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Data at Rest and in Transit</p>
                  <p>All data is stored on MongoDB Atlas, which encrypts data at rest and enforces TLS encryption for all connections. No data is stored on personal or local devices.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">No Third-Party Tracking</p>
                  <p>No analytics, advertising, or tracking SDKs are embedded in this platform. There are no cookies beyond the authentication token.</p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="access">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Access Control</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Access to data is strictly role-based. Each role can only access data necessary for their function.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  { role: 'Student', desc: 'May view only their own attendance records, session history, and dashboard statistics. No other student\'s data is accessible.' },
                  { role: 'Admin', desc: 'May upload attendance data sourced from the Department of CRT, manage student accounts, and view all records. Cannot access password hashes through the interface.' },
                ].map(({ role, desc }) => (
                  <div key={role} className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="shrink-0 w-28 font-semibold text-slate-700 dark:text-slate-300 pt-0.5">{role}</span>
                    <p className="leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="email">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Email Communications</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  The only automated email this platform sends is a password reset link, delivered to the student's
                  official KL University email address.
                </p>
                <p>
                  We do not send marketing, promotional, or unsolicited emails of any kind.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="retention">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Data Retention</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  Student and attendance data is retained for the duration of the Y-24 CRT Training programme.
                  Password reset tokens are automatically invalidated within 2 minutes of generation.
                </p>
                <p>
                  Requests for data deletion can be submitted to{' '}
                  <a href="mailto:2300033181@kluniversity.in" className="underline underline-offset-2">2300033181@kluniversity.in</a>.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="rights">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Your Rights</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>As a user of this platform, you have the right to:</p>
                <ul className="space-y-2">
                  {[
                    'Change your account password at any time from the student dashboard.',
                    'Know what data is associated with your account — your dashboard reflects all stored records.',
                    'Request deletion of your account and associated data by writing to 2300033181@kluniversity.in.',
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="contact">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Contact</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  For any questions, data requests, or concerns regarding this privacy policy, reach out at:
                </p>
                <p>
                  <a href="mailto:2300033181@kluniversity.in"
                     className="font-medium text-slate-800 dark:text-slate-200 underline underline-offset-2">
                    2300033181@kluniversity.in
                  </a>
                </p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                A student-built attendance tracking platform for the Y-24 CRT Training at KL University.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Made by{' '}
                <a href="https://akhilpanvi.com" target="_blank" rel="noopener noreferrer"
                   className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-2 transition-colors">
                  Akhil Panvi Chakkapalli
                </a>
                {' '}· Y-23, KL University · with personal interest and easy tracking.
              </p>
            </div>
            <div className="flex gap-6 text-xs text-slate-400 dark:text-slate-500">
              <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Terms of Service</Link>
              <Link href="/login" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Sign In</Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
