import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Policy from '@/lib/models/Policy';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  removed: [
    'Students must meet Director CRT along with Parents to be added back to the program.',
    'Until then, their status remains REMOVED.',
    'Students must continue attending CRT sections and attendance will continue to be monitored.',
  ],
  redzone: [
    'Students will face limited placement opportunities or restricted placement eligibility.',
    'Students must continue in CRT sections and their attendance will be monitored carefully.',
  ],
};

// GET — public, used by student page and admin removal page
export async function GET() {
  try {
    await connectDB();
    const [removed, redzone] = await Promise.all([
      Policy.findOne({ key: 'removed' }).lean(),
      Policy.findOne({ key: 'redzone' }).lean(),
    ]);
    return NextResponse.json({
      removed: removed?.lines?.length ? removed.lines : DEFAULTS.removed,
      redzone: redzone?.lines?.length ? redzone.lines : DEFAULTS.redzone,
    });
  } catch (e) {
    // On error fall back to defaults so the page always renders
    return NextResponse.json({ removed: DEFAULTS.removed, redzone: DEFAULTS.redzone });
  }
}

// POST — admin only, upserts a category's lines
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { key, lines } = await request.json();
    if (!['removed', 'redzone'].includes(key))
      return NextResponse.json({ error: 'key must be removed or redzone' }, { status: 400 });
    if (!Array.isArray(lines) || lines.some(l => typeof l !== 'string'))
      return NextResponse.json({ error: 'lines must be an array of strings' }, { status: 400 });

    const clean = lines.map(l => l.trim()).filter(Boolean);
    if (!clean.length)
      return NextResponse.json({ error: 'At least one line is required' }, { status: 400 });

    await connectDB();
    await Policy.findOneAndUpdate(
      { key },
      { $set: { lines: clean, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ success: true, key, lines: clean });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
