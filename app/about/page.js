'use client';
import InfoPage, { P, H3, UL, Mail } from '@/components/InfoPage';
import { TIME_SLOTS } from '@/lib/helpers';

const Chip = ({ bg, fg, strike, children }) => (
  <span className="inline-block text-[12px] font-bold px-2 py-1 rounded-md mr-2 mb-2 tabular-nums"
        style={{ background: bg, color: fg, textDecoration: strike ? 'line-through' : undefined }}>{children}</span>
);

const SKY = [
  ['Dawn',   'linear-gradient(135deg,#fda4af,#fdba74)', 'Soft pink and peach around sunrise.'],
  ['Day',    'linear-gradient(135deg,#fde047,#f59e0b)', 'Bright, sunny yellow.'],
  ['Sunset', 'linear-gradient(135deg,#fb923c,#e11d48)', 'Warm orange into rose.'],
  ['Night',  'linear-gradient(135deg,#6366f1,#1e1b4b)', 'Moonlit indigo with stars.'],
];

const sections = [
  {
    id: 'what', title: 'What it is',
    body: <>
      <P>CRT Attendance Tracker gives Y-24 (2024–28) CRT students one clear place to follow their attendance: your percentage, every session, and what you need to stay on track.</P>
      <P>Everything is written in plain language and designed to work well on your phone.</P>
    </>,
  },
  {
    id: 'counting', title: 'How attendance is counted',
    body: <UL items={[
      <>There are two clusters. <b>C1</b> attends on <b>Monday &amp; Tuesday</b>; <b>C2</b> on <b>Wednesday &amp; Thursday</b>. Only your own cluster’s days count for you.</>,
      <>Each CRT day has 8 sessions: {TIME_SLOTS.join(', ')}.</>,
      <>Your percentage is sessions attended ÷ sessions held for your cluster. <b>75%</b> is the minimum and <b>85%</b> is the goal.</>,
      <>A session given <b>Permission</b> by the CRT office counts as attended.</>,
      <><b>Holidays</b> and days that are <b>not uploaded yet</b> never count for or against you.</>,
      <>Attendance comes from the CRT office. If anything looks wrong, contact the CRT office — they can correct it.</>,
    ]} />,
  },
  {
    id: 'dashboard', title: 'Your dashboard',
    body: <>
      <UL items={[
        <><b>Status ring</b> — your current percentage, with markers for 75% and 85%, and one simple sentence telling you how many sessions you can still miss or need to attend.</>,
        <><b>Next CRT day</b> and the latest <b>notice</b> from the CRT office.</>,
        <><b>Recent CRT days</b> — every session of each day. Choose the view you like: <b>Chips</b> (each session’s time) or <b>Squares</b> (a compact grid). Tap a day for details.</>,
        <><b>Full history</b> — all your CRT days grouped by week.</>,
      ]} />
      <H3>What the colours mean</H3>
      <div className="mb-2">
        <Chip bg="#dcfce7" fg="#15803d">Present</Chip>
        <Chip bg="#fee2e2" fg="#b91c1c" strike>Missed</Chip>
        <Chip bg="#fef3c7" fg="#92400e">Permission</Chip>
        <Chip bg="rgba(251,191,36,0.18)" fg="#92400e">Not uploaded yet</Chip>
      </div>
      <P>These meaning colours never change, so green always means present and red always means missed.</P>
    </>,
  },
  {
    id: 'track', title: 'Tracking a day yourself',
    body: <>
      <P>If a day hasn’t been uploaded yet, tap <b>Track it</b> and mark the sessions you attended. Your dashboard then shows an <b>estimate</b> next to your official percentage.</P>
      <P>Self-tracked days are clearly labelled and appear faded. They are only for your own planning and are replaced automatically once the official attendance is uploaded.</P>
    </>,
  },
  {
    id: 'assistant', title: 'CRT Y24 — your assistant',
    body: <>
      <P>Tap <b>Ask CRT Y24</b> to ask questions such as “How many sessions can I still miss?” or “When is my next CRT day?”. It answers using your own attendance and the CRT rules.</P>
      <UL items={[
        'It only knows your own data — never another student’s.',
        'It can make mistakes. Your dashboard and the CRT office’s records are always final.',
        'Never type your password or other private details into the chat.',
      ]} />
    </>,
  },
  {
    id: 'design', title: 'The look: a sky that follows the campus',
    body: <>
      <P>The background follows the real sky at KL University. It changes through the day using today’s sunrise and sunset times:</P>
      <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
        {SKY.map(([name, bg, text]) => (
          <div key={name} className="flex items-center gap-3 rounded-2xl p-3 bg-white/40 dark:bg-white/5">
            <span className="w-9 h-9 rounded-xl shrink-0" style={{ background: bg }} />
            <span className="text-[14px] text-slate-700 dark:text-slate-200"><b>{name}</b> — {text}</span>
          </div>
        ))}
      </div>
      <P>Live campus weather adds drifting clouds, mist, rain or a thunderstorm when it’s actually happening. We only use the campus location — never yours.</P>
      <H3>One theme everywhere</H3>
      <P>Buttons, highlights and links all take their colour from the current sky, and panels are made of soft frosted glass so the sky shows through. Dark mode keeps the same idea with deeper colours.</P>
      <H3>Comfortable for everyone</H3>
      <UL items={[
        'Text is kept readable in every sky and in both light and dark mode.',
        'If your device asks for reduced motion, animations switch off.',
        'Layouts adjust for small phones, tablets and laptops.',
      ]} />
    </>,
  },
  {
    id: 'signin', title: 'Signing in',
    body: <UL items={[
      <>Your username is your <b>Registration No.</b> The first-time password is also your Registration No., and you’ll be asked to set a new one straight away.</>,
      <>Forgot your password? Use <b>Forgot password?</b> on the sign-in page. A reset link is sent to your university email and works for 2 minutes.</>,
      'Keep your password to yourself and sign out on shared computers.',
    ]} />,
  },
  {
    id: 'privacy', title: 'Your privacy in short',
    body: <>
      <UL items={[
        'You can only see your own attendance.',
        'Passwords are stored in a protected form that no one can read.',
        'No ads, and your data is never sold.',
      ]} />
      <P>Read the full <a href="/privacy" className="sky-ink font-semibold underline underline-offset-2">Privacy Policy</a> and <a href="/terms" className="sky-ink font-semibold underline underline-offset-2">Terms of Use</a>.</P>
    </>,
  },
  {
    id: 'contact', title: 'Contact',
    body: <>
      <P>Questions or suggestions about the site: <Mail />. You can also use the feedback box on the sign-in page.</P>
      <P>For corrections to your attendance, please contact the CRT office.</P>
    </>,
  },
];

export default function AboutPage() {
  return (
    <InfoPage
      kicker="About"
      title="How CRT Attendance Tracker works"
      intro="Everything you need to know about your attendance, the dashboard, the assistant and the look of the site."
      sections={sections}
    />
  );
}
