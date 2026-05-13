import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:       { type: String, required: true, trim: true },
  branch:     { type: String, default: '' },
  dept:       { type: String, default: '' },
  cluster:    { type: String, default: '' },
  crtSec:     { type: String, default: '' },
  crtRoom:    { type: String, default: '' },
  sno:        { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now },
});

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
