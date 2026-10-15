import mongoose from 'mongoose';

// A personal notice shown to one student as a floating card when they sign in.
// With askSolved, the student answers whether their issue is solved.
const StudentMessageSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, uppercase: true, trim: true, index: true },
  title:      { type: String, required: true, maxlength: 120 },
  body:       { type: String, required: true, maxlength: 2000 },
  askSolved:  { type: Boolean, default: false },
  status:     { type: String, enum: ['unread', 'read', 'solved', 'not_solved', 'dismissed'], default: 'unread' },
  reply:      { type: String, default: '', maxlength: 1000 },
  createdBy:  { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
  readAt:     { type: Date, default: null },
  answeredAt: { type: Date, default: null },
}, { versionKey: false });

export default mongoose.models.StudentMessage || mongoose.model('StudentMessage', StudentMessageSchema);
