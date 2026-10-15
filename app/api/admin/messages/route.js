import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';
import StudentMessage from '@/lib/models/StudentMessage';
import Student from '@/lib/models/Student';

export const dynamic = 'force-dynamic';

const admin = async () => { const s = await getSession(); return s?.role === 'admin' ? s : null; };

/** GET → every personal message with the student's name and their answer */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const msgs = await StudentMessage.find().sort({ createdAt: -1 }).limit(500).lean();
  const names = new Map((await Student.find({ rollNumber: { $in: msgs.map(m => m.rollNumber) } },
    { _id: 0, rollNumber: 1, name: 1, cluster: 1, crtSec: 1 }).lean()).map(s => [s.rollNumber, s]));
  return NextResponse.json(msgs.map(m => ({ ...m, ...names.get(m.rollNumber) })));
}

/** POST { rollNumbers: [..] | "a, b", title, body, askSolved } — body may use {name} */
export async function POST(request) {
  const session = await admin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rollNumbers, title, body, askSolved = true } = await request.json();
  const rolls = [...new Set((Array.isArray(rollNumbers) ? rollNumbers : String(rollNumbers || '').split(/[\s,;]+/))
    .map(r => String(r).trim().toUpperCase()).filter(Boolean))];
  if (!rolls.length || !title?.trim() || !body?.trim())
    return NextResponse.json({ error: 'Registration numbers, title and message are required' }, { status: 400 });

  await connectDB();
  const found = await Student.find({ rollNumber: { $in: rolls } }, { _id: 0, rollNumber: 1, name: 1 }).lean();
  const missing = rolls.filter(r => !found.some(s => s.rollNumber === r));
  if (missing.length) return NextResponse.json({ error: `No student found for: ${missing.join(', ')}` }, { status: 404 });

  const titleCase = n => (n || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  await StudentMessage.insertMany(found.map(s => ({
    rollNumber: s.rollNumber, title: title.trim().slice(0, 120),
    body: body.trim().replaceAll('{name}', titleCase(s.name) || s.rollNumber).slice(0, 2000),
    askSolved: !!askSolved, createdBy: session.username,
  })));
  await logAction(session.username, 'STUDENT_MESSAGE', rolls.join(', ').slice(0, 200), `Sent "${title.trim()}" to ${rolls.length} student(s)`);
  return NextResponse.json({ success: true, sent: rolls.length });
}

/** DELETE { id } — withdraw a message */
export async function DELETE(request) {
  const session = await admin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await request.json();
  await connectDB();
  const gone = await StudentMessage.findByIdAndDelete(id).lean();
  if (gone) await logAction(session.username, 'STUDENT_MESSAGE', gone.rollNumber, `Withdrew “${gone.title}” from ${gone.rollNumber}`);
  return NextResponse.json({ success: true });
}
