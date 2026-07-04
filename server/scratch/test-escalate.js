
import { db } from '../lib/firebase-admin.js';
async function test() {
  try {
    const snapshot = await db.collection('issues').where('status', '==', 'open').get();
    console.log('Open issues:', snapshot.size);
    snapshot.forEach(doc => {
      const issue = doc.data();
      console.log(doc.id, 'upvotes:', issue.upvotes, 'reportedAt:', issue.reportedAt?.toDate());
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();

