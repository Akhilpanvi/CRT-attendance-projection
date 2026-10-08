'use client';
import InfoPage, { P, UL, Mail } from '@/components/InfoPage';

const sections = [
  {
    id: 'agreement', title: 'About these terms',
    body: <P>These Terms of Use apply when you use CRT Attendance Tracker (“the Tracker”, “we”, “us”). By signing in, you agree to them. If you don’t agree, please don’t use the Tracker.</P>,
  },
  {
    id: 'who', title: 'Who can use the Tracker',
    body: <UL items={[
      'Y-24 (2024–28) students enrolled in CRT Training at KL University.',
      'CRT staff authorised to manage attendance.',
      'One account per person. Accounts may not be shared or transferred.',
    ]} />,
  },
  {
    id: 'account', title: 'Your account',
    body: <UL items={[
      'Your username is your Registration No. You must change the first-time password when asked.',
      'Keep your password private. You are responsible for activity on your account.',
      <>If you think someone else has used your account, reset your password and tell us at <Mail />.</>,
    ]} />,
  },
  {
    id: 'attendance', title: 'Attendance information',
    body: <UL items={[
      'Attendance shown on the Tracker comes from the CRT office. The CRT office’s records are final.',
      'Percentages, “sessions you can miss” and similar figures are guidance to help you plan.',
      'Self-tracked days and estimates are for your personal planning only and are not attendance records.',
      'If you think your attendance is wrong, contact the CRT office for a correction.',
    ]} />,
  },
  {
    id: 'use', title: 'Fair use',
    body: <>
      <P>Please use the Tracker responsibly. You agree not to:</P>
      <UL items={[
        'Access, or try to access, another person’s account or information.',
        'Try to break, bypass or test the Tracker’s security, or overload it with automated requests.',
        'Copy or collect data from the Tracker in bulk.',
        'Upload harmful content, or post abusive or misleading feedback.',
        'Impersonate anyone, or use the Tracker for anything unlawful.',
      ]} />
      <P>If you discover a security issue, please report it privately to <Mail /> instead of using it.</P>
    </>,
  },
  {
    id: 'assistant', title: 'CRT Y24 assistant',
    body: <UL items={[
      'The assistant gives automated answers that may sometimes be inaccurate. Always check your dashboard.',
      'It is not professional or official advice and does not change your records.',
      'Fair-use limits apply to keep it available for everyone.',
    ]} />,
  },
  {
    id: 'feedback', title: 'Feedback',
    body: <P>We welcome suggestions. By sending feedback you allow us to use it to improve the Tracker, without any obligation to you. Please keep feedback respectful.</P>,
  },
  {
    id: 'availability', title: 'Availability and changes',
    body: <P>We aim to keep the Tracker running smoothly, but it is provided “as is” and “as available”. Features may change, and the service may be paused for maintenance or updates.</P>,
  },
  {
    id: 'liability', title: 'Limitation of liability',
    body: <P>To the extent permitted by law, we are not responsible for indirect losses, or for decisions made only on estimates, self-tracked data or assistant answers. Nothing in these terms limits any right you have that cannot be limited by law.</P>,
  },
  {
    id: 'suspension', title: 'Suspension',
    body: <P>We may suspend access to an account that breaks these terms or puts the Tracker or other users at risk.</P>,
  },
  {
    id: 'law', title: 'Governing law',
    body: <P>These terms are governed by the laws of India.</P>,
  },
  {
    id: 'updates', title: 'Changes and contact',
    body: <P>We may update these terms; the date at the top shows the latest version, and important changes will be shared as a notice. Questions: <Mail />.</P>,
  },
];

export default function TermsPage() {
  return (
    <InfoPage
      kicker="Legal"
      title="Terms of Use"
      intro="The simple rules for using CRT Attendance Tracker — written to be fair and easy to read."
      updated="8 October 2026"
      sections={sections}
    />
  );
}
