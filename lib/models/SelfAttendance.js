import mongoose from 'mongoose';

const SelfAttendanceSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, uppercase: true },
  date:       { type: String, required: true },
  slot:       { type: String, required: true },
  status:     { type: String, enum: ['present', 'absent'], required: true },
  createdAt:  { type: Date, default: Date.now },
});

SelfAttendanceSchema.index({ rollNumber: 1, date: 1, slot: 1 }, { unique: true });

export default mongoose.models.SelfAttendance || mongoose.model('SelfAttendance', SelfAttendanceSchema);
