import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import User from '@/lib/models/User';

function resetEmailTemplate({ name, rollNumber, resetLink, expiresIn }) {
  return {
    subject: `Reset your CRT Portal password — ${rollNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);
                         border-radius:6px;width:32px;height:32px;text-align:center;
                         vertical-align:middle;font-size:12px;font-weight:900;color:#ffffff;">KL</td>
              <td style="padding-left:12px;color:#ffffff;font-size:14px;font-weight:600;">CRT Attendance Tracker</td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.08em;color:#94a3b8;">Password Reset</p>
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">
              Hi ${name || rollNumber},
            </h2>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
              We received a request to reset the password for your account
              (<strong style="color:#1e293b;font-family:monospace;">${rollNumber}</strong>).
              Click the button below to set a new password.
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#1e293b;border-radius:6px;">
                  <a href="${resetLink}"
                     style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;
                            font-weight:600;text-decoration:none;border-radius:6px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;line-height:1.5;">
              This link expires in <strong>${expiresIn}</strong>. If you did not request a reset,
              ignore this email — your password will not change.
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;word-break:break-all;">
              ${resetLink}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-align:center;">
              KL University · CRT Attendance Tracker · Y-23 Summer CRT Training
            </p>
            <p style="margin:0;font-size:10px;color:#cbd5e1;text-align:center;">
              Not an official KL University platform. Made by a Y23 student with personal interest.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function POST(request) {
  try {
    const { rollNumber } = await request.json();
    if (!rollNumber?.trim())
      return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });

    const roll = rollNumber.trim().toUpperCase();

    await connectDB();

    const [student, user] = await Promise.all([
      Student.findOne({ rollNumber: roll }).lean(),
      User.findOne({ username: roll }),
    ]);

    // Always return success to prevent enumeration
    if (user) {
      const isAdmin  = user.role === 'admin' || user.role === 'aprameya';
      const toEmail  = isAdmin ? user.email?.trim() : `${roll.toLowerCase()}@kluniversity.in`;
      const toName   = isAdmin ? (user.username) : (student?.name || roll);

      // For admins without a stored email, silently skip (return success below)
      if (toEmail) {
        const token  = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        user.resetToken       = token;
        user.resetTokenExpiry = expiry;
        await user.save();

        const origin    = request.headers.get('origin') || `https://${request.headers.get('host')}`;
        const resetLink = `${origin}/reset-password?token=${token}`;

        const { subject, html } = resetEmailTemplate({
          name:       toName,
          rollNumber: roll,
          resetLink,
          expiresIn:  '2 minutes',
        });

        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from:    'Change Password <noreply@kluniversity.me>',
          to:      toEmail,
          subject,
          html,
        });
        if (result.error) throw new Error(result.error.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('forgot-password error:', e);
    return NextResponse.json({ error: e.message || 'Failed to send request. Try again.' }, { status: 500 });
  }
}
