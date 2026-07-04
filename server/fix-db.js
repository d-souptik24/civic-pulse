import { db } from './lib/firebase-admin.js';
import * as geofire from 'geofire-common';

async function fix() {
  const snapshot = await db.collection('issues').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.location && data.location.lat && data.location.lng) {
      const hash = geofire.geohashForLocation([data.location.lat, data.location.lng]);
      if (hash !== data.geohash) {
        await doc.ref.update({ geohash: hash });
        console.log(`Updated ${doc.id} geohash from ${data.geohash} to ${hash}`);
        count++;
      }
    }
  }
  
  // Clear the insights cache so it rebuilds properly
  const insightsSnap = await db.collection('insights').get();
  for (const doc of insightsSnap.docs) {
    await doc.ref.delete();
    console.log(`Cleared stale insight cache ${doc.id}`);
  }

  console.log(`Fixed ${count} issues.`);
}
fix();
