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
    }).then(m => { cache.conn = m; return m; })
      .catch(err => { cache.promise = null; throw err; });
  }
  await cache.promise;
  return cache.conn;
}
