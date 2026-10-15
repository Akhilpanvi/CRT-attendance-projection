import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import StudentMessage from '@/lib/models/StudentMessage';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

// Pipeline updates read "$text" as a field path; $literal keeps student text as plain values
const literal = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { $literal: v }]));

async function student() {
  const s = await getSession();
  return s?.role === 'student' && s.rollNumber ? s.rollNumber.toUpperCase() : null;
}

/** GET → messages still waiting for this student (unread, or a question not yet answered) */
export async function GET() {
  const roll = await student();
  if (!roll) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const open = await StudentMessage.find({ rollNumber: roll, status: { $in: ['unread', 'read'] } },
    { title: 1, body: 1, askSolved: 1, status: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(open);
}

/** POST { id, action: 'read' | 'dismiss' | 'solved' | 'not_solved', reply? } */
export async function POST(request) {
  const roll = await student();
  if (!roll) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, action, reply = '' } = await request.json();
  if (!isValidObjectId(id) || !['read', 'dismiss', 'solved', 'not_solved'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  await connectDB();
  const now = new Date();
  const set = action === 'read'    ? { status: 'read', readAt: now }
            : action === 'dismiss' ? { status: 'dismissed', answeredAt: now }
            : { status: action, reply: String(reply).trim().slice(0, 1000), answeredAt: now };
  // Only the owner can update; 'read' never overrides an answer
  const filter = { _id: id, rollNumber: roll, ...(action === 'read' ? { status: 'unread' } : {}) };
  // Answering also counts as reading, keeping the first read time
  const r = await StudentMessage.updateOne(filter, [{ $set: { ...literal(set), readAt: { $ifNull: ['$readAt', now] } } }]);
  if (r.modifiedCount && action !== 'read') {
    const m = await StudentMessage.findById(id, { title: 1 }).lean();
    const what = { solved: 'Answered: issue solved', not_solved: 'Answered: still a problem', dismiss: 'Read and closed' }[action];
    await logAction(roll, 'MESSAGE_ANSWER', roll, `${what} — “${m?.title}”${set.reply ? ` · “${set.reply}”` : ''}`.slice(0, 500));
  }
  return NextResponse.json({ success: true });
}
