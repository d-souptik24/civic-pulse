import { db } from './lib/firebase-admin.js';

async function check() {
  const snapshot = await db.collection('issues').limit(100).get();
  snapshot.docs.forEach(doc => {
    console.log(doc.id, '-> geohash:', doc.data().geohash, '-> location:', doc.data().location);
  });
}
check();
