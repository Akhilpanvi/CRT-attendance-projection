import mongoose from 'mongoose';

// Admin-written facts / answers the CRT Y24 chatbot must use ("training").
const KnowledgeEntrySchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true, maxlength: 120 },
  content:   { type: String, required: true, trim: true, maxlength: 2000 },
  audience:  { type: String, enum: ['all', 'students', 'admins'], default: 'all' },
  active:    { type: Boolean, default: true },
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.KnowledgeEntry || mongoose.model('KnowledgeEntry', KnowledgeEntrySchema);
