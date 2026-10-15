import mongoose from 'mongoose';

// One answer per student to "Is the CRT start date we count from correct?"
const StartDateFeedbackSchema = new mongoose.Schema({
  rollNumber:    { type: String, required: true, unique: true, uppercase: true, trim: true },
  startDate:     { type: String, required: true },          // the start date the student was shown
  correct:       { type: Boolean, required: true },
  suggestedDate: { type: String, default: '' },             // YYYY-MM-DD, when they say it's wrong
  note:          { type: String, default: '', maxlength: 500 },
  updatedAt:     { type: Date, default: Date.now },
  // Earlier answers, kept whenever the student answers again (never overwritten)
  history:       { type: [{ _id: false, startDate: String, correct: Boolean, suggestedDate: String, note: String, updatedAt: Date }], default: undefined },
}, { versionKey: false });

export default mongoose.models.StartDateFeedback || mongoose.model('StartDateFeedback', StartDateFeedbackSchema);
