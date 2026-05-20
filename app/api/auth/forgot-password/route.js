import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function studentEmailTemplate({ name, rollNumber, requestedAt }) {
  return {
    subject: `Password Reset Request Received — ${rollNumber}`,
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
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);
                           border-radius:6px;width:32px;height:32px;text-align:center;
                           vertical-align:middle;font-size:12px;font-weight:900;color:#ffffff;">KL</td>
                <td style="padding-left:12px;color:#ffffff;font-size:14px;font-weight:600;">CRT Attendance Portal</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.08em;color:#94a3b8;">Password Reset</p>
            <h2 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0f172a;">
              Hi ${name || rollNumber},
            </h2>
            <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
              We received a password reset request for your account
              (<strong style="color:#1e293b;font-family:monospace;">${rollNumber}</strong>)
              on ${requestedAt}.
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
              The admin has been notified and will reset your password to your registration number.
              You will be prompted to set a new password on your next login.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              If you did not request this, no action is needed — your password has not been changed.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              KL University · CRT Attendance Portal · Y-23 Summer CRT Training
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

function adminEmailTemplate({ name, rollNumber, requestedAt }) {
  return {
    subject: `Password Reset Request — ${rollNumber}`,
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
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);
                           border-radius:6px;width:32px;height:32px;text-align:center;
                           vertical-align:middle;font-size:12px;font-weight:900;color:#ffffff;">
                  KL
                </td>
                <td style="padding-left:12px;color:#ffffff;font-size:14px;font-weight:600;">
                  CRT Attendance Portal
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;
                      letter-spacing:0.08em;color:#94a3b8;">Password Reset Request</p>
            <h2 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0f172a;">
              ${name || rollNumber} needs a reset
            </h2>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;
                               letter-spacing:0.06em;font-weight:600;">Student</span><br/>
                  <span style="font-size:15px;font-weight:600;color:#0f172a;margin-top:2px;
                               display:inline-block;">${name || '—'}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;
                               letter-spacing:0.06em;font-weight:600;">Registration No.</span><br/>
                  <span style="font-size:15px;font-weight:700;color:#1e293b;
                               background:#e2e8f0;padding:2px 10px;border-radius:4px;
                               margin-top:4px;display:inline-block;
                               font-family:monospace;">${rollNumber}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;
                               letter-spacing:0.06em;font-weight:600;">Requested At</span><br/>
                  <span style="font-size:13px;color:#475569;margin-top:2px;
                               display:inline-block;">${requestedAt}</span>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
              To reset this student's password, go to
              <strong style="color:#1e293b;">Admin → All Students</strong>,
              find <strong style="color:#1e293b;">${rollNumber}</strong>,
              open the detail view and click <strong style="color:#1e293b;">Reset Password</strong>.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              The password will be reset to the student's registration number and they will
              be prompted to set a new password on next login.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              KL University · CRT Attendance Portal · Y-23 Summer CRT Training
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
    const student = await Student.findOne({ rollNumber: roll }).lean();

    // Always return success to prevent reg-number enumeration
    // Only send email if student exists
    if (student) {
      const requestedAt = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      const admin   = adminEmailTemplate({ name: student.name, rollNumber: roll, requestedAt });
      const student_ = studentEmailTemplate({ name: student.name, rollNumber: roll, requestedAt });
      const studentEmail = `${roll.toLowerCase()}@kluniversity.in`;

      await Promise.all([
        transporter.sendMail({
          from:    `"CRT Portal" <${process.env.GMAIL_USER}>`,
          to:      process.env.GMAIL_USER,
          subject: admin.subject,
          html:    admin.html,
        }),
        transporter.sendMail({
          from:    `"CRT Portal" <${process.env.GMAIL_USER}>`,
          to:      studentEmail,
          subject: student_.subject,
          html:    student_.html,
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('forgot-password:', e.message);
    return NextResponse.json({ error: 'Failed to send request. Try again.' }, { status: 500 });
  }
}
