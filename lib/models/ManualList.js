import mongoose from 'mongoose';

// Stores manually-flagged students for Removed / Redzone categories.
// One entry per rollNumber; uploading a new CSV upserts rather than duplicates.
const ManualListSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  status:     { type: String, enum: ['removed', 'redzone'], required: true },
  setBy:      { type: String, default: '' },   // admin username who last updated
  setAt:      { type: Date,   default: Date.now },
});

export default mongoose.models.ManualList || mongoose.model('ManualList', ManualListSchema);
