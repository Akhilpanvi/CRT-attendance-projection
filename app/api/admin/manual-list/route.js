import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ManualList from '@/lib/models/ManualList';
import Student from '@/lib/models/Student';
import { getSession } from '@/lib/auth';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

// GET — returns both lists enriched with student info (name, branch, dept, crtSec)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();
    const entries = await ManualList.find({}).lean();
    if (!entries.length)
      return NextResponse.json({ removed: [], redzone: [] });

    const rolls = entries.map(e => e.rollNumber);
    const students = await Student.find({ rollNumber: { $in: rolls } })
      .select('rollNumber name branch dept crtSec').lean();

    const sm = Object.fromEntries(students.map(s => [s.rollNumber, s]));

    const enrich = e => ({
      rollNumber: e.rollNumber,
      status:     e.status,
      setBy:      e.setBy,
      setAt:      e.setAt,
      name:       sm[e.rollNumber]?.name   || '',
      branch:     sm[e.rollNumber]?.branch || '',
      dept:       sm[e.rollNumber]?.dept   || '',
      crtSec:     sm[e.rollNumber]?.crtSec || '',
    });

    return NextResponse.json({
      removed: entries.filter(e => e.status === 'removed').map(enrich),
      redzone: entries.filter(e => e.status === 'redzone').map(enrich),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — bulk upsert: { status: 'removed'|'redzone', rollNumbers: string[] }
// Existing entries for a roll number are overwritten with the new status.
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { status, rollNumbers } = await request.json();

    if (!['removed', 'redzone'].includes(status))
      return NextResponse.json({ error: 'status must be "removed" or "redzone"' }, { status: 400 });

    const clean = (rollNumbers || [])
      .map(r => String(r).trim().toUpperCase())
      .filter(Boolean);

    if (!clean.length)
      return NextResponse.json({ error: 'No roll numbers provided' }, { status: 400 });

    await connectDB();

    await ManualList.bulkWrite(
      clean.map(rn => ({
        updateOne: {
          filter: { rollNumber: rn },
          update: { $set: { status, setBy: session.username, setAt: new Date() } },
          upsert: true,
        },
      }))
    );

    await logAction(
      session.username,
      'UPDATE_MANUAL_LIST',
      status,
      `Added ${clean.length} roll no(s) to ${status} list via CSV`
    );

    return NextResponse.json({ success: true, added: clean.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — { status } clears an entire category; { rollNumber } removes one entry
export async function DELETE(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await request.json();
    await connectDB();

    if (body.rollNumber) {
      await ManualList.deleteOne({ rollNumber: body.rollNumber.trim().toUpperCase() });
    } else if (body.status) {
      if (!['removed', 'redzone'].includes(body.status))
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      await ManualList.deleteMany({ status: body.status });
      await logAction(
        session.username,
        'UPDATE_MANUAL_LIST',
        body.status,
        `Cleared entire ${body.status} manual list`
      );
    } else {
      return NextResponse.json({ error: 'Provide status or rollNumber' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
