'use client';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

const sections = [
  { id: 'about',       label: 'About This Service' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'use',         label: 'Acceptable Use' },
  { id: 'account',     label: 'Account Responsibility' },
  { id: 'accuracy',    label: 'Data Accuracy' },
  { id: 'availability',label: 'Availability' },
  { id: 'ip',          label: 'Intellectual Property' },
  { id: 'liability',   label: 'Limitation of Liability' },
  { id: 'changes',     label: 'Changes to Terms' },
];

export default function TermsPage() {
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
              <Link href="/privacy" className="block text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Privacy Policy →
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* Title block */}
          <div className="mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Legal</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Terms of Service</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span>Effective: 20 May 2026</span>
              <span>CRT Attendance Tracker</span>
              <span>Y-23 Batch · KL University</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mb-10 px-4 py-4 border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/10">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold">Notice:</span> This is not an official KL University platform.
              By logging in, you agree to these terms. Use of this tracker is voluntary.
            </p>
          </div>

          <div className="space-y-10">

            <section id="about">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">1. About This Service</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  CRT Attendance Tracker is a non-commercial web application developed independently by a Y-23 student
                  of KL University. It is designed to help students and the training administration track attendance
                  for the Y-23 Summer CRT Training programme.
                </p>
                <p>
                  This platform is not affiliated with, operated by, or endorsed by KL University (KLEF).
                  It is provided free of charge and on a best-effort basis.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="eligibility">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">2. Eligibility</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>This platform is intended exclusively for:</p>
                <ul className="space-y-2">
                  {[
                    'Y-23 batch students of KL University enrolled in the Summer CRT Training',
                    'CRT administrative staff responsible for attendance management',
                    'Authorised users with credentials issued by the admin',
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
                <p>Access by any party outside this group is not authorised.</p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="use">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">3. Acceptable Use</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                By using this platform, you agree to the following:
              </p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {[
                  'You will use only your own assigned credentials and will not share them with others.',
                  'You will not attempt to access, view, or modify any other student\'s data or account.',
                  'You will not submit automated, scripted, or excessive requests that may degrade service for others.',
                  'You will not attempt to reverse-engineer, exploit, or extract data from the platform.',
                  'You will report any security vulnerabilities to the admin rather than exploiting them.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="account">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">4. Account Responsibility</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  You are solely responsible for maintaining the confidentiality of your account credentials.
                  If you believe your account has been compromised, you must change your password immediately.
                </p>
                <p>
                  Default passwords are assigned by the admin. You are required to set a personal password
                  on first login. The platform is not liable for any consequences resulting from unauthorised
                  access due to credential sharing or negligence on your part.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="accuracy">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">5. Data Accuracy</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
                <p>
                  Attendance records are uploaded by the CRT administration from official registers.
                  While accuracy is maintained to the best of our ability, this tracker is a convenience
                  tool and does not constitute an official attendance record.
                </p>
                <p>
                  Any discrepancies between the data displayed here and the official record must be resolved
                  through KL University's official processes. Do not rely solely on this platform for
                  decisions regarding your academic standing.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="availability">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">6. Availability</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                This platform is hosted on a hobby-tier deployment and is provided on a best-effort basis.
                We do not guarantee uninterrupted availability, data persistence, or continued operation.
                The platform may be updated, restricted, or discontinued at any time without prior notice.
              </p>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="ip">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">7. Intellectual Property</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                The design, code, and content of this platform are the work of the developer. The KL University
                name and associated branding belong to KL University (KLEF) and are referenced solely for
                identification purposes, without implying any official affiliation or endorsement.
              </p>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="liability">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">8. Limitation of Liability</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                This service is provided "as is" without warranty of any kind. The developer shall not be
                liable for:
              </p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {[
                  'Inaccurate attendance data resulting from upload errors or administrative mistakes',
                  'Loss of data, service interruptions, or platform downtime',
                  'Any academic, professional, or personal consequences arising from use of this tracker',
                  'Actions taken on the basis of information displayed on this platform',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section id="changes">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">9. Changes to These Terms</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                These terms may be revised at any time. Continued use of the platform following any revision
                constitutes acceptance of the updated terms. The effective date at the top of this document
                will be updated to reflect any changes.
              </p>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} CRT Attendance Tracker · Not an official KL University platform
            </p>
            <div className="flex gap-6 text-xs text-slate-400 dark:text-slate-500">
              <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Privacy Policy</Link>
              <Link href="/login" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Sign In</Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
