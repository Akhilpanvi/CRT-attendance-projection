import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SelfAttendance from '@/lib/models/SelfAttendance';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'student')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const records = await SelfAttendance.find({ rollNumber: session.rollNumber.toUpperCase() }).lean();
  return NextResponse.json(records);
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'student')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, entries } = await request.json();
  if (!date || !Array.isArray(entries))
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const roll = session.rollNumber.toUpperCase();
  await connectDB();

  const ops = entries
    .filter(e => e.slot)
    .map(({ slot, status }) =>
      !status
        ? { deleteOne: { filter: { rollNumber: roll, date, slot } } }
        : { updateOne: {
            filter: { rollNumber: roll, date, slot },
            update: { $set: { status, createdAt: new Date() } },
            upsert: true,
          }}
    );

  if (ops.length) await SelfAttendance.bulkWrite(ops, { ordered: false });
  return NextResponse.json({ success: true });
}
