import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import StartDateFeedback from '@/lib/models/StartDateFeedback';
import { TRAINING_START } from '@/lib/attendanceCalc';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function student() {
  const s = await getSession();
  return s?.role === 'student' && s.rollNumber ? s.rollNumber.toUpperCase() : null;
}

/** GET → { startDate, mine: { correct, suggestedDate, note } | null } */
export async function GET() {
  const roll = await student();
  if (!roll) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const mine = await StartDateFeedback.findOne({ rollNumber: roll, startDate: TRAINING_START },
    { _id: 0, correct: 1, suggestedDate: 1, note: 1 }).lean();
  return NextResponse.json({ startDate: TRAINING_START, mine });
}

/** POST { correct, suggestedDate?, note? } — saves or replaces this student's answer */
export async function POST(request) {
  const roll = await student();
  if (!roll) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { correct, suggestedDate = '', note = '' } = await request.json();
  if (typeof correct !== 'boolean')
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
  if (suggestedDate && !DATE_RE.test(suggestedDate))
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  if (!correct && !suggestedDate && !note.trim())
    return NextResponse.json({ error: 'Tell us the correct start date or what is wrong.' }, { status: 400 });

  await connectDB();
  await StartDateFeedback.updateOne(
    { rollNumber: roll },
    { $set: {
        startDate: TRAINING_START, correct,
        suggestedDate: correct ? '' : suggestedDate,
        note: correct ? '' : String(note).trim().slice(0, 500),
        updatedAt: new Date(),
    } },
    { upsert: true },
  );
  return NextResponse.json({ success: true });
}
