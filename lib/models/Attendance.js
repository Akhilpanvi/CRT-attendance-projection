import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, uppercase: true },
  date:       { type: String, required: true },
  week:       { type: Number, required: true },
  year:       { type: Number, required: true },
  slot:       { type: String, required: true },
  cluster:    { type: String, default: '' },
  status:     { type: String, enum: ['present', 'absent', 'sp'], required: true },
  markedAt:   { type: Date, default: Date.now },
});
AttendanceSchema.index({ rollNumber: 1, date: 1, slot: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, cluster: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
