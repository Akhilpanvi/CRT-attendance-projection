import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/lib/models/Student';
import { getSession } from '@/lib/auth';
import { getSessions } from '@/lib/sessions';
import { attachStats } from '@/lib/batchStats';

export const dynamic = 'force-dynamic';

const FILTER_FIELDS = { name: 'name', branch: 'branch', dept: 'dept', cluster: 'cluster', crtSec: 'crtSec', crtRoom: 'crtRoom', roll: 'rollNumber' };
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = v => ({ $regex: escape(v), $options: 'i' });

/**
 * GET /api/admin/students
 *   ?page=1&limit=50       server-side pagination (limit ≤ 200)
 *   ?q=                    search name or reg. no.
 *   ?name=&branch=&dept=&cluster=&crtSec=&crtRoom=&roll=   column filters
 *   ?all=1                 every matching student (for the Excel report)
 * → { rows, total, page, limit, pages }
 */
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const sp    = new URL(request.url).searchParams;
    const all   = sp.get('all') === '1';
    const limit = Math.min(200, Math.max(10, parseInt(sp.get('limit') || '50', 10) || 50));
    let   page  = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);

    const filter = {};
    const q = (sp.get('q') || '').trim();
    if (q) filter.$or = [{ name: contains(q) }, { rollNumber: contains(q) }];
    for (const [param, field] of Object.entries(FILTER_FIELDS)) {
      const v = (sp.get(param) || '').trim();
      if (v) filter[field] = contains(v);
    }
    const filtered = Object.keys(filter).length > 0;

    await connectDB();

    const [total, sessions] = await Promise.all([Student.countDocuments(filter), getSessions()]);
    const pages = Math.max(1, Math.ceil(total / limit));
    if (page > pages) page = pages;

    let query = Student.find(filter, { _id: 0, rollNumber: 1, name: 1, branch: 1, dept: 1, cluster: 1, crtSec: 1, crtRoom: 1 })
      .sort({ sno: 1, name: 1 });
    if (!all) query = query.skip((page - 1) * limit).limit(limit);
    const students = await query.lean();

    // Send only what the table / Excel report use — keeps each page small
    const rows = (await attachStats(students, sessions, { everyone: all && !filtered }))
      .map(({ stats: { total, present, sp, overallPct }, ...s }) => ({ ...s, stats: { total, present, sp, overallPct } }));
    return NextResponse.json({ rows, total, page, limit, pages });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
