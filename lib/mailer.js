import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import MailQuota from '@/lib/models/MailQuota';
import { todayISO } from '@/lib/helpers';

/**
 * Free email tiers, tried in order. Each has its own daily cap (per IST day)
 * so one running out falls through to the next instead of failing.
 *   Resend free: 100/day   → we use 90
 *   Gmail SMTP:  ~500/day  → we use 400
 */
const PROVIDERS = [
  {
    name: 'resend',
    quotaKey: day => day,                       // original key, keeps existing counts
    cap: Number(process.env.RESET_MAIL_DAILY_CAP) || 90,
    enabled: () => !!process.env.RESEND_API_KEY,
    async send({ to, subject, html, fromName }) {
      const r = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: `${fromName} <noreply@kluniversity.me>`, to, subject, html,
      });
      if (r.error) throw new Error(r.error.message);
    },
  },
  {
    name: 'gmail',
    quotaKey: day => `gmail:${day}`,
    cap: Number(process.env.GMAIL_DAILY_CAP) || 400,
    enabled: () => !!(process.env.GMAIL_USER && process.env.GMAIL_PASS),
    async send({ to, subject, html, fromName }) {
      const t = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS } });
      await t.sendMail({ from: `${fromName} <${process.env.GMAIL_USER}>`, to, subject, html });
    },
  },
];

async function claim(key, cap) {
  try {
    await MailQuota.updateOne({ _id: key, count: { $lt: cap } }, { $inc: { count: 1 } }, { upsert: true });
    return true;
  } catch (e) {
    if (e.code === 11000) return false;         // today's doc exists and is at the cap
    throw e;
  }
}

/**
 * Send one email through the first provider with quota left.
 * Returns the provider name, or null when every provider is used up today.
 * Throws only if every provider that had quota failed to send.
 */
export async function sendMail({ to, subject, html, fromName = 'CRT Attendance Tracker' }) {
  const day = todayISO();
  let lastError = null;
  for (const p of PROVIDERS) {
    if (!p.enabled()) continue;
    const key = p.quotaKey(day);
    if (!(await claim(key, p.cap))) continue;
    try {
      await p.send({ to, subject, html, fromName });
      return p.name;
    } catch (e) {
      console.error(`[mailer] ${p.name} failed:`, e.message);
      lastError = e;
      await MailQuota.updateOne({ _id: key }, { $inc: { count: -1 } });   // didn't go out
    }
  }
  if (lastError) throw lastError;
  return null;
}
