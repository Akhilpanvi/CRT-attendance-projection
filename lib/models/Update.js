import mongoose from 'mongoose';

const UpdateSchema = new mongoose.Schema({
  title:     { type: String, default: '' },
  content:   { type: String, required: true },
  category:  { type: String, enum: ['info', 'warning', 'important'], default: 'info' },
  pinned:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Update || mongoose.model('Update', UpdateSchema);
