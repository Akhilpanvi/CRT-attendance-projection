import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  admin:     { type: String, required: true },          // username who did the action
  action:    { type: String, required: true },          // e.g. 'LOGIN', 'UPLOAD_CSV'
  target:    { type: String, default: '' },             // roll number / filename / etc.
  detail:    { type: String, default: '' },             // human-readable description
  createdAt: { type: Date,   default: Date.now, index: true },
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
