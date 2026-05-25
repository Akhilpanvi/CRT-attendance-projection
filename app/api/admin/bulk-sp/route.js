import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Student from '@/lib/models/Student';
import { getSession } from '@/lib/auth';
import { getWeekNumber } from '@/lib/helpers';
import { logAction } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const normalizeSlot = s => s.replace(/\b(\d):/g, '0$1:');

/**
 * POST /api/admin/bulk-sp
 * Body: { entries: [{ rollNumber, date, slot }] }
 *
 * Marks each entry as SP.
 * - Slots already 'present' are skipped (cannot downgrade present → SP).
 * - Slots that don't exist yet are CREATED as SP (same behaviour as individual mark).
 * - Returns { updated, skippedPresent, notFound, errors }
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { entries } = await request.json();
    if (!Array.isArray(entries) || !entries.length)
      return NextResponse.json({ error: 'entries must be a non-empty array' }, { status: 400 });

    await connectDB();

    // Pre-fetch which roll numbers are valid students
    const rolls = [...new Set(entries.map(e => String(e.rollNumber || '').trim().toUpperCase()).filter(Boolean))];
    const validStudents = await Student.find({ rollNumber: { $in: rolls } }).select('rollNumber').lean();
    const validSet = new Set(validStudents.map(s => s.rollNumber));

    let updated = 0, skippedPresent = 0, notFound = 0;
    const errorRows = [];

    const ops = [];

    for (const raw of entries) {
      const roll = String(raw.rollNumber || '').trim().toUpperCase();
      const date = String(raw.date || '').trim();
      const slot = normalizeSlot(String(raw.slot || '').trim());

      if (!roll || !date || !slot) { errorRows.push({ roll, date, slot, reason: 'Missing field' }); continue; }
      if (!validSet.has(roll))     { notFound++;  continue; }

      // Fetch existing record for this slot (either normalized or un-normalized form)
      const slotRegex = new RegExp('^' + slot.replace(/0(\d):/g, '0?$1:') + '$');
      const existing  = await Attendance.findOne({ rollNumber: roll, date, slot: slotRegex });

      if (existing?.status === 'present') { skippedPresent++; continue; }

      const week = getWeekNumber(date);
      const year = new Date(date).getFullYear();

      if (existing) {
        ops.push(Attendance.updateOne(
          { _id: existing._id },
          { $set: { status: 'sp', slot, week, year, markedAt: new Date() } }
        ));
      } else {
        ops.push(Attendance.create({ rollNumber: roll, date, slot, status: 'sp', week, year, markedAt: new Date() }));
      }
      updated++;
    }

    // Execute all ops
    await Promise.all(ops);

    await logAction(
      session.username,
      'MARK_SP',
      '',
      `Bulk SP: ${updated} marked, ${skippedPresent} skipped (present), ${notFound} not found`
    );

    return NextResponse.json({ success: true, updated, skippedPresent, notFound, errorRows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
