import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crt_attendance';

if (!global._mongoCache) global._mongoCache = { conn: null, promise: null };
const cache = global._mongoCache;

export async function connectDB() {
  if (cache.conn?.connection?.readyState === 1) return cache.conn;
  if (!cache.promise) {
    mongoose.set('bufferCommands', false);
    cache.promise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then(async m => {
      cache.conn = m;
      if (!global._sysInit) { global._sysInit = true; ensureSystemUsers(); }
      return m;
    }).catch(err => { cache.promise = null; throw err; });
  }
  await cache.promise;
  return cache.conn;
}

async function ensureSystemUsers() {
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const User   = (await import('./models/User.js')).default;

    if (!await User.findOne({ username: 'CRT' })) {
      await User.create({ username: 'CRT', passwordHash: await bcrypt.hash('CRT999', 10), role: 'admin' });
    }
    const aprameya = await User.findOne({ username: 'Aprameya' });
    if (!aprameya) {
      await User.create({ username: 'Aprameya', passwordHash: await bcrypt.hash('Ap2026', 10), role: 'aprameya' });
    } else {
      // Update password if it changed
      const correct = await bcrypt.compare('Ap2026', aprameya.passwordHash);
      if (!correct) await aprameya.updateOne({ passwordHash: await bcrypt.hash('Ap2026', 10) });
    }
  } catch (e) {
    console.error('ensureSystemUsers:', e.message);
  }
}
