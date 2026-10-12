import mongoose from 'mongoose';

// Emails sent per IST day (_id = 'YYYY-MM-DD'), so the site stays inside
// the email provider's free-tier daily limit.
const MailQuotaSchema = new mongoose.Schema({
  _id:   { type: String },
  count: { type: Number, default: 0 },
}, { versionKey: false });

export default mongoose.models.MailQuota || mongoose.model('MailQuota', MailQuotaSchema);
