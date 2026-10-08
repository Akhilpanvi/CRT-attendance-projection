'use client';
import InfoPage, { P, H3, UL, Mail } from '@/components/InfoPage';

const sections = [
  {
    id: 'overview', title: 'Overview',
    body: <>
      <P>This Privacy Policy explains what information CRT Attendance Tracker (“the Tracker”, “we”, “us”) uses, why, and the choices you have. It applies to Y-24 students and authorised CRT staff who use the Tracker.</P>
      <P>We collect only what is needed to show your attendance and run the service, and we handle it in line with applicable Indian law, including the Digital Personal Data Protection Act, 2023.</P>
    </>,
  },
  {
    id: 'collect', title: 'Information we use',
    body: <>
      <H3>Profile and attendance</H3>
      <UL items={[
        'Registration number, name, branch, department, cluster, CRT section and room — as provided in the CRT office’s attendance sheets.',
        'Session-by-session attendance, permissions and holiday markings recorded by the CRT office.',
      ]} />
      <H3>What you add</H3>
      <UL items={[
        'Your password — stored only in a protected (hashed) form. No one, including us, can read it.',
        'Days you choose to track yourself.',
        'Messages you send to the CRT Y24 assistant.',
        'Feedback you choose to send. Feedback is stored as the message you write.',
      ]} />
      <H3>Basic technical information</H3>
      <UL items={[
        'Your network address may be checked briefly to prevent spam and misuse (for example, limiting repeated feedback). It is not stored with your feedback.',
        'Our hosting provider measures page performance (such as loading speed) without advertising or cross-site tracking.',
      ]} />
      <H3>What we don’t collect</H3>
      <P>We don’t ask for your location (the weather background uses the campus location only), contacts, photos or payment details, and we don’t use advertising trackers.</P>
    </>,
  },
  {
    id: 'use', title: 'How we use it',
    body: <UL items={[
      'To show your attendance, percentage, history and the sessions you can still miss.',
      'To send password-reset emails to your university email address when you ask for one.',
      'To answer your questions through the CRT Y24 assistant.',
      'To show notices from the CRT office.',
      'To keep the service secure, prevent misuse and improve it.',
    ]} />,
  },
  {
    id: 'assistant', title: 'The CRT Y24 assistant',
    body: <>
      <P>When you use the assistant, your message and a short summary of your own attendance are sent to an AI service provider so it can write a reply. Only your own information is included — never another student’s.</P>
      <P>Your conversation is kept in your browser for the current tab only and is not saved on our servers. Please don’t share passwords or sensitive personal details in the chat. Answers can be wrong; your dashboard and the CRT office’s records are final.</P>
    </>,
  },
  {
    id: 'sharing', title: 'Who can see your information',
    body: <UL items={[
      'You can see only your own attendance.',
      'Authorised CRT staff can see attendance and profile details to manage the training.',
      'Trusted service providers (hosting, database, email delivery, the AI assistant and weather) process data only as needed to run the Tracker.',
      'We may disclose information if required by law.',
      'We never sell or rent your information.',
    ]} />,
  },
  {
    id: 'cookies', title: 'Cookies and browser storage',
    body: <UL items={[
      'One essential sign-in cookie keeps you logged in. It can’t be read by scripts and expires after 8 hours.',
      'Your browser remembers small preferences, such as light/dark mode and your chosen attendance view.',
      'No advertising cookies.',
    ]} />,
  },
  {
    id: 'security', title: 'Keeping it safe',
    body: <>
      <UL items={[
        'Connections are encrypted (HTTPS).',
        'Passwords are hashed and reset links expire after 2 minutes and can be used only once.',
        'Access is limited by role, and staff actions are logged.',
      ]} />
      <P>No online service can be completely secure. If you notice a problem, please tell us at <Mail />.</P>
    </>,
  },
  {
    id: 'retention', title: 'How long we keep it',
    body: <P>We keep attendance and account information for the duration of the CRT Training and for a reasonable period afterwards for records. After that it is deleted or anonymised. Self-tracked entries are removed when official attendance for that day is uploaded, or when you remove them.</P>,
  },
  {
    id: 'rights', title: 'Your rights',
    body: <>
      <UL items={[
        'Ask what information we hold about you.',
        'Ask us to correct information — attendance corrections are made by the CRT office.',
        'Ask us to delete information that we don’t need to keep for training records.',
        'Raise a concern or grievance about how your information is handled.',
      ]} />
      <P>Write to <Mail /> from your university email. We’ll respond within a reasonable time.</P>
    </>,
  },
  {
    id: 'changes', title: 'Changes to this policy',
    body: <P>We may update this policy from time to time. The date at the top shows the latest version, and important changes will be shared as a notice on the Tracker.</P>,
  },
  {
    id: 'contact', title: 'Contact',
    body: <P>Questions, requests or grievances: <Mail />.</P>,
  },
];

export default function PrivacyPage() {
  return (
    <InfoPage
      kicker="Legal"
      title="Privacy Policy"
      intro="Plain-language summary of how your information is used, kept safe and controlled by you."
      updated="8 October 2026"
      sections={sections}
    />
  );
}
