'use client';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-wider">{title}</h2>
    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{children}</div>
  </div>
);

export default function TermsPage() {
  const router  = useRouter();
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: {updated} &nbsp;·&nbsp; CRT Attendance Tracker &nbsp;·&nbsp; KL University Y-23 Batch
          </p>
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>Important:</strong> This is not an official KL University platform. It is a student-built tool
              for voluntary use. By logging in, you agree to these terms.
            </p>
          </div>
        </div>

        <Section title="1. About This Service">
          <p>
            CRT Attendance Tracker is an independently built, non-commercial web application created by a Y-23 student
            of KL University to help students and faculty track attendance for the Summer CRT Training programme.
            It is not affiliated with, endorsed by, or operated by KL University (KLEF).
          </p>
          <p>
            This service is provided free of charge, voluntarily, and without any official backing. Continued
            availability is not guaranteed.
          </p>
        </Section>

        <Section title="2. Who Can Use This">
          <p>This tracker is intended exclusively for:</p>
          <ul className="mt-2 space-y-1 list-none">
            {[
              'Y-23 batch students of KL University enrolled in the Summer CRT Training',
              'CRT admin staff responsible for attendance management',
              'Authorised viewers with credentials issued by the admin',
            ].map(r => (
              <li key={r} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-2">Access by anyone outside this group is not permitted.</p>
        </Section>

        <Section title="3. Acceptable Use">
          <p>By using this service, you agree to:</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Use your own credentials only. Do not share your login with others.',
              'Not attempt to access other students\' accounts or data.',
              'Not spam the server with automated or repeated requests.',
              'Not attempt to reverse-engineer, scrape, or exploit the platform.',
              'Report any bugs or security issues to the admin instead of exploiting them.',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Account Responsibility">
          <p>
            You are responsible for keeping your password confidential. If you believe your account has been
            compromised, change your password immediately or contact the admin. The platform is not liable
            for any loss resulting from unauthorised access due to your own negligence.
          </p>
          <p>
            Students are assigned default passwords by the admin. You are required to change your password
            on first login. Do not reuse passwords you use on other platforms.
          </p>
        </Section>

        <Section title="5. Data Accuracy">
          <p>
            Attendance data is uploaded by the CRT admin from official records. While every effort is made to
            ensure accuracy, this tracker is a convenience tool — it is not the official attendance register.
            Discrepancies should be reported to the CRT admin and resolved through official KL University channels.
          </p>
          <p>
            Do not rely solely on this tracker for decisions about your academic standing.
          </p>
        </Section>

        <Section title="6. Availability">
          <p>
            This is a hobby project hosted on Vercel's free/hobby tier. We do not guarantee 100% uptime,
            data availability, or continued operation of the service. The platform may be taken down, updated,
            or modified at any time without notice.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The source code, design, and content of this tracker are created by the developer. The KL University
            name and branding are property of KL University (KLEF) and are referenced here only for identification
            purposes — not to imply official affiliation.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            This service is provided "as is" without any warranties. The developer is not responsible for:
          </p>
          <ul className="mt-2 space-y-1 list-none">
            {[
              'Incorrect attendance data caused by upload errors',
              'Service downtime or data loss',
              'Any academic consequences arising from use of this tracker',
              'Actions taken based on information displayed on this platform',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>
            These terms may be updated at any time. Continued use of the platform after any update constitutes
            acceptance of the revised terms. The "Last updated" date at the top of this page will reflect any changes.
          </p>
        </Section>

        <Section title="10. Governing Context">
          <p>
            This platform operates within the context of KL University's Summer CRT Training programme.
            Any disputes or concerns should be raised with the CRT admin. This is not a legal contract —
            it is a good-faith agreement between the developer and users of a free student tool.
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-2 flex flex-col items-center gap-2">
          <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-500">
            <a href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
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
