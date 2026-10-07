// Run: node scripts/fix-duplicate-users.mjs
// Add --delete flag to actually remove the duplicates after reviewing the dry-run output.

import mongoose from 'mongoose';
import fs from 'fs';

// Read MONGO_URI from the environment or the project's .env — never hardcode credentials
const MONGO_URI = process.env.MONGO_URI || (fs.existsSync('.env')
  ? fs.readFileSync('.env', 'utf8').match(/^MONGO_URI=(.*)$/m)?.[1]?.trim()
  : undefined);
if (!MONGO_URI) { console.error('MONGO_URI not set (env or .env)'); process.exit(1); }
const DRY_RUN  = !process.argv.includes('--delete');

const UserSchema = new mongoose.Schema({
  username:           String,
  passwordHash:       String,
  role:               String,
  rollNumber:         String,
  mustChangePassword: Boolean,
  resetToken:         String,
  resetTokenExpiry:   Date,
  createdAt:          Date,
}, { strict: false });

const User = mongoose.model('User', UserSchema);

await mongoose.connect(MONGO_URI);
console.log('Connected.\n');

// Find all usernames that appear more than once
const dupes = await User.aggregate([
  { $group: { _id: '$username', count: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { count: { $gt: 1 } } },
]);

if (dupes.length === 0) {
  console.log('No duplicate usernames found.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`Found ${dupes.length} username(s) with duplicates:\n`);

const toDelete = [];

for (const group of dupes) {
  const users = await User.find({ username: group._id }).lean();

  console.log(`--- Username: "${group._id}" (${users.length} records) ---`);
  for (const u of users) {
    console.log(`  _id: ${u._id}  mustChangePassword: ${u.mustChangePassword}  role: ${u.role}  createdAt: ${u.createdAt}`);
  }

  // Keep: mustChangePassword === false (active account)
  // Delete: mustChangePassword === true (never used, still on default password)
  const keep   = users.filter(u => u.mustChangePassword === false);
  const remove = users.filter(u => u.mustChangePassword === true);

  // Safety: only delete if there's at least one keeper
  if (keep.length === 0) {
    console.log(`  ⚠️  SKIP — all copies have mustChangePassword=false, cannot determine which to remove safely.\n`);
    continue;
  }

  if (remove.length === 0) {
    console.log(`  ⚠️  SKIP — no copy has mustChangePassword=true, nothing to remove.\n`);
    continue;
  }

  for (const u of remove) {
    console.log(`  → WILL DELETE _id: ${u._id}  (mustChangePassword: true)`);
    toDelete.push(u._id);
  }
  console.log(`  → WILL KEEP   _id: ${keep.map(k => k._id).join(', ')}  (mustChangePassword: false)\n`);
}

if (toDelete.length === 0) {
  console.log('\nNothing safe to delete.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`\nTotal to delete: ${toDelete.length}`);

if (DRY_RUN) {
  console.log('\n[DRY RUN] No changes made. Re-run with --delete to apply.\n');
} else {
  const result = await User.deleteMany({ _id: { $in: toDelete } });
  console.log(`\n✅ Deleted ${result.deletedCount} duplicate user(s).\n`);
}

await mongoose.disconnect();
