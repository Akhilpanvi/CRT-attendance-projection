import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
