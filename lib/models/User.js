import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username:           { type: String, required: true, unique: true },
  passwordHash:       { type: String, required: true },
  role:               { type: String, enum: ['admin', 'student', 'aprameya'], default: 'student' },
  rollNumber:         { type: String, default: '' },
  mustChangePassword: { type: Boolean, default: false },
  resetToken:         { type: String, default: null },
  resetTokenExpiry:   { type: Date,   default: null },
  createdAt:          { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
