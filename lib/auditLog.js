import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';

/**
 * Fire-and-forget audit logger.
 * Never throws — log failures must not break the main action.
 */
export async function logAction(admin, action, target = '', detail = '') {
  try {
    await connectDB();
    await AuditLog.create({ admin, action, target, detail });
  } catch (e) {
    console.error('[auditLog] failed to write:', e.message);
  }
}
