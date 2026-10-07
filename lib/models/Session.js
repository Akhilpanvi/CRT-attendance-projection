import mongoose from 'mongoose';

// One document per conducted CRT session: a (date, slot, cluster) triple.
// Written by attendance uploads so stats never have to scan every
// Attendance record just to learn which sessions took place.
const SessionSchema = new mongoose.Schema({
  date:       { type: String, required: true },
  slot:       { type: String, required: true },
  cluster:    { type: String, default: '' },
  students:   { type: Number, default: 0 },   // records for this session at upload time
  present:    { type: Number, default: 0 },
  fileName:   { type: String, default: '' },
  uploadedBy: { type: String, default: '' },
  uploadedAt: { type: Date,   default: Date.now },
});
SessionSchema.index({ date: 1, slot: 1, cluster: 1 }, { unique: true });

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
