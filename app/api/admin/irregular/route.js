import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import Attendance from '@/lib/models/Attendance';
import { getSession } from '@/lib/auth';
import { TIME_SLOTS } from '@/lib/helpers';

const MORNING   = TIME_SLOTS.slice(0, 4);
const AFTERNOON = TIME_SLOTS.slice(4);

function detectPattern(slotMap) {
  const morningStatuses   = MORNING.map(s => slotMap[s]).filter(Boolean);
  const afternoonStatuses = AFTERNOON.map(s => slotMap[s]).filter(Boolean);
  const all = [...morningStatuses, ...afternoonStatuses];

  if (all.length < 2) return null;

  const mP = morningStatuses.filter(s => s === 'present').length;
  const mA = morningStatuses.filter(s => s === 'absent').length;
  const aP = afternoonStatuses.filter(s => s === 'present').length;
  const aA = afternoonStatuses.filter(s => s === 'absent').length;

  // Morning only — attended morning, absent all afternoon
  if (mP > 0 && mA === 0 && aA > 0 && aP === 0) return 'morning_only';

  // Afternoon only — absent all morning, present in afternoon
  if (mA > 0 && mP === 0 && aP > 0) return 'afternoon_only';

  // Left and returned — present → absent → present gap
  let seenP = false, seenAafter = false;
  for (const s of all) {
    if (s === 'present') {
      if (seenAafter) return 'left_and_returned';
      seenP = true;
    } else if (s === 'absent' && seenP) {
      seenAafter = true;
    }
  }

  // Left early — last recorded slot is absent, had present before
  if (all[all.length - 1] === 'absent' && all.some(s => s === 'present')) return 'left_early';

  // Came late — first recorded slot is absent, attended later
  if (all[0] === 'absent' && all.some(s => s === 'present')) return 'came_late';

  return null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await connectDB();
    const [students, records] = await Promise.all([
      Student.find().lean(),
      Attendance.find().lean(),
    ]);

    const studentMap = {};
    for (const s of students) studentMap[s.rollNumber] = s;

    // Group by student → date
    const byStudentDate = {};
    for (const r of records) {
      if (!byStudentDate[r.rollNumber]) byStudentDate[r.rollNumber] = {};
      if (!byStudentDate[r.rollNumber][r.date]) byStudentDate[r.rollNumber][r.date] = {};
      byStudentDate[r.rollNumber][r.date][r.slot] = r.status;
    }

    const LABELS = {
      morning_only:      'Left after morning',
      afternoon_only:    'Came in afternoon only',
      left_and_returned: 'Left & returned',
      left_early:        'Left before last session',
      came_late:         'Came late',
    };

    const result = [];
    for (const [roll, dateMap] of Object.entries(byStudentDate)) {
      const irregularDays = [];
      for (const [date, slotMap] of Object.entries(dateMap)) {
        const pattern = detectPattern(slotMap);
        if (pattern) irregularDays.push({ date, pattern, label: LABELS[pattern] });
      }
      if (irregularDays.length > 0) {
        const s = studentMap[roll];
        result.push({
          rollNumber: roll,
          name:       s?.name    || roll,
          branch:     s?.branch  || '',
          dept:       s?.dept    || '',
          crtSec:     s?.crtSec  || '',
          irregularDays: irregularDays.sort((a, b) => b.date.localeCompare(a.date)),
          count: irregularDays.length,
        });
      }
    }

    result.sort((a, b) => b.count - a.count);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
