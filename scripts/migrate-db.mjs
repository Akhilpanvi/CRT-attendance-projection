// Copy every collection (documents + indexes) from one database to another
// on the same cluster. The source database is never modified.
//
// Run: node scripts/migrate-db.mjs [from] [to]      (default: test → Y24)
// Refuses to touch a target collection that already has documents, so it
// never overwrites data. Nothing is ever deleted.

import { createRequire } from 'module';
import fs from 'fs';

const mongoose = createRequire(import.meta.url)('mongoose');

const MONGO_URI = process.env.MONGO_URI || (fs.existsSync('.env')
  ? fs.readFileSync('.env', 'utf8').match(/^MONGO_URI=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
  : undefined);
if (!MONGO_URI) { console.error('MONGO_URI not set (env or .env)'); process.exit(1); }

const [FROM = 'test', TO = 'Y24'] = process.argv.slice(2);
if (FROM === TO) { console.error('Source and target must differ'); process.exit(1); }

await mongoose.connect(MONGO_URI);
const client = mongoose.connection.getClient();
const src = client.db(FROM), dst = client.db(TO);

const BATCH = 5000;
const collections = (await src.listCollections({ type: 'collection' }).toArray())
  .map(c => c.name).filter(n => !n.startsWith('system.'));
console.log(`Copying ${collections.length} collections: ${FROM} → ${TO}\n`);

let failed = false;
for (const name of collections) {
  const from = src.collection(name), to = dst.collection(name);
  if (await to.estimatedDocumentCount()) {
    console.log(`- ${name.padEnd(18)} skipped: ${TO}.${name} already has data`);
    failed = true;
    continue;
  }

  let copied = 0, batch = [];
  for await (const doc of from.find({})) {
    batch.push(doc);
    if (batch.length === BATCH) { await to.insertMany(batch, { ordered: false }); copied += batch.length; batch = []; }
  }
  if (batch.length) { await to.insertMany(batch, { ordered: false }); copied += batch.length; }
  if (!copied) await dst.createCollection(name).catch(() => {});

  for (const { key, name: idx, v, ns, ...opts } of await from.indexes()) {
    if (idx !== '_id_') await to.createIndex(key, { name: idx, ...opts });
  }

  const [a, b] = await Promise.all([from.countDocuments(), to.countDocuments()]);
  if (a !== b) failed = true;
  console.log(`${a === b ? '✓' : '✗'} ${name.padEnd(18)} ${String(b).padStart(7)} / ${a}`);
}

await mongoose.disconnect();
console.log(failed ? '\nNot a clean copy — check the lines above.' : `\nDone. ${TO} matches ${FROM}.`);
process.exit(failed ? 1 : 0);
