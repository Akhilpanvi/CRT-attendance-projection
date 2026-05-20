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
              <span>Effective: 20 May 2026</span>
              <span>CRT Attendance Tracker</span>
              <span>Y-23 Batch · KL University</span>
            </div>
          </div>

          {/* Disclaimer notice */}
          <div className="mb-10 px-4 py-4 border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/10">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold">Notice:</span> This is not an official KL University platform.
              It is an independently developed tool built by a Y-23 student for voluntary attendance tracking
              during the Summer CRT Training programme. It is not affiliated with or endorsed by KLEF.
            </p>
          </div>

          <div className="space-y-10">

            <section id="overview">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Overview</h2>
              <div className="prose-sm space-y-3 text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                <p>
                  This Privacy Policy describes how the CRT Attendance Tracker ("we", "the platform", "the tracker")
                  collects, stores, and protects information belonging to students and staff of the Y-23 Summer CRT
                  Training at KL University.
                </p>
                <p>
                  By accessing this platform, you acknowledge that you have read and understood this policy.
                  Use of the tracker is entirely voluntary.
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
                      ['Full name', 'Displayed on the student dashboard and included in system emails'],
                      ['Password hash', 'Enables secure authentication; the plain-text password is never stored'],
                      ['Attendance records', 'Core purpose of the platform — slots marked Present or Absent per session'],
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
                  <p>All passwords are hashed using bcrypt with a unique salt per account before being written to the database. The plain-text password is never stored, logged, or transmitted. It is computationally infeasible to reverse a bcrypt hash.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Session Management</p>
                  <p>Authentication is handled via signed JWT tokens stored in HttpOnly, Secure cookies. HttpOnly cookies are inaccessible to client-side JavaScript, protecting against cross-site scripting (XSS) attacks.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Password Reset Tokens</p>
                  <p>Reset tokens are generated using <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">crypto.randomBytes(32)</code>, making them cryptographically random and unpredictable. Tokens expire after 2 minutes and are invalidated immediately upon use.</p>
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
                Access to data is strictly role-based. Each role can only access data that is necessary for their function.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  { role: 'Student', desc: 'May view only their own attendance records, session history, and dashboard statistics. Student data belonging to other students is not accessible.' },
                  { role: 'Admin', desc: 'May upload attendance CSVs, manage student accounts, view all records, and post notices. Cannot export or access password hashes through the interface.' },
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
                  official KL University email address (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">rollnumber@kluniversity.in</code>).
                </p>
                <p>
                  Emails are sent via Resend using the verified domain <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">kluniversity.me</code>,
                  with properly configured SPF and DKIM records to prevent spoofing. We do not send marketing,
                  promotional, or unsolicited emails.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="retention">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Data Retention</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  Student and attendance data is retained for the duration of the Y-23 Summer CRT Training programme.
                  Password reset tokens are automatically invalidated within 2 minutes of generation.
                </p>
                <p>
                  There is no automated data purge after the programme concludes. Requests for data deletion
                  can be submitted to <a href="mailto:support@kluniversity.me" className="underline underline-offset-2">support@kluniversity.me</a>.
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
                    'Request deletion of your account and associated data by writing to support@kluniversity.me.',
                    'Discontinue use of this tracker at any time. Use is entirely voluntary.',
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
                  This platform is built and maintained by a Y-23 student of KL University. For any questions,
                  data requests, or concerns regarding this privacy policy, reach out at:
                </p>
                <p>
                  <a href="mailto:support@kluniversity.me"
                     className="font-medium text-slate-800 dark:text-slate-200 underline underline-offset-2">
                    support@kluniversity.me
                  </a>
                </p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} CRT Attendance Tracker · Not an official KL University platform
            </p>
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
