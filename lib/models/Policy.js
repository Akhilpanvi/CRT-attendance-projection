import mongoose from 'mongoose';

// Stores the editable bullet-point text for each attendance category.
// key: 'removed' | 'redzone'
const PolicySchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true }, // 'removed' | 'redzone'
  lines:     { type: [String], default: [] },                // bullet points
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Policy || mongoose.model('Policy', PolicySchema);
