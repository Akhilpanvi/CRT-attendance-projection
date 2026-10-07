import mongoose from 'mongoose';

// A CRT day an admin marked as having no class for one cluster
// (holiday, exam, event…). Days of a cluster with neither an upload nor
// a mark here are shown as "not uploaded yet".
const CalendarDaySchema = new mongoose.Schema({
  date:    { type: String, required: true },          // YYYY-MM-DD
  cluster: { type: String, required: true },          // 'C1' | 'C2'
  type:    { type: String, enum: ['holiday'], default: 'holiday' },
  reason:  { type: String, default: '' },
  setBy:   { type: String, default: '' },
  setAt:   { type: Date,   default: Date.now },
});
CalendarDaySchema.index({ date: 1, cluster: 1 }, { unique: true });

export default mongoose.models.CalendarDay || mongoose.model('CalendarDay', CalendarDaySchema);
